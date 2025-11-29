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

            <Stack spacing={2}>
                <QuantityInput
                    label={isGasPipe ? "Design Normal Flow Rate" : "Design Volume Flow Rate"}
                    value={(() => {
                        const dMassFlow = pipe.designMassFlowRate ?? computeDesignMassFlowRate(pipe.massFlowRate, pipe.designMargin);
                        if (dMassFlow === undefined) return "";

                        const massFlowUnit = pipe.designMassFlowRateUnit ?? pipe.massFlowRateUnit ?? "kg/h";

                        const massFlowKgH = convertUnit(
                            dMassFlow,
                            massFlowUnit,
                            "kg/h"
                        );

                        if (isGasPipe) {
                            const mw = pipe.fluid?.molecularWeight ?? sourceNode?.fluid?.molecularWeight;
                            if (!mw) return "";
                            // Normal flow in Nm3/h
                            const normalFlowNm3H = (massFlowKgH / mw) * 24.465;

                            const displayUnit = pipe.designFlowRateDisplayUnit ?? "Nm3/h";
                            if (displayUnit === "Nm3/h") return normalFlowNm3H;
                            if (displayUnit === "Nm3/d") return normalFlowNm3H * 24;
                            if (displayUnit === "MSCFD") return normalFlowNm3H * 0.000847552; // 1 Nm3/h = 35.3147 SCFH * 24 / 1e6 = 0.000847552 MSCFD
                            return normalFlowNm3H;
                        } else {
                            const density = pipe.fluid?.density ?? sourceNode?.fluid?.density;
                            if (!density) return "";

                            let densityKgM3 = density;
                            const densityUnit = pipe.fluid?.densityUnit ?? sourceNode?.fluid?.densityUnit;
                            if (densityUnit && densityUnit !== "kg/m3") {
                                densityKgM3 = convertUnit(density, densityUnit, "kg/m3");
                            }

                            const volFlowM3H = massFlowKgH / densityKgM3;
                            const displayUnit = pipe.designFlowRateDisplayUnit ?? "m3/h";

                            return convertUnit(volFlowM3H, "m3/h", displayUnit, "volumeFlowRate");
                        }
                    })()}
                    unit={pipe.designFlowRateDisplayUnit ?? (isGasPipe ? "Nm3/h" : "m3/h")}
                    units={isGasPipe ? ["Nm3/h", "Nm3/d", "MSCFD"] : QUANTITY_UNIT_OPTIONS.volumeFlowRate}
                    unitFamily={isGasPipe ? undefined : "volumeFlowRate"}
                    onValueChange={() => { }} // Read-only derived value
                    onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { designFlowRateDisplayUnit: newUnit })}
                    isDisabled={false} // Allow unit selection
                    decimalPlaces={3}
                    helperText={(() => {
                        const velocity = pipe.resultSummary?.outletState?.velocity;
                        const erosionalVelocity = pipe.resultSummary?.outletState?.erosionalVelocity;
                        const isErosionAlert =
                            typeof velocity === "number" &&
                            typeof erosionalVelocity === "number" &&
                            velocity > erosionalVelocity;

                        const velocityText =
                            typeof velocity === "number"
                                ? `Velocity: ${velocity.toFixed(2)} m/s`
                                : "";

                        const erosionText = isErosionAlert
                            ? ` (Exceeds Erosional Velocity: ${erosionalVelocity?.toFixed(2)} m/s)`
                            : "";

                        const standardCondText = isGasPipe ? "Standard Conditions: 1 atm, 25°C. " : "";

                        return (
                            <span style={{ color: isErosionAlert ? "#d32f2f" : "inherit" }}>
                                {standardCondText}
                                {velocityText}
                                {erosionText}
                            </span>
                        ) as any;
                    })()}
                    sx={{ input: { color: 'success.main' } }}
                    readOnly
                    color="success"
                    alwaysShowColor
                />
            </Stack>
        </Stack>
    );
}
