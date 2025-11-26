import {
    TextField,
    Stack,
} from "@mui/material";
import { PipeProps, PipePatch } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

type Props = {
    pipe: PipeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeOrificeSection({ pipe, onUpdatePipe }: Props) {
    const orificePressureDropUnit = pipe?.orifice?.pressureDropUnit ?? "kPa";
    const orificeCalculatedPressureDropPa =
        pipe?.pressureDropCalculationResults?.orificePressureDrop ??
        (pipe?.orifice?.pressureDrop !== undefined
            ? convertUnit(pipe.orifice.pressureDrop, pipe.orifice.pressureDropUnit ?? "kPa", "Pa")
            : undefined);
    const orificePressureDropDisplayValue =
        orificeCalculatedPressureDropPa === undefined
            ? ""
            : convertUnit(orificeCalculatedPressureDropPa, "Pa", orificePressureDropUnit);

    return (
        <>
            <Stack spacing={2}>
                <TextField
                    label="Beta Ratio (β = d / D)"
                    size="small"
                    type="number"
                    slotProps={{
                        htmlInput: { step: 0.01, min: 0, max: 1 },
                    }}
                    value={pipe.orifice?.betaRatio ?? ""}
                    onChange={(event) => {
                        const value =
                            event.target.value === "" ? undefined : Number(event.target.value);
                        const normalizedValue =
                            value !== undefined && Number.isFinite(value) ? value : undefined;
                        onUpdatePipe(pipe.id, (currentPipe) => {
                            const currentOrifice =
                                currentPipe.orifice ?? {
                                    id: currentPipe.id,
                                    tag: currentPipe.id,
                                };
                            return {
                                orifice: {
                                    ...currentOrifice,
                                    betaRatio: normalizedValue,
                                },
                                pressureDropCalculationResults: undefined,
                                resultSummary: undefined,
                            };
                        });
                    }}
                />
            </Stack>

            <Stack spacing={2}>
                <TextField
                    label="Discharge Coefficient (Cd)"
                    size="small"
                    type="number"
                    disabled={true}
                    helperText="Calculated based on Beta Ratio"
                    value={
                        typeof pipe.orifice?.dischargeCoefficient === "number"
                            ? pipe.orifice.dischargeCoefficient.toFixed(4)
                            : ""
                    }
                    color="success"
                />
            </Stack>

            <QuantityInput
                label="Calculated Pressure Drop"
                value={
                    typeof orificePressureDropDisplayValue === "number"
                        ? orificePressureDropDisplayValue
                        : ""
                }
                unit={orificePressureDropUnit}
                units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                unitFamily="pressureDrop"
                sx={{ input: { color: 'success.main' } }}
                color="success"
                decimalPlaces={3}
                alwaysShowColor
                onValueChange={() => { }} // Read-only
                onUnitChange={(newUnit) => {
                    onUpdatePipe(pipe.id, (currentPipe) => {
                        const currentOrifice =
                            currentPipe.orifice ?? {
                                id: currentPipe.id,
                                tag: currentPipe.id,
                            };
                        const orificeUnit = currentOrifice.pressureDropUnit ?? "kPa";
                        const pressureDropPa =
                            currentPipe.pressureDropCalculationResults?.orificePressureDrop ??
                            (currentOrifice.pressureDrop !== undefined
                                ? convertUnit(currentOrifice.pressureDrop, orificeUnit, "Pa")
                                : undefined);

                        let newPressureDrop: number | undefined;
                        if (pressureDropPa !== undefined) {
                            newPressureDrop = convertUnit(pressureDropPa, "Pa", newUnit);
                        }

                        return {
                            orifice: {
                                ...currentOrifice,
                                pressureDrop: newPressureDrop,
                                pressureDropUnit: newUnit,
                            },
                        };
                    });
                }}
            />
        </>
    );
}
