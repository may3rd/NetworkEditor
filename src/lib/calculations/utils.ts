import { convertUnit } from "../unitConversion";
import {
    solveAdiabaticExpansion,
    type GasState,
    UNIVERSAL_GAS_CONSTANT,
} from "./gasFlow";
import type {
    FittingType,
    PipeProps,
    PressureDropCalculationResults,
    resultSummary,
    pipeState,
} from "../types";
import { FittingCalculationArgs } from "./fittingCalculation";

export const DEFAULT_TEMPERATURE_K = 298.15;
export const DEFAULT_PRESSURE_PA = 101_325;
export const SWAGE_ABSOLUTE_TOLERANCE = 1e-6;
export const SWAGE_RELATIVE_TOLERANCE = 1e-3;
export const KG_TO_LB = 2.204622621848776;
export const SECONDS_PER_HOUR = 3600;
export const STANDARD_CUBIC_FEET_PER_LBMOL = 379.482;
export const PSI_PER_PASCAL = 0.00014503773773020923;
export const AIR_MOLAR_MASS = 28.964;
export const MIN_VALVE_PRESSURE_PA = 1;
export const DEFAULT_GAS_XT = 0.72;

export type HydraulicContext = {
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

export type PipeLengthComputation = {
    pipeLengthK?: number;
    totalK?: number;
    equivalentLength?: number;
    reynolds?: number;
    frictionFactor?: number;
    velocity?: number;
};

export function isPositive(value?: number): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function convertScalar(
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

export function convertLength(value?: number, unit?: string, allowZero = false): number | undefined {
    const converted = convertScalar(value, unit, "m");
    if (converted === undefined) {
        return undefined;
    }
    if (allowZero) {
        return converted >= 0 ? converted : undefined;
    }
    return converted > 0 ? converted : undefined;
}

export function resolveDiameter(pipe: PipeProps): number | undefined {
    if (typeof pipe.diameter === "number") {
        return convertLength(pipe.diameter, pipe.diameterUnit ?? "mm");
    }
    if (typeof pipe.pipeDiameter === "number") {
        return convertLength(pipe.pipeDiameter, pipe.pipeDiameterUnit ?? "mm");
    }
    return undefined;
}

export function resolveMassFlow(pipe: PipeProps): number | undefined {
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

export function normalizeMolarMass(value?: number | null): number | undefined {
    if (value === null || value === undefined || value <= 0) {
        return undefined;
    }
    return value <= 0.5 ? value * 1000 : value;
}

export function computeErosionalVelocity(
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

export function resetFittingValues(fitting: FittingType): FittingType {
    return {
        ...fitting,
        k_each: 0,
        k_total: 0,
    };
}

export function applyUserAndSafety(pipe: PipeProps, pipeLengthK?: number, fittingK?: number): number | undefined {
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

export function createSwageFitting(type: "inlet_swage" | "outlet_swage"): FittingType {
    return {
        type,
        count: 1,
        k_each: 0,
        k_total: 0,
    };
}

export function diametersWithinTolerance(a: number, b: number): boolean {
    const diff = Math.abs(a - b);
    const scale = Math.max(Math.abs(a), Math.abs(b), 1);
    const tolerance = Math.max(SWAGE_ABSOLUTE_TOLERANCE, SWAGE_RELATIVE_TOLERANCE * scale);
    return diff <= tolerance;
}

export function shouldAddSwage(upstream?: number, downstream?: number): boolean {
    if (!isPositive(upstream) || !isPositive(downstream)) {
        return false;
    }
    return !diametersWithinTolerance(upstream, downstream);
}

export function ensureSwageFittings(pipe: PipeProps, baseFittings: FittingType[]): FittingType[] {
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

export function buildHydraulicContext(pipe: PipeProps): HydraulicContext | null {
    const fluid = pipe.fluid;
    if (!fluid) {
        return null;
    }

    const phase = (fluid.phase ?? "liquid").toLowerCase();
    const viscosity = convertScalar(fluid.viscosity, fluid.viscosityUnit ?? "cP", "Pa.s");
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

export function gasStateToPipeState(state: GasState, erosionalConstant?: number): pipeState {
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

export function calculateResultSummary(
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

    if (context.phase === "gas" && pipe.pipeSectionType === "control valve" && outletPressurePa) {
        try {
            const [gasInlet, gasOutlet] = solveAdiabaticExpansion(
                inletPressurePa,
                outletPressurePa,
                context.temperature,
                context.massFlow,
                context.pipeDiameter,
                context.molarMass!,
                context.zFactor!,
                context.gamma!
            );
            return direction === "backward"
                ? { inletState: gasStateToPipeState(gasOutlet, erosionalConstant), outletState: gasStateToPipeState(gasInlet, erosionalConstant) }
                : { inletState: gasStateToPipeState(gasInlet, erosionalConstant), outletState: gasStateToPipeState(gasOutlet, erosionalConstant) };
        } catch (e) {
            console.warn("Failed to solve adiabatic expansion for control valve", e);
        }
    }

    return direction === "backward"
        ? { inletState: outletState, outletState: inletState }
        : { inletState, outletState };
}
