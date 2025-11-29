import {
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Tooltip,
    IconButton,
    Box,
} from "@mui/material";
import { glassInputSx, glassSelectSx } from "@/lib/glassStyles";
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    AutoFixHigh as AutoFixHighIcon,
} from "@mui/icons-material";
import { PipeProps, PipePatch, FittingType, NodeProps } from "@/lib/types";
import { buildHydraulicContext, convertScalar } from "@/lib/calculations/utils";
import {
    computePipeLengthContribution,
    calculatePressureDropResults,
    calculateGasFlowForPipe,
    computeFittingContribution,
} from "@/lib/calculations/pipeline";
import { PIPE_FITTING_OPTIONS } from "../PipeDimension";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

const FITTING_TYPE_OPTIONS = ["SCRD", "LR", "SR"] as const;

type Props = {
    pipe: PipeProps;
    pipeFluidPhase: string;
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipePhysicalSection({ pipe, pipeFluidPhase, startNode, endNode, onUpdatePipe }: Props) {
    const pipeFittings = pipe.fittings ?? [];
    const defaultFittingOption = PIPE_FITTING_OPTIONS[0]?.value ?? "elbow_45";

    const updatePipeFittings = (nextFittings: FittingType[]) => {
        onUpdatePipe(pipe.id, { fittings: nextFittings });
    };

    const handleFittingFieldChange = (index: number, update: Partial<FittingType>) => {
        updatePipeFittings(
            pipeFittings.map((fitting, idx) => (idx === index ? { ...fitting, ...update } : fitting))
        );
    };

    const handleAddFitting = () => {
        updatePipeFittings([
            ...pipeFittings,
            {
                type: defaultFittingOption,
                count: 1,
                k_each: 0,
                k_total: 0,
            },
        ]);
    };

    const handleRemoveFitting = (index: number) => {
        updatePipeFittings(pipeFittings.filter((_, idx) => idx !== index));
    };

    const handleResetFittings = () => {
        if (pipeFittings.length === 0) return;
        updatePipeFittings([]);
    };

    const handleSolveLength = () => {
        if (!startNode || !endNode) return;

        const p1 = convertScalar(startNode.pressure, startNode.pressureUnit, "Pa");
        const p2 = convertScalar(endNode.pressure, endNode.pressureUnit, "Pa");

        if (!p1 || !p2) {
            alert("Both start and end nodes must have valid pressure values.");
            return;
        }

        const targetDrop = Math.abs(p1 - p2);
        if (targetDrop === 0) {
            alert("Pressure difference is zero. Cannot solve for length.");
            return;
        }

        // Binary search for length
        let low = 0.001;
        let high = 1000000; // 1000 km max
        let bestLength = low;
        let minError = Infinity;

        for (let i = 0; i < 50; i++) {
            const mid = (low + high) / 2;

            // Create a temporary pipe with the test length
            const tempPipe: PipeProps = {
                ...pipe,
                length: mid,
                lengthUnit: "m",
            };

            const context = buildHydraulicContext(tempPipe);
            if (!context) {
                // If context fails (e.g. invalid diameter), we can't solve
                break;
            }

            const { fittingK } = computeFittingContribution(tempPipe, context);
            const lengthResult = computePipeLengthContribution(tempPipe, context, fittingK);

            let calculatedDrop: number | undefined;

            if (pipeFluidPhase === "gas") {
                const gasResult = calculateGasFlowForPipe(tempPipe, context, lengthResult, fittingK);
                calculatedDrop = gasResult?.pressureDropResults.totalSegmentPressureDrop;
            } else {
                const liquidResult = calculatePressureDropResults(tempPipe, context, lengthResult, fittingK);
                calculatedDrop = liquidResult?.totalSegmentPressureDrop;
            }

            if (calculatedDrop === undefined) {
                // Calculation failed, maybe length is too long/short causing issues?
                // For now, assume it's "too much" resistance if we can't compute?
                // Or maybe "too little"? Hard to say.
                // Let's try to narrow down.
                high = mid;
                continue;
            }

            const error = Math.abs(calculatedDrop - targetDrop);
            if (error < minError) {
                minError = error;
                bestLength = mid;
            }

            if (calculatedDrop < targetDrop) {
                low = mid;
            } else {
                high = mid;
            }
        }

        // Update the pipe length
        // Convert back to current unit if needed, but for now we set in meters and let the component handle display
        // Actually, QuantityInput expects value in `lengthUnit`.
        // So we should convert `bestLength` (meters) to `pipe.lengthUnit`.

        const currentUnit = pipe.lengthUnit ?? "m";
        const convertedLength = convertScalar(bestLength, "m", currentUnit);

        if (convertedLength) {
            onUpdatePipe(pipe.id, { length: convertedLength });
        }
    };

    return (
        <>
            <QuantityInput
                label="Pipe Roughness"
                value={pipe.roughness ?? ""}
                unit={pipe.roughnessUnit ?? "mm"}
                units={["mm", "cm", "m", "ft", "in"]}
                unitFamily="roughness"
                onValueChange={(newValue) => onUpdatePipe(pipe.id, { roughness: newValue })}
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { roughnessUnit: newUnit })}
                min={0}
            />

            <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                    <QuantityInput
                        label="Length"
                        value={pipe.length ?? ""}
                        unit={pipe.lengthUnit ?? "m"}
                        units={QUANTITY_UNIT_OPTIONS.length}
                        unitFamily="length"
                        onValueChange={(newValue) => onUpdatePipe(pipe.id, { length: newValue })}
                        onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { lengthUnit: newUnit })}
                        min={0}
                    />
                </Box>
                <Tooltip title="Solve for Length (adjusts length to match pressure difference)">
                    <IconButton onClick={handleSolveLength} color="primary" sx={{ mt: 1 }}>
                        <AutoFixHighIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {pipeFluidPhase === "liquid" && (
                <QuantityInput
                    label="Elevation Change"
                    value={pipe.elevation ?? ""}
                    unit={pipe.elevationUnit ?? "m"}
                    units={QUANTITY_UNIT_OPTIONS.length}
                    unitFamily="length"
                    onValueChange={(newValue) => onUpdatePipe(pipe.id, { elevation: newValue })}
                    onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { elevationUnit: newUnit })}
                    error={
                        pipe.elevation !== undefined &&
                        Math.abs(convertScalar(pipe.elevation, pipe.elevationUnit ?? "m", "m") ?? 0) >
                        (convertScalar(pipe.length, pipe.lengthUnit ?? "m", "m") ?? 0)
                    }
                    helperText={
                        pipe.elevation !== undefined &&
                            Math.abs(convertScalar(pipe.elevation, pipe.elevationUnit ?? "m", "m") ?? 0) >
                            (convertScalar(pipe.length, pipe.lengthUnit ?? "m", "m") ?? 0)
                            ? "Elevation change cannot exceed pipe length"
                            : undefined
                    }
                />
            )}

            <Stack spacing={3}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Fitting Type</InputLabel>
                    <Select
                        label="Fitting Type"
                        value={pipe.fittingType ?? "LR"}
                        onChange={(event) => onUpdatePipe(pipe.id, { fittingType: event.target.value })}
                        sx={glassSelectSx}
                    >
                        {FITTING_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Stack spacing={2}>
                    <TextField
                        label="Pipe & Fitting Safety Factor (%)"
                        size="small"
                        type="number"
                        value={pipe.pipingFittingSafetyFactor ?? 0}
                        error={(pipe.pipingFittingSafetyFactor ?? 0) < 0}
                        helperText={(pipe.pipingFittingSafetyFactor ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                        onChange={(event) => {
                            const value = event.target.value === "" ? undefined : Number(event.target.value);
                            onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: value });
                        }}
                        sx={glassInputSx}
                    />
                </Stack>

                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <InputLabel>Fittings</InputLabel>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Reset fittings">
                                <IconButton
                                    size="small"
                                    onClick={handleResetFittings}
                                    disabled={pipeFittings.length === 0}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Add fitting">
                                <IconButton size="small" onClick={handleAddFitting}>
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    {pipeFittings.length === 0 ? (
                        <InputLabel>No fittings added.</InputLabel>
                    ) : (
                        <Stack spacing={2}>
                            {pipeFittings.map((fitting, index) => {
                                const isSwage =
                                    fitting.type === "inlet_swage" || fitting.type === "outlet_swage";
                                return (
                                    <Stack
                                        key={`${fitting.type}-${index}`}
                                        direction="row"
                                        spacing={1}
                                        alignItems="flex-end"
                                    >
                                        <FormControl sx={{ width: "240px" }} size="small">
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                label="Type"
                                                value={fitting.type}
                                                disabled={isSwage}
                                                onChange={(event) =>
                                                    handleFittingFieldChange(index, {
                                                        type: event.target.value,
                                                        k_each: 0,
                                                        k_total: 0,
                                                    })
                                                }
                                                fullWidth
                                                sx={glassSelectSx}
                                            >
                                                {PIPE_FITTING_OPTIONS.filter(
                                                    (option) => !option.autoOnly || option.value === fitting.type
                                                ).map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Count"
                                            size="small"
                                            type="number"
                                            sx={{ width: "100px", ...glassInputSx }}
                                            disabled={isSwage}
                                            value={fitting.count ?? 0}
                                            onChange={(event) => {
                                                const valueNumber = Number(event.target.value);
                                                if (!Number.isFinite(valueNumber)) {
                                                    return;
                                                }
                                                const normalized = Math.max(0, Math.floor(valueNumber));
                                                handleFittingFieldChange(index, {
                                                    count: normalized,
                                                    k_total: normalized * (fitting.k_each ?? 0),
                                                });
                                            }}
                                        />
                                        <Tooltip title="Remove fitting">
                                            <IconButton
                                                aria-label="Remove fitting"
                                                size="small"
                                                disabled={isSwage}
                                                onClick={() => handleRemoveFitting(index)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}
                </Stack>
                <Stack spacing={2}>
                    <TextField
                        label="User K"
                        size="small"
                        type="number"
                        value={pipe.userK ?? ""}
                        error={(pipe.userK ?? 0) < 0}
                        helperText={(pipe.userK ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                        onChange={(event) => {
                            const value = event.target.value === "" ? undefined : Number(event.target.value);
                            onUpdatePipe(pipe.id, { userK: value });
                        }}
                        sx={glassInputSx}
                    />
                </Stack>
            </Stack>

            <QuantityInput
                label="User Pressure Loss"
                value={pipe.userSpecifiedPressureLoss ?? ""}
                unit={pipe.userSpecifiedPressureLossUnit ?? "kPa"}
                units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                unitFamily="pressureDrop"
                onValueChange={(newValue) =>
                    onUpdatePipe(pipe.id, {
                        userSpecifiedPressureLoss: newValue,
                        userSpecifiedPressureLossUnit: pipe.userSpecifiedPressureLossUnit ?? "kPa",
                    })
                }
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { userSpecifiedPressureLossUnit: newUnit })}
                min={0}
                minUnit="Pa"
            />
        </>
    );
}
