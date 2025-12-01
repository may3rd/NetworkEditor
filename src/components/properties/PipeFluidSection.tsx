import {
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
} from "@mui/material";
import { glassInputSx, glassSelectSx } from "@/lib/glassStyles";
import { PipeProps, PipePatch, NodeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

type Props = {
    pipe: PipeProps;
    sourceNode?: NodeProps;
    isGasPipe: boolean;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeFluidSection({ pipe, sourceNode, isGasPipe, onUpdatePipe }: Props) {
    const computeDesignMassFlowRate = (
        massFlowRateValue?: number,
        marginPercent?: number
    ): number | undefined => {
        if (typeof massFlowRateValue !== "number" || !Number.isFinite(massFlowRateValue)) {
            return undefined;
        }
        const normalizedMargin =
            typeof marginPercent === "number" && Number.isFinite(marginPercent) ? marginPercent : 0;
        return massFlowRateValue * (1 + normalizedMargin / 100);
    };

    return (
        <Stack spacing={2}>
            {isGasPipe && (
                <FormControl size="small" fullWidth>
                    <InputLabel>Gas Flow Type</InputLabel>
                    <Select
                        label="Gas Flow Type"
                        value={pipe.gasFlowModel ?? "adiabatic"}
                        onChange={(event) =>
                            onUpdatePipe(pipe.id, {
                                gasFlowModel: event.target.value as "adiabatic" | "isothermal",
                            })
                        }
                        sx={glassSelectSx}
                    >
                        <MenuItem value="adiabatic">Adiabatic</MenuItem>
                        <MenuItem value="isothermal">Isothermal</MenuItem>
                    </Select>
                </FormControl>
            )}

            <QuantityInput
                label="Mass Flow Rate"
                value={pipe.massFlowRate ?? ""}
                unit={pipe.massFlowRateUnit ?? "kg/h"}
                units={QUANTITY_UNIT_OPTIONS.massFlowRate}
                unitFamily="massFlowRate"
                onValueChange={(newValue) => {
                    const normalizedValue = Number.isFinite(newValue) ? newValue : undefined;
                    const designMassFlowRate = computeDesignMassFlowRate(
                        normalizedValue,
                        pipe.designMargin
                    );
                    onUpdatePipe(pipe.id, {
                        massFlowRate: normalizedValue,
                        designMassFlowRate,
                        designMassFlowRateUnit:
                            designMassFlowRate !== undefined
                                ? pipe.massFlowRateUnit ?? "kg/h"
                                : undefined,
                    });
                }}
                onUnitChange={(newUnit) =>
                    onUpdatePipe(pipe.id, { massFlowRateUnit: newUnit, designMassFlowRateUnit: newUnit })
                }
                min={0}
                helperText={(() => {
                    const dMassFlow = pipe.massFlowRate;
                    if (typeof dMassFlow !== 'number' || !Number.isFinite(dMassFlow)) return undefined;

                    const massFlowUnit = pipe.massFlowRateUnit ?? "kg/h";
                    const massFlowKgH = convertUnit(dMassFlow, massFlowUnit, "kg/h");

                    let flowText = "";
                    if (isGasPipe) {
                        const mw = pipe.fluid?.molecularWeight ?? sourceNode?.fluid?.molecularWeight;
                        if (mw) {
                            const normalFlowNm3H = (massFlowKgH / mw) * 24.465;
                            flowText = `Normal Flow: ${normalFlowNm3H.toFixed(3)} Nm³/h`;
                        }
                    } else {
                        const density = pipe.fluid?.density ?? sourceNode?.fluid?.density;
                        if (density) {
                            let densityKgM3 = density;
                            const densityUnit = pipe.fluid?.densityUnit ?? sourceNode?.fluid?.densityUnit;
                            if (densityUnit && densityUnit !== "kg/m3") {
                                densityKgM3 = convertUnit(density, densityUnit, "kg/m3");
                            }
                            const volFlowM3H = massFlowKgH / densityKgM3;
                            flowText = `Volume Flow: ${volFlowM3H.toFixed(3)} m³/h`;
                        }
                    }

                    const velocity = pipe.resultSummary?.outletState?.velocity;
                    const erosionalVelocity = pipe.resultSummary?.outletState?.erosionalVelocity;
                    const isErosionAlert =
                        typeof velocity === "number" &&
                        typeof erosionalVelocity === "number" &&
                        velocity > erosionalVelocity;

                    const velocityText =
                        typeof velocity === "number"
                            ? ` | Velocity: ${velocity.toFixed(2)} m/s`
                            : "";

                    const erosionText = isErosionAlert
                        ? ` (Exceeds Erosional Velocity: ${erosionalVelocity?.toFixed(2)} m/s)`
                        : "";

                    return (
                        <span style={{ color: isErosionAlert ? "#d32f2f" : "inherit" }}>
                            {flowText}
                            {velocityText}
                            {erosionText}
                        </span>
                    ) as any;
                })()}
            />



            <Stack spacing={2}>
                <TextField
                    label="Design Margin (%)"
                    size="small"
                    type="number"
                    value={pipe.designMargin ?? ""}
                    error={(pipe.designMargin ?? 0) < 0}
                    helperText={(pipe.designMargin ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                    onChange={(event) => {
                        const parsedValue =
                            event.target.value === "" ? undefined : Number(event.target.value);
                        const normalizedMargin =
                            typeof parsedValue === "number" && Number.isFinite(parsedValue)
                                ? parsedValue
                                : undefined;
                        const designMassFlowRate = computeDesignMassFlowRate(
                            pipe.massFlowRate,
                            normalizedMargin
                        );
                        onUpdatePipe(pipe.id, {
                            designMargin: normalizedMargin,
                            designMassFlowRate,
                            designMassFlowRateUnit:
                                designMassFlowRate !== undefined
                                    ? pipe.massFlowRateUnit ?? "kg/h"
                                    : undefined,
                        });
                    }}
                    sx={glassInputSx}
                />
            </Stack>


        </Stack>
    );
}
