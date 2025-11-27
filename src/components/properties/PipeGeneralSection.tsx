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
} from "@mui/material";
import { useState, useEffect } from "react";
import { PipeProps, PipePatch, NodeProps } from "@/lib/types";

type Props = {
    pipe: PipeProps;
    pipes: PipeProps[];
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeGeneralSection({ pipe, pipes, startNode, endNode, onUpdatePipe }: Props) {
    const [localLabel, setLocalLabel] = useState(pipe.name ?? "");

    useEffect(() => {
        setLocalLabel(pipe.name ?? "");
    }, [pipe.id, pipe.name]);

    const pipeHelperText = () => {
        if (!pipe) {
            return "Unknown";
        }

        if (pipe.pipeSectionType === "pipeline") {
            const length = pipe.length || 0;
            const lengthUnit = pipe.lengthUnit || "m";
            return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (${length.toFixed(2)} ${lengthUnit})`;
        } else if (pipe.pipeSectionType === "control valve") {
            return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (control valve)`;
        } else {
            return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (orifice)`;
        }
    };

    const isDuplicateLabel = (label: string) => {
        return pipes.some(p => p.id !== pipe.id && p.name === label);
    };

    const handleCommit = () => {
        if (localLabel === pipe.name) return; // No change

        if (isDuplicateLabel(localLabel)) {
            // Revert to old label if duplicate
            setLocalLabel(pipe.name ?? "");
            // Optional: You could show a snackbar or alert here if needed, 
            // but the requirement is just "return to old name".
        } else {
            // Update if valid
            onUpdatePipe(pipe.id, { name: localLabel });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleCommit();
            (e.target as HTMLElement).blur(); // Remove focus
        }
    };

    return (
        <Stack spacing={2}>
            <Stack spacing={2}>
                <TextField
                    label="Name"
                    size="small"
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={handleKeyDown}
                    error={isDuplicateLabel(localLabel)}
                    helperText={isDuplicateLabel(localLabel) ? "Name already exists" : undefined}
                    placeholder="Enter name"
                    fullWidth
                />

                <TextField
                    label="Description"
                    size="small"
                    value={pipe.description ?? ""}
                    onChange={(e) => onUpdatePipe(pipe.id, { description: e.target.value })}
                    placeholder="Enter description"
                    helperText={pipeHelperText()}
                    fullWidth
                />
            </Stack>

            <FormControl size="small" fullWidth>
                <InputLabel>Calculation Type</InputLabel>
                <Select
                    label="Calculation Type"
                    value={pipe.pipeSectionType ?? "pipeline"}
                    onChange={(event) => onUpdatePipe(pipe.id, { pipeSectionType: event.target.value as "pipeline" | "control valve" | "orifice" })}
                >
                    <MenuItem value="pipeline">Pipeline</MenuItem>
                    <MenuItem value="control valve">Control Valve</MenuItem>
                    <MenuItem value="orifice">Orifice</MenuItem>
                </Select>
            </FormControl>

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
                <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Pressure Drop Direction</FormLabel>
                <RadioGroup
                    value={pipe.direction ?? "forward"}
                    onChange={(event) => {
                        const nextDirection = event.target.value as "forward" | "backward";
                        const boundaryNode = nextDirection === "forward" ? startNode : endNode;

                        onUpdatePipe(pipe.id, {
                            direction: nextDirection,
                            boundaryPressure: boundaryNode?.pressure,
                            boundaryPressureUnit: boundaryNode?.pressureUnit,
                            boundaryTemperature: boundaryNode?.temperature,
                            boundaryTemperatureUnit: boundaryNode?.temperatureUnit,
                            ...(nextDirection === "backward" && boundaryNode?.fluid
                                ? { fluid: { ...boundaryNode.fluid } }
                                : {}),
                        });
                    }}
                >
                    <Stack direction="row">
                        <FormControlLabel value="forward" control={<Radio size="small" />} label="Forward" />
                        <FormControlLabel value="backward" control={<Radio size="small" />} label="Backward" />
                    </Stack>
                </RadioGroup>
            </FormControl>
        </Stack>
    );
}
