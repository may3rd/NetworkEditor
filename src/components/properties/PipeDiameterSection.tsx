import {
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormLabel,
    RadioGroup,
    Stack,
    FormControlLabel,
    Radio,
    FormHelperText,
} from "@mui/material";
import { glassInputSx, glassSelectSx } from "@/lib/glassStyles";
import { PipeProps, PipePatch, PipeSchedule } from "@/lib/types";
import {
    PIPE_SCHEDULES,
    getScheduleEntries,
    nearest_pipe_diameter,
    normalizeSchedule,
} from "../PipeDimension";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

type Props = {
    pipe: PipeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeDiameterSection({ pipe, onUpdatePipe }: Props) {
    const pipeDiameterInputMode: "nps" | "diameter" = pipe
        ? pipe.diameterInputMode ??
        (pipe.pipeNPD !== undefined || pipe.pipeSchedule ? "nps" : "diameter")
        : "diameter";

    const pipeScheduleValue: PipeSchedule | undefined = pipe
        ? normalizeSchedule(pipe.pipeSchedule ?? "STD") ?? "STD"
        : undefined;
    const scheduleEntries = pipeScheduleValue ? getScheduleEntries(pipeScheduleValue) : [];
    const npsSelectValue =
        pipe &&
            pipe.pipeNPD !== undefined &&
            scheduleEntries.some((entry) => entry.nps === pipe.pipeNPD)
            ? String(pipe.pipeNPD)
            : "";

    const deriveDiameterFromNps = (npsValue?: number, scheduleValue?: PipeSchedule) => {
        if (npsValue === undefined || scheduleValue === undefined) {
            return undefined;
        }
        return nearest_pipe_diameter(npsValue, scheduleValue) ?? undefined;
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
                <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Diameter Input</FormLabel>
                <RadioGroup
                    value={pipeDiameterInputMode}
                    onChange={(event) =>
                        onUpdatePipe(pipe.id, { diameterInputMode: event.target.value as "nps" | "diameter" })
                    }
                >
                    <Stack direction="row">
                        <FormControlLabel value="nps" control={<Radio size="small" />} label="NPS" />
                        <FormControlLabel value="diameter" control={<Radio size="small" />} label="Diameter" />
                    </Stack>
                </RadioGroup>
            </FormControl>

            {pipeDiameterInputMode === "diameter" ? (
                <QuantityInput
                    label="Diameter"
                    value={pipe.diameter ?? ""}
                    unit={pipe.diameterUnit ?? "mm"}
                    units={QUANTITY_UNIT_OPTIONS.lengthSmall}
                    unitFamily="diameter"
                    onValueChange={(newValue) => onUpdatePipe(pipe.id, { diameter: newValue })}
                    onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { diameterUnit: newUnit })}
                    min={0}
                />
            ) : (
                <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Nominal Pipe Size (NPS)</InputLabel>
                        <Select
                            label="Nominal Pipe Size (NPS)"

                            value={npsSelectValue}
                            onChange={(event) => {
                                const value = event.target.value === "" ? undefined : Number(event.target.value);
                                const derived = deriveDiameterFromNps(value, pipeScheduleValue);
                                onUpdatePipe(pipe.id, {
                                    pipeNPD: value,
                                    ...(derived !== undefined
                                        ? { diameter: derived, diameterUnit: "mm" }
                                        : {}),
                                });
                            }}
                            sx={glassSelectSx}
                        >

                            {scheduleEntries.map((entry) => (
                                <MenuItem key={`${pipeScheduleValue}-${entry.nps}`} value={entry.nps}>
                                    {entry.nps}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Pipe Schedule</InputLabel>
                        <Select
                            label="Pipe Schedule"
                            value={pipeScheduleValue ?? "STD"}
                            onChange={(event) => {
                                const scheduleValue = event.target.value as PipeSchedule;
                                const entries = getScheduleEntries(scheduleValue);
                                let npsValue = pipe.pipeNPD;
                                if (npsValue === undefined || !entries.some((entry) => entry.nps === npsValue)) {
                                    npsValue = entries[0]?.nps;
                                }
                                const derived = deriveDiameterFromNps(npsValue, scheduleValue);
                                onUpdatePipe(pipe.id, {
                                    pipeSchedule: scheduleValue,
                                    pipeNPD: npsValue,
                                    ...(derived !== undefined
                                        ? { diameter: derived, diameterUnit: "mm" }
                                        : {}),
                                });
                            }}
                            sx={glassSelectSx}
                        >
                            {PIPE_SCHEDULES.map((schedule) => (
                                <MenuItem key={schedule} value={schedule}>
                                    {schedule}
                                </MenuItem>
                            ))}
                        </Select>
                        {pipe.diameter !== undefined && (
                            <FormHelperText>
                                Calculated Diameter: {pipe.diameter} {pipe.diameterUnit ?? "mm"}
                            </FormHelperText>
                        )}
                    </FormControl>
                </Stack>
            )}

            <QuantityInput
                label="Inlet Diameter"
                value={pipe.inletDiameter ?? ""}
                unit={pipe.inletDiameterUnit ?? pipe.diameterUnit ?? "mm"}
                units={QUANTITY_UNIT_OPTIONS.lengthSmall}
                unitFamily="diameter"
                onValueChange={(newValue) => onUpdatePipe(pipe.id, { inletDiameter: newValue })}
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { inletDiameterUnit: newUnit })}
                min={0}
            />

            <QuantityInput
                label="Outlet Diameter"
                value={pipe.outletDiameter ?? ""}
                unit={pipe.outletDiameterUnit ?? pipe.diameterUnit ?? "mm"}
                units={QUANTITY_UNIT_OPTIONS.lengthSmall}
                unitFamily="diameter"
                onValueChange={(newValue) => onUpdatePipe(pipe.id, { outletDiameter: newValue })}
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { outletDiameterUnit: newUnit })}
                min={0}
            />

            <Stack spacing={2}>
                <TextField
                    label="Erosional Constant"
                    size="small"
                    type="number"
                    value={pipe.erosionalConstant ?? 100}
                    error={(pipe.erosionalConstant ?? 100) < 0}
                    helperText={(pipe.erosionalConstant ?? 100) < 0 ? "Value cannot be less than 0" : undefined}
                    onChange={(event) => {
                        const value = event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdatePipe(pipe.id, { erosionalConstant: value });
                    }}
                    sx={glassInputSx}
                />
            </Stack>
        </>
    );
}
