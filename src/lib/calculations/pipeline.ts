import {
    calculateFittingLosses,
} from "./fittingCalculation";
import {
    STANDARD_GRAVITY,
    darcyFrictionFactor,
    determineFlowScheme,
} from "./basicCaculations";
import {
    solveIsothermal,
    solveAdiabatic,
    gasStateFromConditions,
    type GasState,
} from "./gasFlow";
import type {
    FittingType,
    PipeProps,
    PressureDropCalculationResults,
    resultSummary,
} from "../types";
import {
    HydraulicContext,
    PipeLengthComputation,
    isPositive,
    convertScalar,
    applyUserAndSafety,
    ensureSwageFittings,
    resetFittingValues,
    gasStateToPipeState,
} from "./utils";

export function computeFittingContribution(
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

export function computePipeLengthContribution(
    pipe: PipeProps,
    context: HydraulicContext | null,
    fittingK?: number
): PipeLengthComputation {
    if (!context) {
        return {};
    }

    const length = context.length;
    const diameter = context.pipeDiameter;
    const area = 0.25 * Math.PI * diameter * diameter;

    // Calculate velocity and Reynolds number first as they don't depend on length
    let velocity: number | undefined;
    let reynolds: number | undefined;
    let frictionFactor: number | undefined;

    if (area > 0) {
        velocity = context.volumetricFlowRate / area;
        if (Number.isFinite(velocity)) {
            reynolds = (context.density * Math.abs(velocity) * diameter) / context.viscosity;

            if (isPositive(reynolds)) {
                const relativeRoughness =
                    context.roughness && context.roughness > 0 ? context.roughness / diameter : 0;

                try {
                    frictionFactor = darcyFrictionFactor({
                        reynolds,
                        relativeRoughness,
                    });
                } catch {
                    // Ignore error, frictionFactor remains undefined
                }
            }
        }
    }

    // If length is undefined, we can't calculate pipe K, but we can return velocity/reynolds/friction
    if (length === undefined) {
        const totalK = applyUserAndSafety(pipe, undefined, fittingK);
        return {
            totalK,
            velocity,
            reynolds,
            frictionFactor
        };
    }

    if (length === 0) {
        const totalK = applyUserAndSafety(pipe, 0, fittingK);
        return {
            pipeLengthK: 0,
            totalK,
            equivalentLength: undefined,
            velocity,
            reynolds,
            frictionFactor,
        };
    }

    if (!Number.isFinite(frictionFactor) || frictionFactor! <= 0) {
        const totalK = applyUserAndSafety(pipe, 0, fittingK);
        return {
            pipeLengthK: 0,
            totalK,
            velocity,
            reynolds,
            frictionFactor,
        };
    }

    const pipeLengthK = frictionFactor! * (length / diameter);
    const totalK = applyUserAndSafety(pipe, pipeLengthK, fittingK);
    const equivalentLength =
        totalK && totalK > 0 ? (totalK * diameter) / frictionFactor! : undefined;

    return {
        pipeLengthK,
        totalK,
        equivalentLength,
        velocity,
        reynolds,
        frictionFactor,
    };
}

export function calculatePressureDropResults(
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

    let elevationPressureDrop: number | undefined;

    if (typeof elevationMeters === "number") {
        const pipeLengthMeters = context.length ?? 0;
        // If elevation exceeds length (including if length is 0/undefined), set loss to 0
        if (Math.abs(elevationMeters) > pipeLengthMeters) {
            elevationPressureDrop = 0.0;
        } else {
            elevationPressureDrop = density * STANDARD_GRAVITY * elevationMeters;
        }
    }

    let totalSegmentPressureDrop =
        pipeAndFittingPressureDrop === undefined &&
            elevationPressureDrop === undefined &&
            userSpecifiedPressureDrop === undefined
            ? undefined
            : (pipeAndFittingPressureDrop ?? 0) +
            (elevationPressureDrop ?? 0) +
            (userSpecifiedPressureDrop ?? 0);

    if (totalSegmentPressureDrop === undefined && typeof velocity === "number") {
        totalSegmentPressureDrop = 0.0;
    }

    let normalizedPressureDrop: number | undefined;

    if (pipeAndFittingPressureDrop !== undefined &&
        typeof lengthResult.equivalentLength === "number" &&
        lengthResult.equivalentLength > 0) {
        normalizedPressureDrop = pipeAndFittingPressureDrop / lengthResult.equivalentLength;
    } else if (
        typeof lengthResult.frictionFactor === "number" &&
        lengthResult.frictionFactor > 0 &&
        typeof velocity === "number" &&
        isPositive(density) &&
        isPositive(context.pipeDiameter)
    ) {
        // Fallback: dP/L = f/D * 0.5 * rho * v^2
        const dynamicPressure = 0.5 * density * velocity * velocity;
        normalizedPressureDrop = (lengthResult.frictionFactor / context.pipeDiameter) * dynamicPressure;
    }

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

export function calculateGasFlowForPipe(
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

export function finalizeGasResults(
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
