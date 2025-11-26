import {
  calculateFittingLosses,
  type FittingCalculationArgs,
} from "./calculations/fittingCalculation";
import {
  STANDARD_GRAVITY,
  darcyFrictionFactor,
  determineFlowScheme,
} from "./calculations/basicCaculations";
import {
  solveIsothermal,
  solveAdiabatic,
  gasStateFromConditions,
  type GasState,
  UNIVERSAL_GAS_CONSTANT,
} from "./calculations/gasFlow";
import { convertUnit } from "./unitConversion";
import type {
  FittingType,
  PipeProps,
  PressureDropCalculationResults,
  resultSummary,
  pipeState,
  ControlValve,
  Orifice,
} from "./types";

const DEFAULT_TEMPERATURE_K = 298.15;
const DEFAULT_PRESSURE_PA = 101_325;
const SWAGE_ABSOLUTE_TOLERANCE = 1e-6;
const SWAGE_RELATIVE_TOLERANCE = 1e-3;
const KG_TO_LB = 2.204622621848776;
const SECONDS_PER_HOUR = 3600;
const STANDARD_CUBIC_FEET_PER_LBMOL = 379.482;
const PSI_PER_PASCAL = 0.00014503773773020923;
const AIR_MOLAR_MASS = 28.964;
const MIN_VALVE_PRESSURE_PA = 1;
const DEFAULT_GAS_XT = 0.72;

type HydraulicContext = {
  fluidArgs: FittingCalculationArgs["fluid"];
  sectionBase: Omit<FittingCalculationArgs["section"], "fittings">;
  density: number;
  viscosity: number;
  pipeDiameter: number;
  volumetricFlowRate: number;
  massFlow: number;
  temperature: number;
  pressure: number;
  length?: number;
  roughness?: number;
  phase: string;
  molarMass?: number;
  zFactor?: number;
  gamma?: number;
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
  } else if (pipe.pipeSectionType === "orifice") {
    const { results, updatedOrifice } = calculateOrificePressureDrop(pipe, context);
    pressureDropResults = results;
    resultSummary = calculateResultSummary(pipe, context, {}, pressureDropResults);
    if (updatedOrifice) {
      pipe = { ...pipe, orifice: updatedOrifice };
    }
  } else {
    // Default to pipeline calculation
    const fittingResult = computeFittingContribution(pipe, context);
    const pipeResult = computePipeLengthContribution(pipe, context, fittingResult.fittingK);
    const gasResults =
      context && context.phase === "gas"
        ? calculateGasFlowForPipe(pipe, context, pipeResult, fittingResult.fittingK)
        : null;

    if (gasResults) {
      return {
        ...pipe,
        fittingK: fittingResult.fittingK,
        pipeLengthK: pipeResult.pipeLengthK,
        totalK: pipeResult.totalK,
        equivalentLength: pipeResult.equivalentLength,
        fittings: fittingResult.fittings,
        pressureDropCalculationResults: gasResults.pressureDropResults,
        resultSummary: gasResults.resultSummary,
      };
    }

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

function calculateGasFlowForPipe(
  pipe: PipeProps,
  context: HydraulicContext,
  pipeResult: PipeLengthComputation,
  fittingK?: number
): { pressureDropResults: PressureDropCalculationResults; resultSummary: resultSummary } | null {
  if (context.phase !== "gas") {
    return null;
  }

  const totalK = typeof pipeResult.totalK === "number" ? pipeResult.totalK : undefined;
  const molarMass = context.molarMass;
  const zFactor = context.zFactor;
  const gamma = context.gamma;
  if (
    totalK === undefined ||
    !isPositive(context.massFlow) ||
    !isPositive(context.pipeDiameter) ||
    !isPositive(context.temperature) ||
    !isPositive(context.pressure) ||
    !isPositive(molarMass) ||
    !isPositive(zFactor) ||
    !isPositive(gamma)
  ) {
    return null;
  }

  const gasFlowModel = (pipe.gasFlowModel ?? "adiabatic").toLowerCase();
  const isForward = (pipe.direction ?? "forward") !== "backward";
  const length = context.length ?? 0;
  const frictionFactor = pipeResult.frictionFactor ?? 0;

  try {
    if (gasFlowModel === "isothermal") {
      const [, finalState] = solveIsothermal(
        context.pressure,
        context.temperature,
        context.massFlow,
        context.pipeDiameter,
        length,
        frictionFactor,
        totalK,
        0,
        molarMass,
        zFactor,
        gamma,
        isForward,
        "darcy",
      );
      const boundaryState = gasStateFromConditions(
        context.pressure,
        context.temperature,
        context.massFlow,
        context.pipeDiameter,
        molarMass,
        zFactor,
        gamma,
      );
      const inletState = isForward ? boundaryState : finalState;
      const outletState = isForward ? finalState : boundaryState;
      return finalizeGasResults(pipe, pipeResult, fittingK, inletState, outletState);
    }

    const [inletState, outletState] = solveAdiabatic(
      context.pressure,
      context.temperature,
      context.massFlow,
      context.pipeDiameter,
      length,
      frictionFactor,
      totalK,
      0,
      molarMass,
      zFactor,
      gamma,
      isForward,
      { friction_factor_type: "darcy" },
    );
    return finalizeGasResults(pipe, pipeResult, fittingK, inletState, outletState);
  } catch {
    return null;
  }
}

function finalizeGasResults(
  pipe: PipeProps,
  pipeResult: PipeLengthComputation,
  fittingK: number | undefined,
  inletState: GasState,
  outletState: GasState,
): { pressureDropResults: PressureDropCalculationResults; resultSummary: resultSummary } | null {
  const inletPressure = inletState.pressure;
  const outletPressure = outletState.pressure;
  if (!isPositive(inletPressure) || !isPositive(outletPressure)) {
    return null;
  }
  const totalDrop = Math.abs(inletPressure - outletPressure);
  const normalizedPressureDrop =
    totalDrop !== undefined &&
      typeof pipeResult.equivalentLength === "number" &&
      pipeResult.equivalentLength > 0
      ? totalDrop / pipeResult.equivalentLength
      : undefined;
  const userK =
    typeof pipe.userK === "number" && Number.isFinite(pipe.userK) ? pipe.userK : undefined;
  const gasFlowCriticalPressure =
    inletState.gas_flow_critical_pressure ?? outletState.gas_flow_critical_pressure;
  const reynolds = pipeResult.reynolds;
  const flowScheme =
    typeof reynolds === "number" ? determineFlowScheme(reynolds) : undefined;

  const pressureDropResults: PressureDropCalculationResults = {
    pipeLengthK: pipeResult.pipeLengthK,
    fittingK,
    userK,
    pipingFittingSafetyFactor: pipe.pipingFittingSafetyFactor,
    totalK: pipeResult.totalK,
    reynoldsNumber: reynolds,
    frictionalFactor: pipeResult.frictionFactor,
    flowScheme,
    pipeAndFittingPressureDrop: totalDrop,
    elevationPressureDrop: 0,
    controlValvePressureDrop: 0,
    orificePressureDrop: 0,
    userSpecifiedPressureDrop: 0,
    totalSegmentPressureDrop: totalDrop,
    normalizedPressureDrop,
    gasFlowCriticalPressure,
  };

  const erosionalConstant = pipe.erosionalConstant ?? 100;
  const resultSummary: resultSummary = {
    inletState: gasStateToPipeState(inletState, erosionalConstant),
    outletState: gasStateToPipeState(outletState, erosionalConstant),
  };

  return { pressureDropResults, resultSummary };
}

function gasStateToPipeState(state: GasState, erosionalConstant?: number): pipeState {
  return {
    pressure: state.pressure,
    temprature: state.temperature,
    density: state.density,
    velocity: state.velocity,
    machNumber: state.mach,
    erosionalVelocity: computeErosionalVelocity(state.density, erosionalConstant),
    flowMomentum:
      typeof state.density === "number" && typeof state.velocity === "number"
        ? state.density * state.velocity * state.velocity
        : undefined,
  };
}

function calculateControlValvePressureDrop(
  pipe: PipeProps,
  context: HydraulicContext | null
): { results: PressureDropCalculationResults | undefined; updatedControlValve: ControlValve | undefined } {
  if (!context || !pipe.controlValve) {
    return { results: undefined, updatedControlValve: undefined };
  }

  const phase = (context.phase ?? "liquid").toLowerCase();
  if (phase === "gas") {
    return calculateGasControlValveContribution(pipe, context);
  }
  return calculateLiquidControlValveContribution(pipe, context);
}

function calculateLiquidControlValveContribution(
  pipe: PipeProps,
  context: HydraulicContext
): { results: PressureDropCalculationResults | undefined; updatedControlValve: ControlValve | undefined } {
  const controlValve = pipe.controlValve!;
  const density = context.density;
  const volumetricFlowM3h = context.volumetricFlowRate * 3600; // convert from m³/s to m³/h
  const specificGravity = density / 1000; // SG relative to water

  let pressureDrop: number | undefined;
  let calculatedCv: number | undefined;
  const updatedControlValve = { ...controlValve };

  const canCalculate = isPositive(volumetricFlowM3h) && isPositive(specificGravity);

  if (canCalculate && controlValve.pressureDrop !== undefined && controlValve.pressureDrop > 0) {
    // Calculate Cv from pressure drop using liquid formula (Cv = 11.56 * Q_m3h * sqrt(SG / ΔP_kPa))
    const pressureDropKPa =
      convertScalar(controlValve.pressureDrop, controlValve.pressureDropUnit ?? "kPa", "kPa") ??
      controlValve.pressureDrop;
    if (isPositive(pressureDropKPa)) {
      calculatedCv = 11.56 * volumetricFlowM3h * Math.sqrt(specificGravity / pressureDropKPa);
      const pressureDropPa =
        convertScalar(pressureDropKPa, "kPa", "Pa") ?? pressureDropKPa * 1000;
      pressureDrop = pressureDropPa;
      updatedControlValve.cv = Number.isFinite(calculatedCv) ? calculatedCv : undefined;
    }
  } else if (canCalculate && controlValve.cv && controlValve.cv > 0) {
    // Calculate pressure drop from Cv rearranging the same formula
    const pressureDropKPa =
      specificGravity *
      ((11.56 * volumetricFlowM3h) / controlValve.cv) *
      ((11.56 * volumetricFlowM3h) / controlValve.cv);
    if (isPositive(pressureDropKPa)) {
      const pressureDropPa =
        convertScalar(pressureDropKPa, "kPa", "Pa") ?? pressureDropKPa * 1000;
      pressureDrop = pressureDropPa;
      calculatedCv = controlValve.cv;
      const displayUnit = controlValve.pressureDropUnit ?? "kPa";
      const convertedPressureDrop = convertScalar(pressureDropPa, "Pa", displayUnit);
      if (convertedPressureDrop === undefined) {
        updatedControlValve.pressureDrop = pressureDropPa;
        updatedControlValve.pressureDropUnit = "Pa";
      } else {
        updatedControlValve.pressureDrop = convertedPressureDrop;
        updatedControlValve.pressureDropUnit = displayUnit;
      }
    }
  }

  const results = buildControlValveResults(pressureDrop);
  return { results, updatedControlValve };
}

function calculateGasControlValveContribution(
  pipe: PipeProps,
  context: HydraulicContext
): { results: PressureDropCalculationResults | undefined; updatedControlValve: ControlValve | undefined } {
  const controlValve = pipe.controlValve;
  if (!controlValve) {
    return { results: undefined, updatedControlValve: undefined };
  }

  const flowScfh = computeStandardFlowScfh(context.massFlow, context.molarMass);
  const molarMass = context.molarMass;
  const specificGravity = isPositive(molarMass) ? molarMass / AIR_MOLAR_MASS : undefined;
  const temperatureK = context.temperature;
  const inletPressurePa = context.pressure;
  const kFactor = isPositive(context.gamma) ? context.gamma : 1.4;
  const xtValue = getValveXt(controlValve);
  const c1Value = getValveC1(controlValve, xtValue);

  if (
    !isPositive(flowScfh) ||
    !isPositive(specificGravity) ||
    !isPositive(temperatureK) ||
    !isPositive(inletPressurePa) ||
    !isPositive(kFactor)
  ) {
    return { results: undefined, updatedControlValve: controlValve };
  }

  const tempRankine = temperatureK * (9 / 5);
  const inletPressurePsia = inletPressurePa * PSI_PER_PASCAL;
  const updatedControlValve = { ...controlValve };

  const specifiedPressureDropPa = convertScalar(
    controlValve.pressureDrop,
    controlValve.pressureDropUnit ?? "kPa",
    "Pa",
  );
  const maxDropPa = Math.max(inletPressurePa - MIN_VALVE_PRESSURE_PA, MIN_VALVE_PRESSURE_PA);

  let pressureDrop: number | undefined;

  if (isPositive(specifiedPressureDropPa)) {
    const boundedDrop = Math.min(specifiedPressureDropPa, maxDropPa);
    const outletPressurePa = Math.max(MIN_VALVE_PRESSURE_PA, inletPressurePa - boundedDrop);
    const requiredCg = calculateRequiredCg({
      flowScfh,
      p1Psia: inletPressurePsia,
      p2Psia: outletPressurePa * PSI_PER_PASCAL,
      tempRankine,
      specificGravity,
      kFactor,
      xt: xtValue,
      c1: c1Value,
    });
    if (!isPositive(requiredCg)) {
      return { results: undefined, updatedControlValve: controlValve };
    }
    const derivedCv = requiredCg / c1Value;
    updatedControlValve.cv = Number.isFinite(derivedCv) ? derivedCv : updatedControlValve.cv;
    updatedControlValve.cg = requiredCg;
    pressureDrop = boundedDrop;
  } else {
    const targetCg =
      (isPositive(controlValve.cg) ? controlValve.cg : undefined) ??
      (isPositive(controlValve.cv) ? controlValve.cv * c1Value : undefined);
    if (!isPositive(targetCg)) {
      return { results: undefined, updatedControlValve: controlValve };
    }
    updatedControlValve.cg = targetCg;
    if (!isPositive(updatedControlValve.cv)) {
      const derivedCv = targetCg / c1Value;
      if (Number.isFinite(derivedCv)) {
        updatedControlValve.cv = derivedCv;
      }
    }

    const solvedDrop = solveGasValveDrop({
      targetCg,
      flowScfh,
      inletPressurePa,
      specificGravity,
      tempRankine,
      kFactor,
      xt: xtValue,
      c1: c1Value,
    });
    if (!isPositive(solvedDrop)) {
      return { results: undefined, updatedControlValve: controlValve };
    }
    const boundedDrop = Math.min(solvedDrop, maxDropPa);
    const displayUnit = controlValve.pressureDropUnit ?? "kPa";
    const convertedPressureDrop = convertScalar(boundedDrop, "Pa", displayUnit);
    if (convertedPressureDrop === undefined) {
      updatedControlValve.pressureDrop = boundedDrop;
      updatedControlValve.pressureDropUnit = "Pa";
    } else {
      updatedControlValve.pressureDrop = convertedPressureDrop;
      updatedControlValve.pressureDropUnit = displayUnit;
    }
    pressureDrop = boundedDrop;
  }

  const results = buildControlValveResults(pressureDrop);
  return { results, updatedControlValve };
}

function buildControlValveResults(
  pressureDrop?: number,
): PressureDropCalculationResults {
  return {
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
}

function computeStandardFlowScfh(
  massFlowKgPerS?: number,
  molarMass?: number,
): number | undefined {
  if (!isPositive(massFlowKgPerS) || !isPositive(molarMass)) {
    return undefined;
  }
  const massLbPerHr = massFlowKgPerS * KG_TO_LB * SECONDS_PER_HOUR;
  const lbMolesPerHr = massLbPerHr / molarMass;
  const flowScfh = lbMolesPerHr * STANDARD_CUBIC_FEET_PER_LBMOL;
  return isPositive(flowScfh) ? flowScfh : undefined;
}

function getValveXt(controlValve?: ControlValve): number {
  if (controlValve && isPositive(controlValve.xT) && controlValve.xT < 1) {
    return controlValve.xT;
  }
  return DEFAULT_GAS_XT;
}

function getValveC1(controlValve?: ControlValve, xtValue?: number): number {
  if (controlValve && isPositive(controlValve.C1)) {
    return controlValve.C1;
  }
  const normalizedXt = xtValue && xtValue > 0 && xtValue < 1 ? xtValue : DEFAULT_GAS_XT;
  return 39.76 * Math.sqrt(normalizedXt);
}

type GasValveDropArgs = {
  targetCg: number;
  flowScfh: number;
  inletPressurePa: number;
  specificGravity: number;
  tempRankine: number;
  kFactor: number;
  xt: number;
  c1: number;
};

function solveGasValveDrop({
  targetCg,
  flowScfh,
  inletPressurePa,
  specificGravity,
  tempRankine,
  kFactor,
  xt,
  c1,
}: GasValveDropArgs): number | undefined {
  if (
    !isPositive(targetCg) ||
    !isPositive(flowScfh) ||
    !isPositive(inletPressurePa) ||
    !isPositive(specificGravity) ||
    !isPositive(tempRankine) ||
    !isPositive(kFactor)
  ) {
    return undefined;
  }
  const inletPressurePsia = inletPressurePa * PSI_PER_PASCAL;
  if (!isPositive(inletPressurePsia)) {
    return undefined;
  }

  const maxDropPa = Math.max(inletPressurePa - MIN_VALVE_PRESSURE_PA, MIN_VALVE_PRESSURE_PA);
  if (!isPositive(maxDropPa)) {
    return undefined;
  }
  const minDropPa = Math.min(maxDropPa, Math.max(1, 0.001 * maxDropPa));

  const requiredCgAt = (dropPa: number): number => {
    const outletPressurePa = Math.max(MIN_VALVE_PRESSURE_PA, inletPressurePa - dropPa);
    const p2Psia = outletPressurePa * PSI_PER_PASCAL;
    return calculateRequiredCg({
      flowScfh,
      p1Psia: inletPressurePsia,
      p2Psia,
      tempRankine,
      specificGravity,
      kFactor,
      xt,
      c1,
    });
  };

  let cgLower = requiredCgAt(minDropPa);
  let cgUpper = requiredCgAt(maxDropPa);
  if (!isPositive(cgLower) || !isPositive(cgUpper)) {
    return undefined;
  }
  if (cgLower < cgUpper) {
    const temp = cgLower;
    cgLower = cgUpper;
    cgUpper = temp;
  }

  const boundedTarget = Math.min(Math.max(targetCg, cgUpper), cgLower);
  let lower = minDropPa;
  let upper = maxDropPa;
  let bestDrop = upper;

  for (let i = 0; i < 60; i += 1) {
    const mid = 0.5 * (lower + upper);
    const cgMid = requiredCgAt(mid);
    if (!isPositive(cgMid)) {
      break;
    }
    if (Math.abs(cgMid - boundedTarget) <= Math.max(1e-4 * boundedTarget, 1e-6)) {
      bestDrop = mid;
      break;
    }
    if (cgMid > boundedTarget) {
      lower = mid;
    } else {
      upper = mid;
      bestDrop = mid;
    }
  }

  return bestDrop;
}

function calculateOrificePressureDrop(
  pipe: PipeProps,
  context: HydraulicContext | null
): { results: PressureDropCalculationResults | undefined; updatedOrifice: Orifice | undefined } {
  if (!context || !pipe.orifice) {
    return { results: undefined, updatedOrifice: undefined };
  }

  const orifice = pipe.orifice;
  const betaRatio = orifice.betaRatio;
  const pipeDiameter = context.pipeDiameter;
  const viscosity = context.viscosity;

  if (!isPositive(betaRatio) || betaRatio >= 1 || !isPositive(pipeDiameter) || !isPositive(viscosity)) {
    return { results: undefined, updatedOrifice: orifice };
  }

  const area = (Math.PI * pipeDiameter * pipeDiameter) / 4;
  if (!isPositive(area)) {
    return { results: undefined, updatedOrifice: orifice };
  }

  const velocity = context.volumetricFlowRate / area;
  if (!Number.isFinite(velocity)) {
    return { results: undefined, updatedOrifice: orifice };
  }

  const reynolds = (context.density * velocity * pipeDiameter) / viscosity;
  if (!isPositive(reynolds)) {
    return { results: undefined, updatedOrifice: orifice };
  }

  const orificeResult = calculateSharpEdgedPlateOrificePressureDrop({
    beta: betaRatio,
    reynolds,
    density: context.density,
    velocity,
  });

  if (!orificeResult) {
    return { results: undefined, updatedOrifice: orifice };
  }

  const pressureDrop = orificeResult.pressureDrop;
  const updatedOrifice: Orifice = { ...orifice };
  const displayUnit = updatedOrifice.pressureDropUnit ?? "kPa";
  const convertedPressureDrop = convertScalar(pressureDrop, "Pa", displayUnit);
  if (convertedPressureDrop === undefined) {
    updatedOrifice.pressureDrop = pressureDrop;
    updatedOrifice.pressureDropUnit = "Pa";
  } else {
    updatedOrifice.pressureDrop = convertedPressureDrop;
    updatedOrifice.pressureDropUnit = displayUnit;
  }

  const results: PressureDropCalculationResults = {
    pipeLengthK: 0,
    fittingK: 0,
    userK: 0,
    pipingFittingSafetyFactor: 1,
    totalK: 0,
    reynoldsNumber: reynolds,
    frictionalFactor: 0,
    flowScheme: reynolds <= 2500 ? "laminar" : "turbulent",
    pipeAndFittingPressureDrop: 0,
    elevationPressureDrop: 0,
    controlValvePressureDrop: 0,
    orificePressureDrop: pressureDrop,
    userSpecifiedPressureDrop: 0,
    totalSegmentPressureDrop: pressureDrop,
    normalizedPressureDrop: 0,
    gasFlowCriticalPressure: 0,
  };

  return { results, updatedOrifice };
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
  const erosionalVelocity = computeErosionalVelocity(context.density, erosionalConstant);
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

  return direction === "backward"
    ? { inletState: outletState, outletState: inletState }
    : { inletState, outletState };
}

function buildHydraulicContext(pipe: PipeProps): HydraulicContext | null {
  const fluid = pipe.fluid;
  if (!fluid) {
    return null;
  }

  const phase = (fluid.phase ?? "liquid").toLowerCase();
  const viscosity = convertScalar(fluid.viscosity, fluid.viscosityUnit, "Pa.s");
  const massFlow = resolveMassFlow(pipe);
  const pipeDiameter = resolveDiameter(pipe);
  if (!isPositive(viscosity) || !isPositive(massFlow) || !isPositive(pipeDiameter)) {
    return null;
  }

  const pressure =
    convertScalar(pipe.boundaryPressure, pipe.boundaryPressureUnit, "Pa") ??
    DEFAULT_PRESSURE_PA;
  const temperature =
    convertScalar(pipe.boundaryTemperature, pipe.boundaryTemperatureUnit, "K") ??
    DEFAULT_TEMPERATURE_K;

  let density = convertScalar(fluid.density, fluid.densityUnit, "kg/m3");
  let molarMass = normalizeMolarMass(fluid.molecularWeight);
  let zFactor = fluid.zFactor;
  let gamma = fluid.specificHeatRatio;

  if (phase === "gas") {
    if (!isPositive(molarMass) || !isPositive(zFactor) || !isPositive(gamma)) {
      return null;
    }
    if (!isPositive(density)) {
      density = (pressure * molarMass) / (zFactor * UNIVERSAL_GAS_CONSTANT * temperature);
    }
  } else {
    if (!isPositive(density)) {
      return null;
    }
    molarMass = undefined;
    zFactor = undefined;
    gamma = undefined;
  }

  if (!isPositive(density)) {
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
    massFlow,
    pipeDiameter,
    volumetricFlowRate,
    temperature,
    pressure,
    length,
    roughness,
    phase,
    molarMass,
    zFactor,
    gamma,
  };
}

function resolveMassFlow(pipe: PipeProps): number | undefined {
  const hasMassFlowRate =
    typeof pipe.massFlowRate === "number" && Number.isFinite(pipe.massFlowRate);
  const hasDesignMassFlowRate =
    typeof pipe.designMassFlowRate === "number" && Number.isFinite(pipe.designMassFlowRate);

  if (!hasMassFlowRate && !hasDesignMassFlowRate) {
    return undefined;
  }

  if (hasMassFlowRate) {
    const unit = pipe.massFlowRateUnit ?? "kg/h";
    const converted = convertScalar(pipe.massFlowRate, unit, "kg/s");
    if (!isPositive(converted)) {
      return undefined;
    }
    const normalizedBase = Math.abs(converted);
    const margin =
      typeof pipe.designMargin === "number" && Number.isFinite(pipe.designMargin)
        ? pipe.designMargin
        : 0;
    const multiplier = 1 + margin / 100;
    const designFlow = normalizedBase * multiplier;
    return isPositive(designFlow) ? designFlow : undefined;
  }

  const unit = pipe.designMassFlowRateUnit ?? pipe.massFlowRateUnit ?? "kg/h";
  const converted = convertScalar(pipe.designMassFlowRate, unit, "kg/s");
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

function normalizeMolarMass(value?: number | null): number | undefined {
  if (value === null || value === undefined || value <= 0) {
    return undefined;
  }
  return value <= 0.5 ? value * 1000 : value;
}

function computeErosionalVelocity(
  density?: number,
  erosionalConstant?: number,
): number | undefined {
  if (!isPositive(density) || !isPositive(erosionalConstant)) {
    return undefined;
  }
  const densityLbPerFt3 = density / 16.018463;
  if (densityLbPerFt3 <= 0) {
    return undefined;
  }
  const sqrtDensityImp = Math.sqrt(densityLbPerFt3);
  if (!Number.isFinite(sqrtDensityImp) || sqrtDensityImp === 0) {
    return undefined;
  }
  const velocityFtPerS = erosionalConstant / sqrtDensityImp;
  return velocityFtPerS * 0.3048;
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
  const safetyPercent = typeof pipe.pipingFittingSafetyFactor === "number" && Number.isFinite(pipe.pipingFittingSafetyFactor)
    ? pipe.pipingFittingSafetyFactor
    : 0;
  const multiplier = 1 + (safetyPercent / 100);
  const adjusted = base * multiplier;
  return Number.isFinite(adjusted) ? adjusted : undefined;
}

function isPositive(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export type SharpEdgedOrificeInput = {
  beta: number;
  reynolds: number;
  density: number;
  velocity: number;
};

export type SharpEdgedOrificeResult = {
  kFactor: number;
  pressureDrop: number;
};

/**
 * Calculates the resistance factor (K) and pressure drop across a sharp-edged plate orifice.
 * Ref: Idelchik Diagram 4-15. The function currently expects SI inputs.
 */
export function calculateSharpEdgedPlateOrificePressureDrop({
  beta,
  reynolds,
  density,
  velocity,
}: SharpEdgedOrificeInput): SharpEdgedOrificeResult | undefined {
  if (!isPositive(beta) || beta >= 1 || !isPositive(reynolds) || !isPositive(density)) {
    return undefined;
  }
  const absVelocity = Math.abs(velocity);
  if (!Number.isFinite(absVelocity)) {
    return undefined;
  }

  const betaSquared = beta * beta;
  const betaFourth = betaSquared * betaSquared;
  if (betaFourth === 0) {
    return undefined;
  }

  const geomFactor = (1 - betaSquared) * (1 / betaFourth - 1);
  const flowFactor =
    reynolds <= 2500
      ? 2.72 + betaSquared * (120 / reynolds - 1)
      : 2.72 - (betaSquared * 4000) / reynolds;

  const kFactor = flowFactor * geomFactor;
  const dynamicPressure = 0.5 * density * absVelocity * absVelocity;
  const pressureDrop = kFactor * dynamicPressure;

  if (!Number.isFinite(pressureDrop)) {
    return undefined;
  }

  return { kFactor, pressureDrop };
}

export type GasControlValveArgs = {
  flowScfh: number;
  p1Psia: number;
  p2Psia: number;
  tempRankine: number;
  specificGravity: number;
  kFactor?: number; // Cp/Cv, default ~1.4 for air
  xt?: number; // ISA pressure drop ratio
  c1?: number; // Optional valve coefficient
};

export function calculateRequiredCg({
  flowScfh,
  p1Psia,
  p2Psia,
  tempRankine,
  specificGravity,
  kFactor = 1.4,
  xt = 0.72,
  c1,
}: GasControlValveArgs): number {
  if (
    !isPositive(flowScfh) ||
    !isPositive(p1Psia) ||
    !Number.isFinite(p2Psia) ||
    !isPositive(tempRankine) ||
    !isPositive(specificGravity)
  ) {
    return 0;
  }

  const boundedP2 = Math.max(0, p2Psia);
  const deltaP = Math.max(0, p1Psia - boundedP2);
  const xtValue = isPositive(xt) ? xt : 0.72;

  const c1Value = isPositive(c1) ? c1 : 39.76 * Math.sqrt(xtValue);
  if (!isPositive(c1Value)) {
    return 0;
  }

  const xActual = deltaP / p1Psia;
  const xChokedLimit = xtValue * (kFactor / 1.4);
  const xEffective = Math.min(xActual, xChokedLimit);

  if (!(xEffective > 0)) {
    return 0;
  }

  let angleDegrees = (3417 / c1Value) * Math.sqrt(xEffective);
  if (!Number.isFinite(angleDegrees)) {
    return 0;
  }
  angleDegrees = Math.min(angleDegrees, 90);
  const angleRadians = (angleDegrees * Math.PI) / 180;

  const termTempDensity = Math.sqrt(1 / (specificGravity * tempRankine));
  if (!Number.isFinite(termTempDensity) || termTempDensity <= 0) {
    return 0;
  }

  const denominator = p1Psia * 520 * termTempDensity * Math.sin(angleRadians);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  const requiredCg = flowScfh / denominator;
  return Number.isFinite(requiredCg) && requiredCg > 0 ? requiredCg : 0;
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
