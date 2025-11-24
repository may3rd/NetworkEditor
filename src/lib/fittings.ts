import {
  calculateFittingLosses,
  type FittingCalculationArgs,
} from "./calculations/fittingCalculation";
import {
  STANDARD_GRAVITY,
  darcyFrictionFactor,
  determineFlowScheme,
} from "./calculations/basicCaculations";
import { convertUnit } from "./unitConversion";
import type {
  FittingType,
  PipeProps,
  PressureDropCalculationResults,
  resultSummary,
  pipeState,
  ControlValve,
} from "./types";

const DEFAULT_TEMPERATURE_K = 298.15;
const DEFAULT_PRESSURE_PA = 101_325;
const SWAGE_ABSOLUTE_TOLERANCE = 1e-6;
const SWAGE_RELATIVE_TOLERANCE = 1e-3;

type HydraulicContext = {
  fluidArgs: FittingCalculationArgs["fluid"];
  sectionBase: Omit<FittingCalculationArgs["section"], "fittings">;
  density: number;
  viscosity: number;
  pipeDiameter: number;
  volumetricFlowRate: number;
  temperature: number;
  pressure: number;
  length?: number;
  roughness?: number;
};

type PipeLengthComputation = {
  pipeLengthK?: number;
  totalK?: number;
  equivalentLength?: number;
  reynolds?: number;
  frictionFactor?: number;
  velocity?: number;
};

export function recalculatePipeFittingLosses(pipe: PipeProps): PipeProps {
  const context = buildHydraulicContext(pipe);

  let pressureDropResults: PressureDropCalculationResults | undefined;
  let resultSummary: resultSummary | undefined;

  if (pipe.pipeSectionType === "control valve") {
    const { results, updatedControlValve } = calculateControlValvePressureDrop(pipe, context);
    pressureDropResults = results;
    resultSummary = calculateResultSummary(pipe, context, {}, pressureDropResults);
    if (updatedControlValve) {
      pipe = { ...pipe, controlValve: updatedControlValve };
    }
  } else {
    // Default to pipeline calculation
    const fittingResult = computeFittingContribution(pipe, context);
    const pipeResult = computePipeLengthContribution(pipe, context, fittingResult.fittingK);
    pressureDropResults = calculatePressureDropResults(
      pipe,
      context,
      pipeResult,
      fittingResult.fittingK
    );
    resultSummary = calculateResultSummary(pipe, context, pipeResult, pressureDropResults);

    return {
      ...pipe,
      fittingK: fittingResult.fittingK,
      pipeLengthK: pipeResult.pipeLengthK,
      totalK: pipeResult.totalK,
      equivalentLength: pipeResult.equivalentLength,
      fittings: fittingResult.fittings,
      pressureDropCalculationResults: pressureDropResults,
      resultSummary,
    };
  }

  return {
    ...pipe,
    pressureDropCalculationResults: pressureDropResults,
    resultSummary,
  };
}

function computeFittingContribution(
  pipe: PipeProps,
  context: HydraulicContext | null
): { fittingK?: number; fittings: FittingType[] } {
  const fittings = ensureSwageFittings(pipe, pipe.fittings ?? []);
  if (fittings.length === 0) {
    return { fittingK: 0, fittings };
  }

  const activeEntries = fittings
    .map((fitting, index) => ({ fitting, index }))
    .filter(({ fitting }) => (fitting.count ?? 0) > 0);

  if (activeEntries.length === 0) {
    return {
      fittingK: 0,
      fittings: fittings.map(resetFittingValues),
    };
  }

  if (!context) {
    return {
      fittingK: undefined,
      fittings: fittings.map(resetFittingValues),
    };
  }

  try {
    const section = {
      ...context.sectionBase,
      fittings: activeEntries.map(({ fitting }) => ({
        type: fitting.type,
        count: Math.max(1, Math.floor(fitting.count ?? 1)),
      })),
    };
    const { totalK, breakdown } = calculateFittingLosses({
      fluid: context.fluidArgs,
      section,
    });

    const breakdownByIndex = new Map<number, FittingType>();
    breakdown.forEach((entry, idx) => {
      const originalIndex = activeEntries[idx]?.index;
      if (originalIndex !== undefined) {
        breakdownByIndex.set(originalIndex, entry);
      }
    });

    const nextFittings = fittings.map((fitting, idx) => {
      const derived = breakdownByIndex.get(idx);
      if (!derived) {
        return resetFittingValues(fitting);
      }
      return {
        ...fitting,
        k_each: derived.k_each,
        k_total: derived.k_total,
      };
    });

    return {
      fittingK: totalK,
      fittings: nextFittings,
    };
  } catch {
    return {
      fittingK: undefined,
      fittings: fittings.map(resetFittingValues),
    };
  }
}

function computePipeLengthContribution(
  pipe: PipeProps,
  context: HydraulicContext | null,
  fittingK?: number
): PipeLengthComputation {
  if (!context) {
    return {};
  }

  const length = context.length;
  const diameter = context.pipeDiameter;

  if (length === undefined) {
    const totalK = applyUserAndSafety(pipe, undefined, fittingK);
    return { totalK };
  }

  if (length === 0) {
    const totalK = applyUserAndSafety(pipe, 0, fittingK);
    return {
      pipeLengthK: 0,
      totalK,
      equivalentLength: undefined,
      velocity: undefined,
      reynolds: undefined,
      frictionFactor: undefined,
    };
  }

  const area = 0.25 * Math.PI * diameter * diameter;
  if (area <= 0) {
    return {};
  }

  const velocity = context.volumetricFlowRate / area;
  if (!Number.isFinite(velocity)) {
    return {};
  }

  const reynolds = (context.density * Math.abs(velocity) * diameter) / context.viscosity;
  if (!isPositive(reynolds)) {
    return { velocity };
  }

  const relativeRoughness =
    context.roughness && context.roughness > 0 ? context.roughness / diameter : 0;

  let friction: number;
  try {
    friction = darcyFrictionFactor({
      reynolds,
      relativeRoughness,
    });
  } catch {
    return { velocity, reynolds };
  }

  if (!Number.isFinite(friction) || friction <= 0) {
    const totalK = applyUserAndSafety(pipe, 0, fittingK);
    return {
      pipeLengthK: 0,
      totalK,
      velocity,
      reynolds,
      frictionFactor: friction,
    };
  }

  const pipeLengthK = friction * (length / diameter);
  const totalK = applyUserAndSafety(pipe, pipeLengthK, fittingK);
  const equivalentLength =
    totalK && totalK > 0 ? (totalK * diameter) / friction : undefined;

  return {
    pipeLengthK,
    totalK,
    equivalentLength,
    velocity,
    reynolds,
    frictionFactor: friction,
  };
}

function calculatePressureDropResults(
  pipe: PipeProps,
  context: HydraulicContext | null,
  lengthResult: PipeLengthComputation,
  fittingK?: number
): PressureDropCalculationResults | undefined {
  if (!context) {
    return undefined;
  }

  const totalK = lengthResult.totalK;
  const density = context.density;
  const velocity = lengthResult.velocity;
  const userSpecifiedPressureDrop = convertScalar(
    pipe.userSpecifiedPressureLoss,
    pipe.userSpecifiedPressureLossUnit ?? "Pa",
    "Pa"
  );

  let pipeAndFittingPressureDrop: number | undefined;
  if (isPositive(totalK) && typeof velocity === "number") {
    pipeAndFittingPressureDrop = totalK * density * velocity * velocity * 0.5;
  }

  const elevationMeters = convertScalar(
    pipe.elevation,
    pipe.elevationUnit ?? "m",
    "m"
  );
  const elevationPressureDrop =
    typeof elevationMeters === "number"
      ? density * STANDARD_GRAVITY * elevationMeters
      : undefined;

  const totalSegmentPressureDrop =
    pipeAndFittingPressureDrop === undefined &&
    elevationPressureDrop === undefined &&
    userSpecifiedPressureDrop === undefined
      ? undefined
      : (pipeAndFittingPressureDrop ?? 0) +
        (elevationPressureDrop ?? 0) +
        (userSpecifiedPressureDrop ?? 0);

  const normalizedPressureDrop =
    pipeAndFittingPressureDrop !== undefined &&
    typeof lengthResult.equivalentLength === "number" &&
    lengthResult.equivalentLength > 0
      ? pipeAndFittingPressureDrop / lengthResult.equivalentLength
      : undefined;

  const reynoldsNumber = lengthResult.reynolds;
  const flowScheme =
    typeof reynoldsNumber === "number"
      ? determineFlowScheme(reynoldsNumber)
      : undefined;

  const userK =
    typeof pipe.userK === "number" && Number.isFinite(pipe.userK)
      ? pipe.userK
      : undefined;

  const results: PressureDropCalculationResults = {
    pipeLengthK: lengthResult.pipeLengthK,
    fittingK,
    userK,
    pipingFittingSafetyFactor: pipe.pipingFittingSafetyFactor,
    totalK,
    reynoldsNumber,
    frictionalFactor: lengthResult.frictionFactor,
    flowScheme,
    pipeAndFittingPressureDrop,
    elevationPressureDrop,
    controlValvePressureDrop: undefined,
    orificePressureDrop: undefined,
    userSpecifiedPressureDrop,
    totalSegmentPressureDrop,
    normalizedPressureDrop,
    gasFlowCriticalPressure: undefined,
  };

  return results;
}

function calculateControlValvePressureDrop(
  pipe: PipeProps,
  context: HydraulicContext | null
): { results: PressureDropCalculationResults | undefined; updatedControlValve: ControlValve | undefined } {
  if (!context || !pipe.controlValve) {
    return { results: undefined, updatedControlValve: undefined };
  }

  const controlValve = pipe.controlValve;
  const density = context.density;
  const volumetricFlowGpm = context.volumetricFlowRate * 264.172; // m³/s to gpm
  const specificGravity = density / 1000; // kg/m³ to SG (water = 1000)

  let pressureDrop: number | undefined;
  let calculatedCv: number | undefined;
  let updatedControlValve = { ...controlValve };

  if (controlValve.pressure_drop !== undefined && controlValve.pressure_drop > 0) {
    // Calculate Cv from pressure drop
    const pressureDropPa = convertScalar(controlValve.pressure_drop, controlValve.pressureDropUnit ?? "Pa", "Pa") ?? controlValve.pressure_drop;
    const pressureDropPsi = pressureDropPa / 6894.76; // Pa to psi
    calculatedCv = volumetricFlowGpm / Math.sqrt(pressureDropPsi / specificGravity);
    pressureDrop = pressureDropPa;
    updatedControlValve.cv = calculatedCv;
  } else if (controlValve.cv && controlValve.cv > 0) {
    // Calculate pressure drop from Cv
    const pressureDropPsi = (volumetricFlowGpm / controlValve.cv) ** 2 * specificGravity;
    pressureDrop = pressureDropPsi * 6894.76; // psi to Pa
    calculatedCv = controlValve.cv;
    updatedControlValve.pressure_drop = pressureDrop;
    updatedControlValve.pressureDropUnit = "Pa";
  }

  const results: PressureDropCalculationResults = {
    pipeLengthK: 0,
    fittingK: 0,
    userK: 0,
    pipingFittingSafetyFactor: 1,
    totalK: 0,
    reynoldsNumber: 0,
    frictionalFactor: 0,
    flowScheme: "laminar",
    pipeAndFittingPressureDrop: 0,
    elevationPressureDrop: 0,
    controlValvePressureDrop: pressureDrop,
    orificePressureDrop: 0,
    userSpecifiedPressureDrop: 0,
    totalSegmentPressureDrop: pressureDrop,
    normalizedPressureDrop: 0,
    gasFlowCriticalPressure: 0,
  };

  return { results, updatedControlValve };
}

function calculateResultSummary(
  pipe: PipeProps,
  context: HydraulicContext | null,
  lengthResult: PipeLengthComputation,
  pressureDropResults: PressureDropCalculationResults | undefined
): resultSummary | undefined {
  if (!context || !pressureDropResults) {
    return undefined;
  }

  const inletPressurePa = context.pressure;
  const totalDrop = pressureDropResults.totalSegmentPressureDrop;
  const direction = pipe.direction ?? "forward";

  const outletPressurePa = totalDrop !== undefined
    ? (direction === "forward" ? inletPressurePa - totalDrop : inletPressurePa + totalDrop)
    : undefined;

  const velocity = lengthResult.velocity;
  const erosionalConstant = pipe.erosionalConstant ?? 100; // Default erosional constant in imperial units
  const erosionalVelocity = context.density
    ? (() => {
        // Convert density from kg/m³ to lb/ft³ for imperial calculation
        const densityLbPerFt3 = context.density / 16.018463;
        const sqrtDensityImp = Math.sqrt(densityLbPerFt3);
        const velocityFtPerS = erosionalConstant / sqrtDensityImp;
        // Convert velocity from ft/s to m/s
        return velocityFtPerS * 0.3048;
      })()
    : undefined;
  const flowMomentum = velocity && context.density
    ? context.density * velocity * velocity
    : undefined;

  const inletState: pipeState = {
    pressure: inletPressurePa,
    temprature: context.temperature,
    density: context.density,
    velocity,
    erosionalVelocity,
    flowMomentum,
    // machNumber undefined for liquid
  };

  const outletState: pipeState = {
    pressure: outletPressurePa,
    temprature: context.temperature,
    density: context.density,
    velocity,
    erosionalVelocity,
    flowMomentum,
    // machNumber undefined for liquid
  };

  return {
    inletState,
    outletState,
  };
}

function buildHydraulicContext(pipe: PipeProps): HydraulicContext | null {
  const fluid = pipe.fluid;
  if (!fluid) {
    return null;
  }

  const density = convertScalar(fluid.density, fluid.densityUnit, "kg/m3");
  const viscosity = convertScalar(fluid.viscosity, fluid.viscosityUnit, "Pa.s");
  const massFlow = resolveMassFlow(pipe);
  const pipeDiameter = resolveDiameter(pipe);

  if (!isPositive(density) || !isPositive(viscosity) || !isPositive(massFlow) || !isPositive(pipeDiameter)) {
    return null;
  }

  const volumetricFlowRate = Math.abs(massFlow) / density;
  if (!isPositive(volumetricFlowRate)) {
    return null;
  }

  const inletDiameter = convertLength(
    pipe.inletDiameter,
    pipe.inletDiameterUnit ?? pipe.diameterUnit ?? "mm"
  );
  const outletDiameter = convertLength(
    pipe.outletDiameter,
    pipe.outletDiameterUnit ?? pipe.diameterUnit ?? "mm"
  );
  const roughness = convertLength(pipe.roughness, pipe.roughnessUnit ?? "mm", true);
  const length = convertLength(pipe.length, pipe.lengthUnit ?? "m", true);
  const pressure =
    convertScalar(pipe.boundaryPressure, pipe.boundaryPressureUnit, "Pa") ??
    DEFAULT_PRESSURE_PA;
  const temperature =
    convertScalar(pipe.boundaryTemperature, pipe.boundaryTemperatureUnit, "K") ??
    DEFAULT_TEMPERATURE_K;

  const sectionBase: HydraulicContext["sectionBase"] = {
    volumetricFlowRate,
    temperature,
    pressure,
    pipeDiameter,
    defaultPipeDiameter: pipeDiameter,
    inletDiameter,
    outletDiameter,
    roughness,
    fittingType: pipe.fittingType ?? "LR",
    hasPipelineSegment: true,
    controlValve: pipe.controlValve ?? null,
    orifice: pipe.orifice ?? null,
  };

  const fluidArgs = {
    ...fluid,
    density,
    viscosity,
  };

  return {
    fluidArgs,
    sectionBase,
    density,
    viscosity,
    pipeDiameter,
    volumetricFlowRate,
    temperature,
    pressure,
    length,
    roughness,
  };
}

function resolveMassFlow(pipe: PipeProps): number | undefined {
  const { massFlowRate, massFlowRateUnit, designMassFlowRate, designMassFlowRateUnit } = pipe;
  const value =
    typeof massFlowRate === "number"
      ? massFlowRate
      : typeof designMassFlowRate === "number"
        ? designMassFlowRate
        : undefined;
  if (value === undefined) {
    return undefined;
  }

  const unit =
    massFlowRate !== undefined
      ? massFlowRateUnit ?? "kg/h"
      : designMassFlowRateUnit ?? massFlowRateUnit ?? "kg/h";

  const converted = convertScalar(value, unit, "kg/s");
  if (!isPositive(converted)) {
    return undefined;
  }
  return Math.abs(converted);
}

function resolveDiameter(pipe: PipeProps): number | undefined {
  if (typeof pipe.diameter === "number") {
    return convertLength(pipe.diameter, pipe.diameterUnit ?? "mm");
  }
  if (typeof pipe.pipeDiameter === "number") {
    return convertLength(pipe.pipeDiameter, pipe.pipeDiameterUnit ?? "mm");
  }
  return undefined;
}

function convertLength(value?: number, unit?: string, allowZero = false): number | undefined {
  const converted = convertScalar(value, unit, "m");
  if (converted === undefined) {
    return undefined;
  }
  if (allowZero) {
    return converted >= 0 ? converted : undefined;
  }
  return converted > 0 ? converted : undefined;
}

function convertScalar(
  value?: number | null,
  unit?: string | null,
  targetUnit?: string
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return undefined;
  }
  if (!targetUnit) {
    return numericValue;
  }
  const sourceUnit = unit ?? targetUnit;
  if (!sourceUnit) {
    return numericValue;
  }
  const converted = convertUnit(numericValue, sourceUnit, targetUnit);
  const result = Number(converted);
  if (!Number.isFinite(result)) {
    return undefined;
  }
  return result;
}

function resetFittingValues(fitting: FittingType): FittingType {
  return {
    ...fitting,
    k_each: 0,
    k_total: 0,
  };
}

function applyUserAndSafety(pipe: PipeProps, pipeLengthK?: number, fittingK?: number): number | undefined {
  const userK = typeof pipe.userK === "number" && Number.isFinite(pipe.userK) ? pipe.userK : 0;
  const base = (pipeLengthK ?? 0) + (fittingK ?? 0) + userK;
  if (!Number.isFinite(base)) {
    return undefined;
  }
  const safety = typeof pipe.pipingFittingSafetyFactor === "number" && pipe.pipingFittingSafetyFactor > 0
    ? pipe.pipingFittingSafetyFactor
    : 1;
  const adjusted = base * safety;
  return Number.isFinite(adjusted) ? adjusted : undefined;
}

function isPositive(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function ensureSwageFittings(pipe: PipeProps, baseFittings: FittingType[]): FittingType[] {
  const defaultUnit = pipe.diameterUnit ?? pipe.pipeDiameterUnit ?? "mm";
  const inletDiameter = convertLength(pipe.inletDiameter, pipe.inletDiameterUnit ?? defaultUnit);
  const outletDiameter = convertLength(
    pipe.outletDiameter,
    pipe.outletDiameterUnit ?? defaultUnit
  );
  const pipeDiameter = resolveDiameter(pipe);

  const needsInletSwage = shouldAddSwage(inletDiameter, pipeDiameter);
  const needsOutletSwage = shouldAddSwage(pipeDiameter, outletDiameter);

  const filtered = baseFittings.filter((fitting) => {
    if (fitting.type === "inlet_swage") {
      return needsInletSwage;
    }
    if (fitting.type === "outlet_swage") {
      return needsOutletSwage;
    }
    return true;
  });

  const normalized = [...filtered];

  if (needsInletSwage && !normalized.some((fitting) => fitting.type === "inlet_swage")) {
    normalized.push(createSwageFitting("inlet_swage"));
  }

  if (needsOutletSwage && !normalized.some((fitting) => fitting.type === "outlet_swage")) {
    normalized.push(createSwageFitting("outlet_swage"));
  }

  return normalized;
}

function createSwageFitting(type: "inlet_swage" | "outlet_swage"): FittingType {
  return {
    type,
    count: 1,
    k_each: 0,
    k_total: 0,
  };
}

function shouldAddSwage(upstream?: number, downstream?: number): boolean {
  if (!isPositive(upstream) || !isPositive(downstream)) {
    return false;
  }
  return !diametersWithinTolerance(upstream, downstream);
}

function diametersWithinTolerance(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  const tolerance = Math.max(SWAGE_ABSOLUTE_TOLERANCE, SWAGE_RELATIVE_TOLERANCE * scale);
  return diff <= tolerance;
}
