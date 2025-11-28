import {
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    Stack,
    FormControlLabel,
    Radio,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    AutoFixHigh as AutoFixHighIcon,
} from "@mui/icons-material";
import { PipeProps, PipePatch, NodeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";
import { buildHydraulicContext, convertScalar, PSI_PER_PASCAL, AIR_MOLAR_MASS } from "@/lib/calculations/utils";
import { calculateRequiredCg, computeStandardFlowScfh } from "@/lib/calculations/controlValve";

type Props = {
    pipe: PipeProps;
    isGasPipe: boolean;
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeControlValveSection({ pipe, isGasPipe, startNode, endNode, onUpdatePipe }: Props) {
    const controlValveInputRadioLabel = isGasPipe
        ? "Input Cg"
        : "Input Cv";
    const controlValveOutputRadioLabel = isGasPipe
        ? "Input Pressure Drop"
        : "Input Pressure Drop";

    const controlValvePressureDropUnit = pipe?.controlValve?.pressureDropUnit ?? "kPa";
    const controlValveCalculatedPressureDropPa =
        pipe?.pressureDropCalculationResults?.controlValvePressureDrop ??
        (pipe?.controlValve?.pressureDrop !== undefined
            ? convertUnit(
                pipe.controlValve.pressureDrop,
                pipe.controlValve.pressureDropUnit ?? "kPa",
                "Pa"
            )
            : undefined);
    const controlValvePressureDropDisplayValue =
        controlValveCalculatedPressureDropPa === undefined
            ? ""
            : convertUnit(controlValveCalculatedPressureDropPa, "Pa", controlValvePressureDropUnit);

    const controlValveCoefficientLabel = isGasPipe ? "Cg (Gas Flow Coefficient)" : "Cv (Flow Coefficient)";
    const controlValveCoefficientValue = isGasPipe
        ? pipe?.controlValve?.cg ?? ""
        : pipe?.controlValve?.cv ?? "";

    const controlValveCalculatedCoefficientLabel = isGasPipe ? "Calculated Cg" : "Calculated Cv";
    const controlValveCalculatedCoefficientValue = isGasPipe
        ? pipe?.controlValve?.cg ?? ""
        : pipe?.controlValve?.cv ?? "";

    const handleSolveCv = () => {
        if (!startNode || !endNode) return;

        const p1 = convertScalar(startNode.pressure, startNode.pressureUnit, "Pa");
        const p2 = convertScalar(endNode.pressure, endNode.pressureUnit, "Pa");

        if (!p1 || !p2) {
            alert("Both start and end nodes must have valid pressure values.");
            return;
        }

        const targetDrop = Math.abs(p1 - p2);
        if (targetDrop === 0) {
            alert("Pressure difference is zero. Cannot solve for Cv/Cg.");
            return;
        }

        const context = buildHydraulicContext(pipe);
        if (!context) {
            alert("Insufficient data to perform calculation (check flow rate, fluid properties, etc).");
            return;
        }

        const currentUnit = pipe.controlValve?.pressureDropUnit ?? "kPa";
        const convertedDrop = convertScalar(targetDrop, "Pa", currentUnit);

        if (isGasPipe) {
            const flowScfh = computeStandardFlowScfh(context.massFlow, context.molarMass);
            const molarMass = context.molarMass;
            const specificGravity = molarMass ? molarMass / AIR_MOLAR_MASS : undefined;
            const temperatureK = context.temperature;
            const inletPressurePa = context.pressure; // This comes from boundary pressure (start node)
            const kFactor = context.gamma ?? 1.4;
            const xt = pipe.controlValve?.xT ?? 0.72;
            const c1 = pipe.controlValve?.C1 ?? (39.76 * Math.sqrt(xt));

            // For gas, we need P1 and P2 at the valve.
            // Assuming the valve is the main restriction, we use node pressures.
            // Note: context.pressure is typically the start node pressure.
            // We need to be careful about units.
            const inletPressurePsia = inletPressurePa * PSI_PER_PASCAL;
            // Target outlet pressure is P1 - drop, or just P2.
            // Let's use the actual P2 from the end node for consistency with the "pressure difference" goal.
            const outletPressurePa = p2;
            const outletPressurePsia = outletPressurePa * PSI_PER_PASCAL;

            if (!flowScfh || !specificGravity || !temperatureK) {
                alert("Missing gas properties or flow rate.");
                return;
            }

            const tempRankine = temperatureK * (9 / 5);

            const requiredCg = calculateRequiredCg({
                flowScfh,
                p1Psia: inletPressurePsia,
                p2Psia: outletPressurePsia,
                tempRankine,
                specificGravity,
                kFactor,
                xt,
                c1,
            });

            if (requiredCg > 0) {
                onUpdatePipe(pipe.id, (currentPipe) => {
                    const currentValve = currentPipe.controlValve ?? { id: currentPipe.id };
                    return {
                        controlValve: {
                            ...currentValve,
                            calculation_note: "cv_to_dp",
                            cg: requiredCg,
                            cv: requiredCg / c1, // Update Cv as well for consistency
                            pressureDrop: convertedDrop,
                            pressureDropUnit: currentUnit,
                        }
                    };
                });
            } else {
                alert("Could not calculate required Cg (result was 0 or invalid).");
            }

        } else {
            // Liquid
            // Cv = 11.56 * Q_m3h * sqrt(SG / dP_kPa)
            const density = context.density;
            const volumetricFlowM3h = context.volumetricFlowRate * 3600;
            const specificGravity = density / 1000;
            const pressureDropKPa = convertScalar(targetDrop, "Pa", "kPa");

            if (volumetricFlowM3h > 0 && specificGravity > 0 && pressureDropKPa && pressureDropKPa > 0) {
                const calculatedCv = 11.56 * volumetricFlowM3h * Math.sqrt(specificGravity / pressureDropKPa);
                if (Number.isFinite(calculatedCv)) {
                    onUpdatePipe(pipe.id, (currentPipe) => {
                        const currentValve = currentPipe.controlValve ?? { id: currentPipe.id };
                        return {
                            controlValve: {
                                ...currentValve,
                                calculation_note: "cv_to_dp",
                                cv: calculatedCv,
                                pressureDrop: convertedDrop,
                                pressureDropUnit: currentUnit,
                            }
                        };
                    });
                }
            } else {
                alert("Could not calculate Cv. Check flow rate and pressure difference.");
            }
        }
    };

    const handleSetDp = () => {
        if (!startNode || !endNode) return;

        const p1 = convertScalar(startNode.pressure, startNode.pressureUnit, "Pa");
        const p2 = convertScalar(endNode.pressure, endNode.pressureUnit, "Pa");

        if (p1 === undefined || p2 === undefined) {
            alert("Both start and end nodes must have valid pressure values.");
            return;
        }

        const targetDrop = Math.abs(p1 - p2);
        const currentUnit = pipe.controlValve?.pressureDropUnit ?? "kPa";
        const convertedDrop = convertScalar(targetDrop, "Pa", currentUnit);

        if (convertedDrop !== undefined) {
            // Calculate Cv/Cg immediately
            const context = buildHydraulicContext(pipe);
            let calculatedCg: number | undefined;
            let calculatedCv: number | undefined;

            if (context) {
                if (isGasPipe) {
                    const flowScfh = computeStandardFlowScfh(context.massFlow, context.molarMass);
                    const molarMass = context.molarMass;
                    const specificGravity = molarMass ? molarMass / AIR_MOLAR_MASS : undefined;
                    const temperatureK = context.temperature;
                    const inletPressurePa = context.pressure;
                    const kFactor = context.gamma ?? 1.4;
                    const xt = pipe.controlValve?.xT ?? 0.72;
                    const c1 = pipe.controlValve?.C1 ?? (39.76 * Math.sqrt(xt));
                    const inletPressurePsia = inletPressurePa * PSI_PER_PASCAL;
                    const outletPressurePa = p2; // Use actual P2
                    const outletPressurePsia = outletPressurePa * PSI_PER_PASCAL;

                    if (flowScfh && specificGravity && temperatureK) {
                        const tempRankine = temperatureK * (9 / 5);
                        const requiredCg = calculateRequiredCg({
                            flowScfh,
                            p1Psia: inletPressurePsia,
                            p2Psia: outletPressurePsia,
                            tempRankine,
                            specificGravity,
                            kFactor,
                            xt,
                            c1,
                        });
                        if (requiredCg > 0) {
                            calculatedCg = requiredCg;
                            calculatedCv = requiredCg / c1;
                        }
                    }
                } else {
                    // Liquid
                    const density = context.density;
                    const volumetricFlowM3h = context.volumetricFlowRate * 3600;
                    const specificGravity = density / 1000;
                    const pressureDropKPa = convertScalar(targetDrop, "Pa", "kPa");

                    if (volumetricFlowM3h > 0 && specificGravity > 0 && pressureDropKPa && pressureDropKPa > 0) {
                        const cv = 11.56 * volumetricFlowM3h * Math.sqrt(specificGravity / pressureDropKPa);
                        if (Number.isFinite(cv)) {
                            calculatedCv = cv;
                        }
                    }
                }
            }

            onUpdatePipe(pipe.id, (currentPipe) => {
                const currentValve = currentPipe.controlValve ?? { id: currentPipe.id };
                return {
                    controlValve: {
                        ...currentValve,
                        calculation_note: "dp_to_cv",
                        pressureDrop: convertedDrop,
                        pressureDropUnit: currentUnit,
                        ...(isGasPipe ? { cg: calculatedCg, cv: calculatedCv } : { cv: calculatedCv }),
                    }
                };
            });
        }
    };

    return (
        <>
            <FormControl component="fieldset" fullWidth sx={{
                border: "1px solid",
                borderColor: "rgba(0, 0, 0, 0.23)",
                borderRadius: 1,
                px: 2,
                pb: 1,
                pt: 0.5,
                "&:hover": {
                    borderColor: "text.primary",
                },
            }}>
                <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Control Valve Calculation Mode</FormLabel>
                <RadioGroup
                    value={pipe.controlValve?.calculation_note || "dp_to_cv"}
                    onChange={(event) => {
                        onUpdatePipe(pipe.id, {
                            controlValve: {
                                id: pipe.controlValve?.id || pipe.id,
                                tag: pipe.controlValve?.tag || pipe.id,
                                ...pipe.controlValve,
                                calculation_note: event.target.value,
                            },
                        });
                    }}
                >
                    <Stack direction="row">
                        <FormControlLabel value="cv_to_dp" control={<Radio size="small" />} label={controlValveInputRadioLabel} />
                        <FormControlLabel value="dp_to_cv" control={<Radio size="small" />} label={controlValveOutputRadioLabel} />
                    </Stack>
                </RadioGroup>
            </FormControl>

            {isGasPipe && (
                <>
                    <Stack spacing={2}>
                        <TextField
                            label="Gas Valve Constant (C1)"
                            size="small"
                            type="number"
                            disabled={true}
                            helperText="Typically 15 to 35"
                            value={
                                typeof pipe.controlValve?.C1 === "number"
                                    ? pipe.controlValve.C1.toFixed(4)
                                    : ""
                            }
                            onChange={(event) => {
                                const value = event.target.value === "" ? undefined : Number(event.target.value);
                                onUpdatePipe(pipe.id, (currentPipe) => {
                                    const currentValve =
                                        currentPipe.controlValve ?? {
                                            id: currentPipe.id,
                                            tag: currentPipe.id,
                                        };
                                    return {
                                        controlValve: {
                                            ...currentValve,
                                            C1: value,
                                        },
                                    };
                                });
                            }}
                            color="success"
                            sx={{
                                "& .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                                "& .MuiInputLabel-root": { color: "success.main" },
                            }}
                        />
                    </Stack>
                </>
            )}

            {(pipe.controlValve?.calculation_note === "cv_to_dp") && (
                <>
                    <Stack spacing={2} direction="row" alignItems="flex-start">
                        <TextField
                            label={controlValveCoefficientLabel}
                            size="small"
                            type="number"
                            value={controlValveCoefficientValue}
                            onChange={(event) => {
                                const value =
                                    event.target.value === "" ? undefined : Number(event.target.value);
                                onUpdatePipe(pipe.id, (currentPipe) => {
                                    const currentValve =
                                        currentPipe.controlValve ?? {
                                            id: currentPipe.id,
                                            tag: currentPipe.id,
                                        };
                                    return {
                                        controlValve: {
                                            ...currentValve,
                                            ...(isGasPipe ? { cg: value } : { cv: value }),
                                        },
                                        pressureDropCalculationResults: undefined,
                                        resultSummary: undefined,
                                    };
                                });
                            }}
                            sx={{ flex: 1 }}
                        />
                        <Tooltip title={`Solve for ${isGasPipe ? "Cg" : "Cv"} (adjusts coefficient to match pressure difference)`}>
                            <IconButton onClick={handleSolveCv} color="primary" sx={{ mt: 0.5 }}>
                                <AutoFixHighIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <QuantityInput
                        label="Calculated Pressure Drop"
                        value={
                            typeof controlValvePressureDropDisplayValue === "number"
                                ? controlValvePressureDropDisplayValue
                                : ""
                        }
                        unit={controlValvePressureDropUnit}
                        units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                        unitFamily="pressureDrop"
                        sx={{ input: { color: 'success.main' } }}
                        readOnly
                        color="success"
                        alwaysShowColor
                        onValueChange={() => { }} // Read-only
                        onUnitChange={(newUnit) => {
                            onUpdatePipe(pipe.id, (currentPipe) => {
                                const currentValve =
                                    currentPipe.controlValve ?? {
                                        id: currentPipe.id,
                                        tag: currentPipe.id,
                                    };
                                const valveUnit = currentValve.pressureDropUnit ?? "kPa";
                                const pressureDropPa =
                                    currentPipe.pressureDropCalculationResults?.controlValvePressureDrop ??
                                    (currentValve.pressureDrop !== undefined
                                        ? convertUnit(currentValve.pressureDrop, valveUnit, "Pa")
                                        : undefined);

                                let newPressureDrop: number | undefined;
                                if (pressureDropPa !== undefined) {
                                    newPressureDrop = convertUnit(pressureDropPa, "Pa", newUnit);
                                }

                                return {
                                    controlValve: {
                                        ...currentValve,
                                        pressureDrop: newPressureDrop,
                                        pressureDropUnit: newUnit,
                                    },
                                };
                            });
                        }}
                    />
                </>
            )}

            {(pipe.controlValve?.calculation_note === "dp_to_cv" || !pipe.controlValve?.calculation_note) && (
                <>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <QuantityInput
                            label="Pressure Drop"
                            value={
                                typeof controlValvePressureDropDisplayValue === "number"
                                    ? controlValvePressureDropDisplayValue
                                    : ""
                            }
                            unit={controlValvePressureDropUnit}
                            units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                            unitFamily="pressureDrop"
                            onValueChange={(newValue) => {
                                onUpdatePipe(pipe.id, (currentPipe) => {
                                    const currentValve =
                                        currentPipe.controlValve ?? {
                                            id: currentPipe.id,
                                            tag: currentPipe.id,
                                        };
                                    return {
                                        controlValve: {
                                            ...currentValve,
                                            pressureDrop: newValue,
                                            pressureDropUnit: currentValve.pressureDropUnit ?? "kPa",
                                            ...(isGasPipe ? { cg: undefined } : { cv: undefined }),
                                        },
                                        pressureDropCalculationResults: undefined,
                                        resultSummary: undefined,
                                    };
                                });
                            }}
                            onUnitChange={(newUnit) => {
                                onUpdatePipe(pipe.id, (currentPipe) => {
                                    const currentValve =
                                        currentPipe.controlValve ?? {
                                            id: currentPipe.id,
                                            tag: currentPipe.id,
                                        };
                                    return {
                                        controlValve: {
                                            ...currentValve,
                                            pressureDropUnit: newUnit,
                                        },
                                        pressureDropCalculationResults: undefined,
                                        resultSummary: undefined,
                                    };
                                });
                            }}
                        />
                        <Tooltip title="Set Pressure Drop (sets value to match pressure difference)">
                            <IconButton onClick={handleSetDp} color="primary" sx={{ mt: 1 }}>
                                <AutoFixHighIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <TextField
                        label={controlValveCalculatedCoefficientLabel}
                        size="small"
                        type="number"
                        sx={{
                            input: { color: 'success.main' },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                            "& .MuiInputLabel-root": { color: "success.main" },
                        }}
                        value={
                            typeof controlValveCalculatedCoefficientValue === "number"
                                ? controlValveCalculatedCoefficientValue.toFixed(4)
                                : ""
                        }
                        color="success"
                    />
                </>
            )}
        </>
    );
}
