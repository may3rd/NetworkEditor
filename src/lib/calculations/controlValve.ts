import {
    calculateReynoldsNumber,
    determineFlowScheme,
    darcyFrictionFactor,
    relativeRoughness,
} from "./basicCaculations";
import type {
    PipeProps,
    PressureDropCalculationResults,
    ControlValve,
} from "../types";
import {
    HydraulicContext,
    isPositive,
    convertScalar,
    KG_TO_LB,
    SECONDS_PER_HOUR,
    STANDARD_CUBIC_FEET_PER_LBMOL,
    PSI_PER_PASCAL,
    AIR_MOLAR_MASS,
    MIN_VALVE_PRESSURE_PA,
    DEFAULT_GAS_XT,
} from "./utils";

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

    // Fisher Universal Gas Sizing Equation:
    // Q = Cg * P1 * sin( (59.64/C1) * sqrt(dP/P1) )_rad * sqrt(520 / (G*T))
    // The termTempDensity is sqrt(1 / (G*T)).
    // So we need sqrt(520) * termTempDensity.
    const denominator = p1Psia * Math.sqrt(520) * termTempDensity * Math.sin(angleRadians);
    if (!Number.isFinite(denominator) || denominator === 0) {
        return 0;
    }

    const requiredCg = flowScfh / denominator;
    return Number.isFinite(requiredCg) && requiredCg > 0 ? requiredCg : 0;
}

export function calculateControlValvePressureDrop(
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
    // Map inputMode to calculation direction
    // inputMode "cv" means user inputs CV/Cg -> calculate dP (cv_to_dp)
    // inputMode "pressure_drop" means user inputs dP -> calculate CV/Cg (dp_to_cv)
    const mode = controlValve.inputMode === "pressure_drop" ? "dp_to_cv" : "cv_to_dp";

    if (mode === "dp_to_cv" && canCalculate && controlValve.pressureDrop !== undefined && controlValve.pressureDrop > 0) {
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
    } else if (mode === "cv_to_dp" && canCalculate && controlValve.cv && controlValve.cv > 0) {
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

    const area = 0.25 * Math.PI * context.pipeDiameter * context.pipeDiameter;
    const velocity = context.volumetricFlowRate / area;
    const reynolds = calculateReynoldsNumber({
        density: context.density,
        viscosity: context.viscosity,
        diameter: context.pipeDiameter,
        velocity,
    });
    const flowScheme = determineFlowScheme(reynolds);
    const relRough = relativeRoughness(context.roughness, context.pipeDiameter);
    const frictionFactor = darcyFrictionFactor({ reynolds, relativeRoughness: relRough });

    const results = buildControlValveResults(pressureDrop, reynolds, flowScheme, frictionFactor, calculatedCv, undefined);
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
    // Map inputMode to calculation direction
    const mode = controlValve.inputMode === "pressure_drop" ? "dp_to_cv" : "cv_to_dp";

    if (mode === "dp_to_cv" && isPositive(specifiedPressureDropPa)) {
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
    } else if (mode === "cv_to_dp") {
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

    const area = 0.25 * Math.PI * context.pipeDiameter * context.pipeDiameter;
    const velocity = context.volumetricFlowRate / area;
    const reynolds = calculateReynoldsNumber({
        density: context.density,
        viscosity: context.viscosity,
        diameter: context.pipeDiameter,
        velocity,
    });
    const flowScheme = determineFlowScheme(reynolds);
    const relRough = relativeRoughness(context.roughness, context.pipeDiameter);
    const frictionFactor = darcyFrictionFactor({ reynolds, relativeRoughness: relRough });

    const results = buildControlValveResults(pressureDrop, reynolds, flowScheme, frictionFactor, updatedControlValve.cv, updatedControlValve.cg);
    return { results, updatedControlValve };
}

function buildControlValveResults(
    pressureDrop?: number,
    reynoldsNumber: number = 0,
    flowScheme: "laminar" | "transition" | "turbulent" = "laminar",
    frictionalFactor: number = 0,
    calculatedCv?: number,
    calculatedCg?: number
): PressureDropCalculationResults {
    return {
        pipeLengthK: 0,
        fittingK: 0,
        userK: 0,
        pipingFittingSafetyFactor: 1,
        totalK: 0,
        reynoldsNumber,
        frictionalFactor,
        flowScheme,
        pipeAndFittingPressureDrop: 0,
        elevationPressureDrop: 0,
        controlValvePressureDrop: pressureDrop,
        controlValveCV: calculatedCv,
        controlValveCg: calculatedCg,
        orificePressureDrop: 0,
        userSpecifiedPressureDrop: 0,
        totalSegmentPressureDrop: pressureDrop,
        normalizedPressureDrop: 0,
        gasFlowCriticalPressure: 0,
    };
}

export function computeStandardFlowScfh(
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
