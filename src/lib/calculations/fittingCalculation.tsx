import { ControlValve, Fluid, FittingType, Orifice } from "../types";

const INCHES_PER_METER = 1 / 0.0254;

type TwoKPair = [number, number];
type StyleCoefficients = Record<string, TwoKPair>;
type FittingCoefficients = Record<string, TwoKPair | StyleCoefficients>;

const FITTING_COEFFICIENTS: FittingCoefficients = {
  elbow_90: {
    scrd: [800.0, 0.4],
    sr: [800.0, 0.25],
    lr: [800.0, 0.2],
    default: [800.0, 0.2],
  },
  elbow_45: {
    scrd: [500.0, 0.2],
    sr: [500.0, 0.2],
    lr: [500.0, 0.15],
    default: [500.0, 0.15],
  },
  u_bend: {
    scrd: [1000.0, 0.6],
    sr: [1000.0, 0.35],
    lr: [1000.0, 0.3],
    default: [1000.0, 0.3],
  },
  tee_elbow: {
    scrd: [500.0, 0.7],
    sr: [800.0, 0.8],
    lr: [800.0, 0.4],
    default: [500.0, 0.7],
  },
  tee_through: {
    scrd: [200.0, 0.1],
    sr: [150.0, 0.05],
    lr: [150.0, 0.05],
    stub_in: [100.0, 0.0],
    default: [150.0, 0.05],
  },
  stub_in_elbow: [1000.0, 1.0],
  block_valve_full_line_size: [300.0, 0.1],
  'block_valve_reduced_trim_0.9d': [500.0, 0.15],
  'block_valve_reduced_trim_0.8d': [1000.0, 0.25],
  globe_valve: [1500.0, 4.0],
  diaphragm_valve: [1000.0, 2.0],
  butterfly_valve: [800.0, 0.25],
  check_valve_swing: [1500.0, 1.5],
  lift_check_valve: [2000.0, 10.0],
  tilting_check_valve: [1000.0, 0.5],
};

export type FittingInput = {
  type: string;
  count?: number;
};

export type FittingSectionInput = {
  volumetricFlowRate: number;
  temperature: number;
  pressure: number;
  pipeDiameter?: number | null;
  defaultPipeDiameter?: number | null;
  inletDiameter?: number | null;
  outletDiameter?: number | null;
  roughness?: number | null;
  fittingType?: string | null;
  fittings?: FittingInput[];
  hasPipelineSegment?: boolean;
  controlValve?: ControlValve | null;
  orifice?: Orifice | null;
};

export type FittingCalculationArgs = {
  fluid: Fluid;
  section: FittingSectionInput;
};

export type FittingCalculationResult = {
  totalK: number;
  breakdown: FittingType[];
};

/**
 * Mirror of the backend 2-K fitting calculation so the UI can evaluate fittings locally.
 */
export function calculateFittingLosses({ fluid, section }: FittingCalculationArgs): FittingCalculationResult {
  const breakdown: FittingType[] = [];

  if (section.hasPipelineSegment === false) {
    return { totalK: 0, breakdown };
  }

  if (section.controlValve || section.orifice) {
    return { totalK: 0, breakdown };
  }

  const fittings = section.fittings ?? [];
  if (!fittings.length) {
    return { totalK: 0, breakdown };
  }

  const diameter = resolvePipeDiameter(section);
  const velocity = calculateVelocity(section.volumetricFlowRate, diameter);

  const viscosity = requirePositive(fluid.viscosity, "fluid.viscosity");
  const density = requirePositive(fluid.density, "fluid.density");
  requirePositive(section.temperature, "section.temperature");
  requirePositive(section.pressure, "section.pressure");

  const reynolds = (density * Math.abs(velocity) * diameter) / viscosity;
  if (reynolds <= 0 || !Number.isFinite(reynolds)) {
    throw new Error("Unable to compute Reynolds number for fittings calculation");
  }

  let totalK = 0;
  for (const fitting of fittings) {
    const kValue = fittingKValue(fitting, section, reynolds, diameter);
    const count = Math.max(1, fitting.count ?? 1);

    breakdown.push({
      type: fitting.type,
      count,
      k_each: kValue / count,
      k_total: kValue,
    });
    totalK += kValue;
  }

  return { totalK, breakdown };
}

function fittingKValue(
  fitting: FittingInput,
  section: FittingSectionInput,
  reynolds: number,
  diameter: number
): number {
  const coeffs = coefficientsFor(fitting.type, section);
  let kValue: number;

  if (coeffs) {
    kValue = twoK(coeffs[0], coeffs[1], reynolds, diameter);
  } else if (fitting.type === "pipe_entrance_normal") {
    kValue = entranceK(section, reynolds, diameter, 0.5);
  } else if (fitting.type === "pipe_entrance_raise") {
    kValue = entranceK(section, reynolds, diameter, 1.0);
  } else if (fitting.type === "pipe_exit") {
    kValue = exitK(section, diameter);
  } else if (fitting.type === "inlet_swage") {
    kValue = inletSwageK(section, reynolds, diameter);
  } else if (fitting.type === "outlet_swage") {
    kValue = outletSwageK(section, reynolds, diameter);
  } else {
    throw new Error(`Unsupported fitting type '${fitting.type}' for 2-K calculation`);
  }

  const count = Math.max(1, fitting.count ?? 1);
  return kValue * count;
}

function resolvePipeDiameter(section: FittingSectionInput): number {
  const candidates = [section.pipeDiameter, section.defaultPipeDiameter];
  for (const candidate of candidates) {
    if (candidate && candidate > 0) {
      return candidate;
    }
  }
  throw new Error("Pipe diameter is required to evaluate fittings with the 2-K method");
}

function calculateVelocity(flowRate: number, diameter: number): number {
  if (!Number.isFinite(flowRate)) {
    throw new Error("Flow rate must be a finite number to evaluate fittings");
  }
  const area = 0.25 * Math.PI * diameter * diameter;
  if (area <= 0) {
    throw new Error("Pipe diameter must be positive to determine velocity");
  }
  return flowRate / area;
}

function coefficientsFor(fittingType: string, section: FittingSectionInput): TwoKPair | undefined {
  const entry = FITTING_COEFFICIENTS[fittingType];
  if (!entry) {
    return undefined;
  }
  if (Array.isArray(entry)) {
    return entry;
  }
  const style = normalizedStyle(section);
  for (const key of [style, "default"]) {
    if (key && entry[key]) {
      return entry[key];
    }
  }
  return undefined;
}

function normalizedStyle(section: FittingSectionInput): string {
  const raw = (section.fittingType ?? "").trim().toLowerCase();
  if (raw === "scrd" || raw === "sr" || raw === "lr") {
    return raw;
  }
  if (raw === "stub-in" || raw === "stub_in" || raw === "stab-in") {
    return "stub_in";
  }
  return "default";
}

function twoK(k1: number, kinf: number, reynolds: number, diameter: number): number {
  const diameterIn = diameter * INCHES_PER_METER;
  return k1 / reynolds + kinf * (1 + 1 / diameterIn);
}

function diameterRatio(numerator?: number | null, denominator?: number | null): number {
  if (!numerator || !denominator || denominator <= 0) {
    return 1.0;
  }
  return Math.max(0, numerator / denominator);
}

function exitK(section: FittingSectionInput, pipeDiameter: number, base = 1.0): number {
  const outlet = outletDiameter(section) ?? pipeDiameter;
  const ratio = diameterRatio(pipeDiameter, outlet);
  return base * ratio ** 4;
}

function entranceK(
  section: FittingSectionInput,
  reynolds: number,
  pipeDiameter: number,
  base = 1.0
): number {
  const inlet = inletDiameter(section) ?? pipeDiameter;
  const ratio = diameterRatio(pipeDiameter, inlet);
  return (160.0 / reynolds + base) * ratio ** 4;
}

function inletSwageK(section: FittingSectionInput, reynolds: number, pipeDiameter: number): number {
  const inlet = inletDiameter(section) ?? pipeDiameter;
  const correctedRe = inlet ? reynolds * (pipeDiameter / inlet) : reynolds;
  const reducer = reducerK(correctedRe, inlet, pipeDiameter, section.roughness);
  const expander = expanderK(correctedRe, inlet, pipeDiameter, section.roughness);
  return reducer + expander;
}

function outletSwageK(section: FittingSectionInput, reynolds: number, pipeDiameter: number): number {
  const outlet = outletDiameter(section) ?? pipeDiameter;
  const reducer = reducerK(reynolds, pipeDiameter, outlet, section.roughness);
  const expander = expanderK(reynolds, pipeDiameter, outlet, section.roughness);
  const ratio = outlet ? pipeDiameter / outlet : 1.0;
  return (reducer + expander) * ratio ** 4;
}

function reducerK(
  reynolds: number,
  diameterInlet?: number | null,
  diameterOutlet?: number | null,
  roughness?: number | null
): number {
  if (
    reynolds <= 0 ||
    !diameterInlet ||
    !diameterOutlet ||
    diameterOutlet >= diameterInlet
  ) {
    return 0;
  }

  const ratio = diameterInlet / diameterOutlet;
  const ratio2 = ratio * ratio;
  const ratio4 = ratio2 * ratio2;

  let kValue: number;
  if (reynolds <= 2500) {
    kValue = (1.2 + 160.0 / reynolds) * (ratio4 - 1.0);
  } else {
    const eD = relativeRoughness(roughness, diameterInlet);
    const fd = darcyFrictionFactor(reynolds, eD);
    kValue = (0.6 + 0.48 * fd) * ratio2 * (ratio2 - 1.0);
  }
  return (kValue * 0.75) / ratio4;
}

function expanderK(
  reynolds: number,
  diameterInlet?: number | null,
  diameterOutlet?: number | null,
  roughness?: number | null
): number {
  if (
    reynolds <= 0 ||
    !diameterInlet ||
    !diameterOutlet ||
    diameterOutlet <= diameterInlet
  ) {
    return 0;
  }

  const ratio = diameterInlet / diameterOutlet;
  const ratio2 = ratio * ratio;
  const ratio4 = ratio2 * ratio2;

  let kValue: number;
  if (reynolds < 4000) {
    kValue = 2.0 * (1.0 - ratio4);
  } else {
    const eD = relativeRoughness(roughness, diameterInlet);
    const fd = darcyFrictionFactor(reynolds, eD);
    const delta = 1.0 - ratio2;
    kValue = (1.0 + 0.8 * fd) * (delta * delta);
  }
  return kValue / ratio4;
}

function relativeRoughness(roughness: number | null | undefined, diameter: number): number {
  if (!roughness || roughness <= 0) {
    return 0;
  }
  return roughness / diameter;
}

function inletDiameter(section: FittingSectionInput): number | null | undefined {
  return section.inletDiameter ?? section.pipeDiameter ?? section.defaultPipeDiameter ?? undefined;
}

function outletDiameter(section: FittingSectionInput): number | null | undefined {
  return section.outletDiameter ?? section.pipeDiameter ?? section.defaultPipeDiameter ?? undefined;
}

function requirePositive(value: number | null | undefined, name: string): number {
  if (value === null || value === undefined || value <= 0) {
    throw new Error(`${name} must be positive for fittings calculations`);
  }
  return value;
}

// Swamee-Jain approximation gives a fast estimate of the Darcy friction factor.
function darcyFrictionFactor(reynolds: number, relativeRoughnessValue: number): number {
  if (reynolds <= 0) {
    throw new Error("Reynolds number must be positive for friction factor evaluation");
  }
  if (reynolds < 2000) {
    return 64 / reynolds;
  }
  const rough = Math.max(relativeRoughnessValue, 0);
  const term = Math.log10(rough / 3.7 + 5.74 / Math.pow(reynolds, 0.9));
  return 0.25 / (term * term);
}
