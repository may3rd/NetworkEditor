import {
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Tooltip,
    IconButton,
} from "@mui/material";
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import { PipeProps, PipePatch, FittingType } from "@/lib/types";
import { PIPE_FITTING_OPTIONS } from "../PipeDimension";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

const FITTING_TYPE_OPTIONS = ["SCRD", "LR", "SR"] as const;

type Props = {
    pipe: PipeProps;
    pipeFluidPhase: string;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipePhysicalSection({ pipe, pipeFluidPhase, onUpdatePipe }: Props) {
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

            {pipeFluidPhase === "liquid" && (
                <QuantityInput
                    label="Elevation Change"
                    value={pipe.elevation ?? ""}
                    unit={pipe.elevationUnit ?? "m"}
                    units={QUANTITY_UNIT_OPTIONS.length}
                    unitFamily="length"
                    onValueChange={(newValue) => onUpdatePipe(pipe.id, { elevation: newValue })}
                    onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { elevationUnit: newUnit })}
                />
            )}

            <Stack spacing={3}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Fitting Type</InputLabel>
                    <Select
                        label="Fitting Type"
                        value={pipe.fittingType ?? "LR"}
                        onChange={(event) => onUpdatePipe(pipe.id, { fittingType: event.target.value })}
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
                                            sx={{ width: "100px" }}
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
