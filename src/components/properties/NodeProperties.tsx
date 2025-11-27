import {
    Button,
    TextField,
    Radio,
    RadioGroup,
    Stack,
    FormControlLabel,
    FormControl,
    FormLabel,
    Typography,
    Switch,
} from "@mui/material";
import { NetworkState, NodeProps, NodePatch, PipeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";

type Props = {
    node: NodeProps;
    network: NetworkState;
    onUpdateNode: (id: string, patch: NodePatch) => void;
};

export function NodeProperties({ node, network, onUpdateNode }: Props) {
    const nodeFluidPhase = node.fluid?.phase ?? "liquid";

    const handleAutoFluid = () => {
        const connectedPipes = network.pipes.filter(
            (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id,
        );

        const targetPipes = connectedPipes.filter((pipe) => pipe.endNodeId === node.id);
        const sourcePipes = connectedPipes.filter((pipe) => pipe.startNodeId === node.id);
        const normalizeDirection = (pipe: PipeProps) =>
            pipe.direction === "backward" ? "backward" : "forward";
        const inboundTargetPipes = targetPipes.filter(
            (pipe) => normalizeDirection(pipe) === "forward",
        );
        const inboundSourcePipes = sourcePipes.filter(
            (pipe) => normalizeDirection(pipe) === "backward",
        );

        const inboundPipes = [...inboundTargetPipes, ...inboundSourcePipes];

        // Prioritize inbound pipes, otherwise fallback to any connected pipe (e.g. for source nodes)
        let pipeToCopyFrom = inboundPipes[0];
        if (!pipeToCopyFrom && connectedPipes.length > 0) {
            pipeToCopyFrom = connectedPipes[0];
        }

        if (pipeToCopyFrom && pipeToCopyFrom.fluid) {
            onUpdateNode(node.id, { fluid: { ...pipeToCopyFrom.fluid } });
        } else {
            alert("No fluid properties found in connected pipes.");
        }
    };

    const handleUpdateFromPipe = (node: NodeProps) => {
        const connectedPipes = network.pipes.filter(
            (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id,
        );

        const targetPipes = connectedPipes.filter((pipe) => pipe.endNodeId === node.id);
        const sourcePipes = connectedPipes.filter((pipe) => pipe.startNodeId === node.id);
        const normalizeDirection = (pipe: PipeProps) =>
            pipe.direction === "backward" ? "backward" : "forward";
        const inboundTargetPipes = targetPipes.filter(
            (pipe) => normalizeDirection(pipe) === "forward",
        );
        const inboundSourcePipes = sourcePipes.filter(
            (pipe) => normalizeDirection(pipe) === "backward",
        );

        type PipeState = NonNullable<NonNullable<PipeProps["resultSummary"]>["inletState"]>;

        const findLowestState = (
            pipes: PipeProps[],
            selector: (pipe: PipeProps) => PipeState | undefined,
        ): PipeState | undefined => {
            let lowest: { pressure: number; state: PipeState } | null = null;
            for (const pipe of pipes) {
                const state = selector(pipe);
                if (!state || typeof state.pressure !== "number") {
                    continue;
                }
                if (!lowest || state.pressure < lowest.pressure) {
                    lowest = { pressure: state.pressure, state };
                }
            }
            return lowest?.state;
        };

        const updateFromState = (pipeState?: PipeState) => {
            if (!pipeState) {
                return false;
            }
            const updates: Partial<NodeProps> = {};
            if (typeof pipeState.pressure === "number") {
                updates.pressure = convertUnit(
                    pipeState.pressure,
                    "Pa",
                    node.pressureUnit ?? "kPag",
                );
                updates.pressureUnit = node.pressureUnit ?? "kPag";
            }
            if (typeof pipeState.temprature === "number") {
                updates.temperature = convertUnit(
                    pipeState.temprature,
                    "K",
                    node.temperatureUnit ?? "C",
                );
                updates.temperatureUnit = node.temperatureUnit ?? "C";
            }
            if (Object.keys(updates).length === 0) {
                return false;
            }
            onUpdateNode(node.id, updates);
            return true;
        };

        const targetState = findLowestState(inboundTargetPipes, (pipe) => pipe.resultSummary?.outletState);
        if (updateFromState(targetState)) {
            return;
        }
        const sourceState = findLowestState(inboundSourcePipes, (pipe) => pipe.resultSummary?.inletState);
        updateFromState(sourceState);
    };

    return (
        <Stack spacing={2}>
            <Stack spacing={2}>
                <TextField
                    label="Label"
                    size="small"
                    value={node.label}
                    onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
                />
            </Stack>
            <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontSize={12}>
                        Conditions
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleUpdateFromPipe(node)}
                    >
                        Update from Pipe
                    </Button>
                </Stack>
                <QuantityInput
                    label="Temperature"
                    value={node.temperature ?? ""}
                    unit={node.temperatureUnit ?? "C"}
                    units={QUANTITY_UNIT_OPTIONS.temperature}
                    unitFamily="temperature"
                    onValueChange={(newValue) => onUpdateNode(node.id, {
                        temperature: newValue,
                        ...(node.temperatureUnit === undefined && { temperatureUnit: "C" })
                    })}
                    onUnitChange={(newUnit) => onUpdateNode(node.id, { temperatureUnit: newUnit })}
                    decimalPlaces={4}
                    min={0}
                    minUnit="K"
                />

                <QuantityInput
                    label="Pressure"
                    value={node.pressure ?? ""}
                    unit={node.pressureUnit ?? "kPag"}
                    units={QUANTITY_UNIT_OPTIONS.pressure}
                    unitFamily="pressure"
                    onValueChange={(newValue) => onUpdateNode(node.id, {
                        pressure: newValue,
                        ...(node.pressureUnit === undefined && { pressureUnit: "kPag" })
                    })}
                    onUnitChange={(newUnit) => onUpdateNode(node.id, { pressureUnit: newUnit })}
                    decimalPlaces={4}
                    min={0}
                    minUnit="Pa"
                />
            </Stack>

            <Stack spacing={2}>
                <Stack spacing={2}>
                    <Typography fontSize={12}>
                        Fluid
                    </Typography>
                    <TextField
                        label="Name"
                        size="small"
                        value={node.fluid?.id ?? ""}
                        onChange={(event) =>
                            onUpdateNode(node.id, (current) => ({
                                fluid: {
                                    ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                    id: event.target.value,
                                },
                            }))
                        }
                    />
                </Stack>

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
                    <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Fluid Phase</FormLabel>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <RadioGroup
                            value={nodeFluidPhase}
                            onChange={(event) =>
                                onUpdateNode(node.id, current => ({
                                    fluid: {
                                        ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                        phase: event.target.value as "liquid" | "gas",
                                    },
                                }))
                            }
                        >
                            <Stack direction="row">
                                <FormControlLabel value="liquid" control={<Radio size="small" />} label="Liquid" />
                                <FormControlLabel value="gas" control={<Radio size="small" />} label="Gas" />
                            </Stack>
                        </RadioGroup>
                        <Button variant="contained" size="small" onClick={handleAutoFluid}>Auto</Button>
                    </Stack>
                </FormControl>

                {nodeFluidPhase !== "gas" && (
                    <QuantityInput
                        label="Liquid Density"
                        value={node.fluid?.density ?? ""}
                        unit={node.fluid?.densityUnit ?? "kg/m3"}
                        units={QUANTITY_UNIT_OPTIONS.density}
                        unitFamily="density"
                        onValueChange={(newValue) =>
                            onUpdateNode(node.id, (current) => ({
                                fluid: {
                                    ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                    density: newValue,
                                },
                            }))
                        }
                        onUnitChange={(newUnit) =>
                            onUpdateNode(node.id, (current) => ({
                                fluid: {
                                    ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                    densityUnit: newUnit,
                                },
                            }))
                        }
                        min={0}
                        minUnit="kg/m3"
                    />
                )}
                {nodeFluidPhase === "gas" && (
                    <Stack spacing={2}>
                        <Stack spacing={2}>
                            <TextField
                                label="Gas Molecular Weight"
                                size="small"
                                type="number"
                                value={node.fluid?.molecularWeight ?? ""}
                                error={(node.fluid?.molecularWeight ?? 0) < 0}
                                helperText={(node.fluid?.molecularWeight ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                                onChange={(event) => {
                                    const value =
                                        event.target.value === "" ? undefined : Number(event.target.value);
                                    onUpdateNode(node.id, (current) => ({
                                        fluid: {
                                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                            molecularWeight: value,
                                        },
                                    }));
                                }}
                            />
                        </Stack>

                        <Stack spacing={2}>
                            <TextField
                                label="Z Factor"
                                size="small"
                                type="number"
                                value={node.fluid?.zFactor ?? ""}
                                error={(node.fluid?.zFactor ?? 0) < 0}
                                helperText={(node.fluid?.zFactor ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                                onChange={(event) => {
                                    const value =
                                        event.target.value === "" ? undefined : Number(event.target.value);
                                    onUpdateNode(node.id, (current) => ({
                                        fluid: {
                                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                            zFactor: value,
                                        },
                                    }));
                                }}
                            />
                        </Stack>

                        <Stack spacing={2}>
                            <TextField
                                label="Specific Heat Ratio"
                                size="small"
                                type="number"
                                value={node.fluid?.specificHeatRatio ?? ""}
                                error={(node.fluid?.specificHeatRatio ?? 0) < 0}
                                helperText={(node.fluid?.specificHeatRatio ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                                onChange={(event) => {
                                    const value =
                                        event.target.value === "" ? undefined : Number(event.target.value);
                                    onUpdateNode(node.id, (current) => ({
                                        fluid: {
                                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                            specificHeatRatio: value,
                                        },
                                    }));
                                }}
                            />
                        </Stack>
                    </Stack>
                )}

                <QuantityInput
                    label="Viscosity"
                    value={node.fluid?.viscosity ?? ""}
                    unit={node.fluid?.viscosityUnit ?? "cP"}
                    units={QUANTITY_UNIT_OPTIONS.viscosity}
                    unitFamily="viscosity"
                    onValueChange={(newValue) =>
                        onUpdateNode(node.id, current => ({
                            fluid: {
                                ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                viscosity: newValue,
                            },
                        }))
                    }
                    onUnitChange={(newUnit) =>
                        onUpdateNode(node.id, current => ({
                            fluid: {
                                ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                                viscosityUnit: newUnit,
                            },
                        }))
                    }
                />

            </Stack>

        </Stack>
    );
}
