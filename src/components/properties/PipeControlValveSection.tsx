import {
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    Stack,
    FormControlLabel,
    Radio,
} from "@mui/material";
import { PipeProps, PipePatch } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

type Props = {
    pipe: PipeProps;
    isGasPipe: boolean;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeControlValveSection({ pipe, isGasPipe, onUpdatePipe }: Props) {
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
                    <Stack spacing={2}>
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
                        />
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
