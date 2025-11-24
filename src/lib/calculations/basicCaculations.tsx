/**
 * Core hydraulic helper functions shared across calculators.
 * These utilities mirror the backend implementations found in
 * `backend-repo/src/network_hydraulic/calculators/hydraulics.py`
 * and `backend-repo/src/network_hydraulic/calculators/elevation.py`.
 */

export const STANDARD_GRAVITY = 9.80665; // m/s^2

export type ReynoldsNumberArgs = {
  density: number;
  viscosity: number;
  diameter: number;
  velocity?: number;
  volumetricFlowRate?: number;
};

export type FrictionFactorArgs = {
  reynolds: number;
  relativeRoughness?: number;
  initialGuess?: number;
  maxIterations?: number;
  tolerance?: number;
};

export type PipeResistanceArgs = {
  frictionFactor: number;
  length: number;
  diameter: number;
};

export type PressureLossFromKArgs = {
  totalK: number;
  density: number;
  velocity: number;
};

export type HydraulicHeadArgs = {
  pressureLoss: number;
  density: number;
  gravity?: number;
};

/**
 * Calculate Reynolds number using density, viscosity, diameter and velocity data.
 * Either provide velocity explicitly or a volumetric flow rate to derive it.
 */
export function calculateReynoldsNumber({
  density,
  viscosity,
  diameter,
  velocity,
  volumetricFlowRate,
}: ReynoldsNumberArgs): number {
  const mu = requirePositive(viscosity, "viscosity");
  const dia = requirePositive(diameter, "diameter");
  const rho = requirePositive(density, "density");
  const vel = typeof velocity === "number" ? velocity : velocityFromFlow(volumetricFlowRate, dia);
  return (rho * Math.abs(vel) * dia) / mu;
}

/**
 * Calculate Reynolds number using mass flow rate, viscosity, diameter.
 * 
 */
export function calculateReynoldsNumberFromMassFlowRate(
  viscosity: number,
  diameter: number,
  massFlowRate: number,
): number {
  const mu = requirePositive(viscosity, "viscosity");
  const dia = requirePositive(diameter, "diameter");
  const w = requirePositive(massFlowRate, "massFlowRate");
  const area = Math.PI * Math.pow(dia / 2, 2);
  return (w * dia) / (area * mu);
}


/**
 * Determine the flow regime based on the provided Reynolds number.
 * Matches backend logic: <2000 laminar, >4000 turbulent, otherwise transition.
 */
export function determineFlowScheme(reynolds: number): "laminar" | "transition" | "turbulent" {
  if (reynolds < 2000) {
    return "laminar";
  }
  if (reynolds > 4000) {
    return "turbulent";
  }
  return "transition";
}

/**
 * Compute relative roughness (epsilon / diameter) used by Darcy friction calculations.
 */
export function relativeRoughness(roughness: number | null | undefined, diameter: number): number {
  const dia = requirePositive(diameter, "diameter");
  if (!roughness || roughness <= 0) {
    return 0;
  }
  return roughness / dia;
}

/**
 * Estimate the Darcy friction factor using the Shacham (1980) explicit approximation.
 * Mirrors the backend's `fluids.friction.Shacham_1980` implementation.
 */
export function darcyFrictionFactor({
  reynolds,
  relativeRoughness: eD = 0,
}: FrictionFactorArgs): number {
  const re = requirePositive(reynolds, "reynolds");
  if (re < 2000) {
    return 64 / re;
  }

  const rough = Math.max(0, eD);
  const base = rough / 3.7;
  const inner = base + 14.5 / re;
  if (inner <= 0) {
    throw new Error("Shacham_1980 requires a positive inner logarithm argument");
  }

  const innerLog10 = Math.log10(inner);
  const bracket = base - (5.02 / re) * innerLog10;
  if (bracket <= 0) {
    throw new Error("Shacham_1980 requires a positive outer logarithm argument");
  }
  const term = -4 * Math.log10(bracket);
  if (!Number.isFinite(term) || term === 0) {
    throw new Error("Invalid Darcy friction factor result from Shacham_1980");
  }
  return 4 / (term * term);
}

/**
 * Normalize a friction factor convention to Darcy.
 */
export function toDarcyFriction(value: number, type: "darcy" | "fanning" = "darcy"): number {
  const positive = requirePositive(value, "friction factor");
  if (type === "darcy") {
    return positive;
  }
  if (type === "fanning") {
    return positive * 4.0;
  }
  throw new Error(`Unknown friction factor type '${type}'`);
}

/**
 * Convert a Darcy friction factor to the requested convention.
 */
export function fromDarcyFriction(value: number, type: "darcy" | "fanning" = "darcy"): number {
  const positive = requirePositive(value, "darcy friction factor");
  if (type === "darcy") {
    return positive;
  }
  if (type === "fanning") {
    return positive / 4.0;
  }
  throw new Error(`Unknown friction factor type '${type}'`);
}

/**
 * Darcy-Weisbach resistance K for straight pipe: K = f * L / D.
 */
export function pipeResistanceFromDarcy({ frictionFactor, length, diameter }: PipeResistanceArgs): number {
  const f = Math.max(0, frictionFactor);
  const len = Math.max(0, length);
  const dia = requirePositive(diameter, "diameter");
  if (f === 0 || len === 0) {
    return 0;
  }
  return f * (len / dia);
}

/**
 * Convert hydraulic head change (in meters) to a pressure loss (Pa).
 */
export function hydraulicHeadToPressureLoss(head: number, density: number, gravity: number = STANDARD_GRAVITY): number {
  const rho = requirePositive(density, "density");
  const g = requirePositive(gravity, "gravity");
  return rho * g * head;
}

/**
 * Convert pressure loss back to hydraulic head.
 */
export function pressureLossToHydraulicHead({ pressureLoss, density, gravity = STANDARD_GRAVITY }: HydraulicHeadArgs): number {
  const rho = requirePositive(density, "density");
  const g = requirePositive(gravity, "gravity");
  return pressureLoss / (rho * g);
}

/**
 * Evaluate the Darcy-Weisbach pressure drop from a total K value.
 */
export function pressureLossFromTotalK({ totalK, density, velocity }: PressureLossFromKArgs): number {
  const k = Math.max(0, totalK);
  const rho = requirePositive(density, "density");
  const vel = velocity;
  if (!Number.isFinite(vel)) {
    throw new Error("velocity must be a finite number");
  }
  if (k === 0 || vel === 0) {
    return 0;
  }
  return k * rho * vel * vel * 0.5;
}

/**
 * Calculate cross-sectional velocity from volumetric flow rate.
 */
export function velocityFromFlow(flowRate: number | undefined, diameter: number): number {
  if (flowRate === undefined || flowRate === null || !Number.isFinite(flowRate)) {
    throw new Error("volumetric flow rate is required to determine velocity");
  }
  const dia = requirePositive(diameter, "diameter");
  const area = 0.25 * Math.PI * dia * dia;
  return flowRate / area;
}

function requirePositive(value: number | null | undefined, name: string): number {
  if (value === null || value === undefined || value <= 0) {
    throw new Error(`${name} must be positive`);
  }
  return value;
}
