import {
    darcyFrictionFactor,
    relativeRoughness,
} from "./basicCaculations";
import type {
    PipeProps,
    PressureDropCalculationResults,
    Orifice,
} from "../types";
import {
    HydraulicContext,
    isPositive,
    convertScalar,
} from "./utils";

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

export function calculateOrificePressureDrop(
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

    const relRough = relativeRoughness(context.roughness, context.pipeDiameter);
    const frictionFactor = darcyFrictionFactor({ reynolds, relativeRoughness: relRough });

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
        frictionalFactor: frictionFactor,
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
