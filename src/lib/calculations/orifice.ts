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

    const mode = orifice.inputMode || "beta_ratio";
    let calculatedBetaRatio: number | undefined;
    let pressureDrop: number | undefined;

    if (mode === "beta_ratio") {
        const orificeResult = calculateSharpEdgedPlateOrificePressureDrop({
            beta: betaRatio,
            reynolds,
            density: context.density,
            velocity,
        });

        if (orificeResult) {
            pressureDrop = orificeResult.pressureDrop;
            calculatedBetaRatio = betaRatio;
        }
    } else if (mode === "pressure_drop") {
        const specifiedPressureDropPa = convertScalar(
            orifice.pressureDrop,
            orifice.pressureDropUnit ?? "kPa",
            "Pa"
        );

        if (isPositive(specifiedPressureDropPa)) {
            pressureDrop = specifiedPressureDropPa;
            calculatedBetaRatio = solveBetaRatio({
                targetPressureDrop: specifiedPressureDropPa,
                reynolds,
                density: context.density,
                velocity,
            });
        }
    }

    if (pressureDrop === undefined) {
        return { results: undefined, updatedOrifice: orifice };
    }

    const updatedOrifice: Orifice = { ...orifice };

    // Update calculated fields in the object if needed (optional, but good for consistency)
    if (mode === "pressure_drop" && calculatedBetaRatio !== undefined) {
        updatedOrifice.betaRatio = calculatedBetaRatio;
    } else if (mode === "beta_ratio" && pressureDrop !== undefined) {
        const displayUnit = updatedOrifice.pressureDropUnit ?? "kPa";
        const convertedPressureDrop = convertScalar(pressureDrop, "Pa", displayUnit);
        if (convertedPressureDrop === undefined) {
            updatedOrifice.pressureDrop = pressureDrop;
            updatedOrifice.pressureDropUnit = "Pa";
        } else {
            updatedOrifice.pressureDrop = convertedPressureDrop;
            updatedOrifice.pressureDropUnit = displayUnit;
        }
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
        orificeBetaRatio: calculatedBetaRatio,
        userSpecifiedPressureDrop: 0,
        totalSegmentPressureDrop: pressureDrop,
        normalizedPressureDrop: 0,
        gasFlowCriticalPressure: 0,
    };

    return { results, updatedOrifice };
}

type SolveBetaRatioArgs = {
    targetPressureDrop: number;
    reynolds: number;
    density: number;
    velocity: number;
};

function solveBetaRatio({
    targetPressureDrop,
    reynolds,
    density,
    velocity,
}: SolveBetaRatioArgs): number | undefined {
    // Binary search for Beta between 0.01 and 0.99
    let lower = 0.01;
    let upper = 0.99;
    let bestBeta = undefined;

    for (let i = 0; i < 50; i++) {
        const mid = (lower + upper) / 2;
        const result = calculateSharpEdgedPlateOrificePressureDrop({
            beta: mid,
            reynolds,
            density,
            velocity,
        });

        if (!result) {
            // Should not happen in valid range
            return undefined;
        }

        const diff = result.pressureDrop - targetPressureDrop;

        if (Math.abs(diff) < 1e-4 * targetPressureDrop) {
            bestBeta = mid;
            break;
        }

        // Pressure drop increases as Beta decreases (smaller hole -> more resistance)
        // So if calculated dP > target dP, we need a larger Beta (less resistance)
        if (result.pressureDrop > targetPressureDrop) {
            lower = mid;
        } else {
            upper = mid;
        }
        bestBeta = mid;
    }

    return bestBeta;
}
