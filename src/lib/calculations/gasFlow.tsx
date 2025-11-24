"use client";

/**
 * This module will port the gas flow solvers from
 * backend-repo/src/network_hydraulic/calculators/gas_flow.py.
 *
 * The Python implementation contains:
 *  - GasState dataclass and helper utilities (Fanno flow, gas law helpers)
 *  - solve_isothermal: iterative solver using the fundamental isothermal gas equation
 *  - solve_adiabatic: Fanno-flow based solver yielding inlet/outlet gas states
 *  - Input validation + critical-pressure handling and choke detection
 *
 * Plan for porting:
 * 1. Recreate the GasState structure plus the helper functions
 *    (gasStateFromConditions, _fanno_fL_D, _fanno_mach_from_fL_D, etc.).
 * 2. Translate solve_isothermal and solve_adiabatic into TypeScript, reusing existing math libs.
 * 3. Wire the solvers into the fitting recalculation flow once complete.
 */

export type GasState = {
  pressure: number;
  temperature: number;
  density: number;
  velocity: number;
  mach: number;
  molar_mass: number;
  z_factor: number;
  gamma: number;
  gas_flow_critical_pressure?: number;
  is_choked?: boolean;
};

export const UNIVERSAL_GAS_CONSTANT = 8314.462618; // J/(kmol*K)
const MIN_MACH = 1e-6;
const MAX_ISOTHERMAL_ITER = 25;
const ISOTHERMAL_TOL = 1e-6;

const square = (value: number): number => value * value;

const _normalizeFrictionFactor = (
  value: number,
  factorType: string | undefined,
): number => {
  if (value <= 0) {
    return value;
  }
  const normalized = (factorType ?? "darcy").trim().toLowerCase();
  if (normalized === "darcy" || normalized === "d") {
    return value;
  }
  if (normalized === "fanning" || normalized === "f") {
    return 4 * value;
  }
  throw new Error(
    `Unknown friction_factor_type '${factorType}'. Expected 'darcy' or 'fanning'.`,
  );
};

const _validateGasFlowInputs = (
  pressure: number,
  temperature: number,
  massFlow: number,
  diameter: number,
  molarMass: number,
  zFactor: number,
  gamma: number,
  frictionFactor?: number,
  kTotal?: number,
  length?: number,
): void => {
  if (pressure <= 0) {
    throw new Error(`Pressure must be positive, got ${pressure} Pa`);
  }
  if (temperature <= 0) {
    throw new Error(`Temperature must be positive, got ${temperature} K`);
  }
  if (diameter <= 0) {
    throw new Error(`Diameter must be positive, got ${diameter} m`);
  }
  if (molarMass <= 0) {
    throw new Error(`Molar mass must be positive, got ${molarMass} kg/kmol`);
  }
  if (zFactor <= 0) {
    throw new Error(`Compressibility factor must be positive, got ${zFactor}`);
  }
  if (gamma <= 1) {
    throw new Error(`Gamma (Cp/Cv) must be > 1.0, got ${gamma}`);
  }
  if (massFlow < 0) {
    throw new Error(`Mass flow must be non-negative, got ${massFlow} kg/s`);
  }
  if (frictionFactor !== undefined && frictionFactor < 0) {
    throw new Error(
      `Friction factor must be non-negative, got ${frictionFactor}`,
    );
  }
  if (kTotal !== undefined && kTotal < 0) {
    throw new Error(
      `Total loss coefficient must be non-negative, got ${kTotal}`,
    );
  }
  if (length !== undefined && length < 0) {
    throw new Error(`Length must be non-negative, got ${length} m`);
  }
};

const _fannoFLD = (mach: number, gamma: number): number => {
  if (mach <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const mach2 = square(mach);
  const factor = (gamma - 1) / 2;
  const numerator = (gamma + 1) * mach2;
  const denominator = 2 * (1 + factor * mach2);
  const term1 = (1 - mach2) / (gamma * mach2);
  const term2 =
    ((gamma + 1) / (2 * gamma)) * Math.log(numerator / denominator);
  return term1 + term2;
};

const _fannoTarget = (mach: number, target: number, gamma: number): number =>
  _fannoFLD(mach, gamma) - target;

const _fannoMachFromFLD = (
  target: number,
  gamma: number,
  initialGuess: number,
  tol = 1e-9,
): number => {
  const isSubsonic = initialGuess < 1;
  let lower = isSubsonic ? MIN_MACH : 1 + 1e-6;
  let upper = isSubsonic ? 1 - 1e-6 : 10;
  let fLower = _fannoTarget(lower, target, gamma);
  let fUpper = _fannoTarget(upper, target, gamma);
  let expand = 0;
  while (fLower * fUpper > 0 && expand < 50) {
    if (isSubsonic) {
      lower *= 0.5;
      fLower = _fannoTarget(lower, target, gamma);
    } else {
      upper *= 1.5;
      fUpper = _fannoTarget(upper, target, gamma);
    }
    expand += 1;
  }
  if (fLower * fUpper > 0 || !Number.isFinite(fLower) || !Number.isFinite(fUpper)) {
    return Math.min(Math.max(initialGuess, MIN_MACH), 50);
  }
  for (let i = 0; i < 100; i += 1) {
    const mid = 0.5 * (lower + upper);
    const fMid = _fannoTarget(mid, target, gamma);
    if (Math.abs(fMid) <= tol) {
      return mid;
    }
    if (fLower * fMid <= 0) {
      upper = mid;
      fUpper = fMid;
    } else {
      lower = mid;
      fLower = fMid;
    }
    if (Math.abs(upper - lower) <= tol * mid) {
      return mid;
    }
  }
  return 0.5 * (lower + upper);
};

const _fannoPressureRatio = (mach: number, gamma: number): number => {
  const machAbs = Math.max(mach, MIN_MACH);
  const denominator = Math.sqrt(
    2 * (1 + ((gamma - 1) / 2) * square(machAbs)),
  );
  return (1 / machAbs) * Math.sqrt((gamma + 1) / denominator ** 2);
};

const _fannoTemperatureRatio = (mach: number, gamma: number): number => {
  const mach2 = square(Math.max(mach, MIN_MACH));
  return (gamma + 1) / (2 * (1 + ((gamma - 1) / 2) * mach2));
};

export const gasStateFromConditions = (
  pressure: number,
  temperature: number,
  massFlow: number,
  diameter: number,
  molarMass: number,
  zFactor: number,
  gamma: number,
): GasState => {
  _validateGasFlowInputs(
    pressure,
    temperature,
    massFlow,
    diameter,
    molarMass,
    zFactor,
    gamma,
  );
  const density =
    (pressure * molarMass) / (zFactor * UNIVERSAL_GAS_CONSTANT * temperature);
  if (!Number.isFinite(density) || density <= 0) {
    throw new Error(
      `Invalid density calculated: ${density} kg/m^3. Check input parameters.`,
    );
  }
  const area = Math.PI * square(diameter) * 0.25;
  if (area <= 0) {
    throw new Error(
      `Invalid pipe area calculated: ${area} m^2. Check diameter ${diameter} m`,
    );
  }
  const velocity = massFlow / (density * area);
  if (!Number.isFinite(velocity)) {
    throw new Error(
      `Invalid velocity calculated: ${velocity} m/s. Check input parameters.`,
    );
  }
  const sonic = Math.sqrt(
    gamma * zFactor * UNIVERSAL_GAS_CONSTANT * temperature / molarMass,
  );
  if (!Number.isFinite(sonic) || sonic <= 0) {
    throw new Error(
      `Invalid sonic speed calculated: ${sonic} m/s. Check input parameters.`,
    );
  }
  const mach = velocity / sonic;
  if (!Number.isFinite(mach) || mach < 0) {
    throw new Error(
      `Invalid Mach number calculated: ${mach}. Velocity: ${velocity}, Sonic: ${sonic}`,
    );
  }
  return {
    pressure,
    temperature,
    density,
    velocity,
    mach,
    molar_mass: molarMass,
    z_factor: zFactor,
    gamma,
  };
};

const _gasFlowCriticalPressureFromConditions = ({
  mass_flow: massFlow,
  diameter,
  temperature,
  molar_mass: molarMass,
  z_factor: zFactor,
  gamma,
  gas_flow_model: gasFlowModel = "adiabatic",
}: {
  mass_flow: number;
  diameter: number;
  temperature: number;
  molar_mass: number;
  z_factor: number;
  gamma: number;
  gas_flow_model?: string;
}): number | null => {
  if (
    massFlow === undefined ||
    massFlow <= 0 ||
    diameter <= 0 ||
    temperature <= 0 ||
    molarMass <= 0 ||
    zFactor <= 0 ||
    gamma <= 0
  ) {
    return null;
  }
  const area = Math.PI * square(diameter) * 0.25;
  const sonic = Math.sqrt(
    gamma * zFactor * UNIVERSAL_GAS_CONSTANT * temperature / molarMass,
  );
  if (sonic <= 0 || !Number.isFinite(sonic)) {
    return null;
  }
  const densityStar = massFlow / (area * sonic);
  if (densityStar <= 0 || !Number.isFinite(densityStar)) {
    return null;
  }
  if (gasFlowModel === "adiabatic") {
    return (
      (massFlow / area) *
      Math.sqrt(
        (temperature * UNIVERSAL_GAS_CONSTANT) /
          (gamma * molarMass * (1 + (gamma - 1) / 2)),
      )
    );
  }
  return (
    (massFlow / area) *
    Math.sqrt(
      (temperature * UNIVERSAL_GAS_CONSTANT) / (gamma * Math.max(massFlow, MIN_MACH)),
    )
  );
};

export const solveIsothermal = (
  inlet_pressure: number,
  temperature: number,
  mass_flow: number,
  diameter: number,
  length: number,
  friction_factor: number,
  k_total: number,
  k_additional: number,
  molar_mass: number,
  z_factor: number,
  gamma: number,
  is_forward = true,
  friction_factor_type = "darcy",
  viscosity?: number,
  roughness?: number,
): [number, GasState] => {
  _validateGasFlowInputs(
    inlet_pressure,
    temperature,
    mass_flow,
    diameter,
    molar_mass,
    z_factor,
    gamma,
    friction_factor,
    k_total,
    length,
  );

  if (length <= 0) {
    return [
      inlet_pressure,
      gasStateFromConditions(
        inlet_pressure,
        temperature,
        mass_flow,
        diameter,
        molar_mass,
        z_factor,
        gamma,
      ),
    ];
  }

  const normalizedFrictionFactor = _normalizeFrictionFactor(
    friction_factor,
    friction_factor_type,
  );
  void normalizedFrictionFactor;
  void viscosity;
  void roughness;

  const totalK = k_total + k_additional;
  if (totalK === 0) {
    return [
      inlet_pressure,
      gasStateFromConditions(
        inlet_pressure,
        temperature,
        mass_flow,
        diameter,
        molar_mass,
        z_factor,
        gamma,
      ),
    ];
  }

  const area = Math.PI * square(diameter) * 0.25;
  const massAreaTerm =
    square(mass_flow / area) * z_factor * UNIVERSAL_GAS_CONSTANT * temperature;
  const kTotalTerm = (kValue: number, p1: number, p2: number): number =>
    kValue + 2 * Math.log(p1 / p2);

  let upstreamPressure = inlet_pressure;
  let downstreamPressure: number | undefined;

  if (is_forward) {
    let downstreamGuess = 0.9 * upstreamPressure;
    for (let i = 0; i < MAX_ISOTHERMAL_ITER; i += 1) {
      downstreamPressure = downstreamGuess;
      const term = kTotalTerm(totalK, upstreamPressure, downstreamPressure);
      const p2Squared =
        square(upstreamPressure) -
        (term * massAreaTerm) / molar_mass;
      if (p2Squared <= 0) {
        downstreamGuess = 0;
        break;
      }
      downstreamGuess = Math.sqrt(p2Squared);
      if (
        Math.abs(downstreamGuess - downstreamPressure) <=
        ISOTHERMAL_TOL * downstreamGuess
      ) {
        downstreamPressure = downstreamGuess;
        break;
      }
    }
    if (downstreamPressure === undefined) {
      throw new Error("Isothermal solver failed to compute downstream pressure");
    }
  } else {
    let upstreamGuess = 1.1 * inlet_pressure;
    downstreamPressure = inlet_pressure;
    for (let i = 0; i < MAX_ISOTHERMAL_ITER; i += 1) {
      upstreamPressure = upstreamGuess;
      const term = kTotalTerm(totalK, upstreamPressure, downstreamPressure);
      const p1Squared =
        square(downstreamPressure) +
        (term * massAreaTerm) / molar_mass;
      if (p1Squared <= 0) {
        upstreamGuess = 0;
        break;
      }
      upstreamGuess = Math.sqrt(p1Squared);
      if (
        Math.abs(upstreamGuess - upstreamPressure) <=
        ISOTHERMAL_TOL * upstreamGuess
      ) {
        upstreamPressure = upstreamGuess;
        break;
      }
    }
  }

  const gasFlowCriticalPressure = _gasFlowCriticalPressureFromConditions({
    mass_flow,
    diameter,
    temperature,
    molar_mass,
    z_factor,
    gamma,
    gas_flow_model: "isothermal",
  });

  let finalPressure = is_forward
    ? downstreamPressure!
    : upstreamPressure;
  let choked = false;
  if (
    gasFlowCriticalPressure !== null &&
    (finalPressure <= gasFlowCriticalPressure || finalPressure <= 0)
  ) {
    finalPressure = gasFlowCriticalPressure;
    choked = true;
  } else if (finalPressure <= 0) {
    throw new Error(
      "Isothermal solver produced non-positive pressure. Check inputs.",
    );
  }

  const finalState = gasStateFromConditions(
    finalPressure,
    temperature,
    mass_flow,
    diameter,
    molar_mass,
    z_factor,
    gamma,
  );
  finalState.gas_flow_critical_pressure = gasFlowCriticalPressure ?? undefined;
  finalState.is_choked = choked;
  return [finalPressure, finalState];
};

export const solveAdiabatic = (
  boundary_pressure: number,
  temperature: number,
  mass_flow: number,
  diameter: number,
  length: number,
  friction_factor: number,
  k_total: number,
  k_additional: number,
  molar_mass: number,
  z_factor: number,
  gamma: number,
  is_forward = true,
  options?: {
    label?: string;
    friction_factor_type?: string;
  },
): [GasState, GasState] => {
  void friction_factor;
  const frictionFactorType = options?.friction_factor_type ?? "darcy";
  _normalizeFrictionFactor(friction_factor, frictionFactorType);
  void options?.label;

  _validateGasFlowInputs(
    boundary_pressure,
    temperature,
    mass_flow,
    diameter,
    molar_mass,
    z_factor,
    gamma,
    friction_factor,
    k_total,
    length,
  );

  if (!length || length <= 0) {
    const state = gasStateFromConditions(
      boundary_pressure,
      temperature,
      mass_flow,
      diameter,
      molar_mass,
      z_factor,
      gamma,
    );
    return [state, { ...state }];
  }

  const totalK = k_total + k_additional;
  if (totalK === 0) {
    const state = gasStateFromConditions(
      boundary_pressure,
      temperature,
      mass_flow,
      diameter,
      molar_mass,
      z_factor,
      gamma,
    );
    return [state, { ...state }];
  }

  const calculateY = (ratio: number, mach: number): number =>
    1 + ((ratio - 1) / 2) * square(mach);

  const findMach = (
    pressure: number,
    temp: number,
    forward: boolean,
  ): [number, number, number, number] => {
    const area = Math.PI * square(diameter) * 0.25;
    const sonic = Math.sqrt(
      gamma * z_factor * UNIVERSAL_GAS_CONSTANT * temp / molar_mass,
    );
    const density =
      (pressure * molar_mass) /
      (z_factor * UNIVERSAL_GAS_CONSTANT * temp);
    const velocity = mass_flow / (density * area);
    const machKnown = velocity / sonic;
    const fKnown = _fannoFLD(machKnown, gamma);
    const fTarget = forward ? fKnown - totalK : fKnown + totalK;
    let machTarget = 1;
    if (fTarget > 0) {
      try {
        machTarget = _fannoMachFromFLD(fTarget, gamma, machKnown);
      } catch {
        machTarget = 1;
      }
    }
    const yKnown = calculateY(gamma, machKnown);
    const yTarget = calculateY(gamma, machTarget);
    return [machKnown, machTarget, yKnown, yTarget];
  };

  let inletPressure: number;
  let inletTemperature: number;
  let outletPressure: number;
  let outletTemperature: number;

  if (is_forward) {
    const [ma1, ma2, y1, y2] = findMach(
      boundary_pressure,
      temperature,
      true,
    );
    inletPressure = boundary_pressure;
    inletTemperature = temperature / y1;
    outletPressure = inletPressure * (ma1 / ma2) * Math.sqrt(y1 / y2);
    outletTemperature = inletTemperature * (y1 / y2);
  } else {
    const [ma2, ma1, y2, y1] = findMach(
      boundary_pressure,
      temperature,
      false,
    );
    outletPressure = boundary_pressure;
    outletTemperature = temperature / y2;
    inletPressure = outletPressure * (ma2 / ma1) * Math.sqrt(y2 / y1);
    inletTemperature = outletTemperature * (y2 / y1);
  }

  const applyChoke = (state: GasState, temp: number): GasState => {
    const critical = _gasFlowCriticalPressureFromConditions({
      mass_flow,
      diameter,
      temperature: temp,
      molar_mass,
      z_factor,
      gamma,
      gas_flow_model: "adiabatic",
    });
    if (critical !== null && state.pressure <= critical) {
      const choked = gasStateFromConditions(
        critical,
        temp,
        mass_flow,
        diameter,
        molar_mass,
        z_factor,
        gamma,
      );
      choked.gas_flow_critical_pressure = critical;
      choked.is_choked = true;
      return choked;
    }
    state.gas_flow_critical_pressure = critical ?? undefined;
    return state;
  };

  const inletState = applyChoke(
    gasStateFromConditions(
      inletPressure,
      inletTemperature,
      mass_flow,
      diameter,
      molar_mass,
      z_factor,
      gamma,
    ),
    inletTemperature,
  );
  const outletState = applyChoke(
    gasStateFromConditions(
      outletPressure,
      outletTemperature,
      mass_flow,
      diameter,
      molar_mass,
      z_factor,
      gamma,
    ),
    outletTemperature,
  );

  return [inletState, outletState];
};
