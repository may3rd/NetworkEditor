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
    Tooltip,
    IconButton,
} from "@mui/material";
import { glassInputSx } from "@/lib/glassStyles";
import {
    AutoFixHigh as AutoFixHighIcon,
} from "@mui/icons-material";
import { NetworkState, NodeProps, NodePatch, PipeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { validateNodeConfiguration } from "@/utils/nodeUtils";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../QuantityInput";
import { propagatePressure } from "@/lib/pressurePropagation";
import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";

type Props = {
    node: NodeProps;
    network: NetworkState;
    onUpdateNode: (id: string, patch: NodePatch) => void;
    onNetworkChange?: (network: NetworkState) => void;
};

export function NodeProperties({ node, network, onUpdateNode, onNetworkChange }: Props) {
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

    const validation = validateNodeConfiguration(node, network.pipes);

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
        ): { state: PipeState; pipe: PipeProps } | undefined => {
            let lowest: { pressure: number; state: PipeState; pipe: PipeProps } | null = null;
            for (const pipe of pipes) {
                const state = selector(pipe);
                if (!state || typeof state.pressure !== "number") {
                    continue;
                }
                if (!lowest || state.pressure < lowest.pressure) {
                    lowest = { pressure: state.pressure, state, pipe };
                }
            }
            return lowest ? { state: lowest.state, pipe: lowest.pipe } : undefined;
        };

        const updateFromState = (data?: { state: PipeState; pipe: PipeProps }) => {
            if (!data) {
                return false;
            }
            const { state: pipeState, pipe } = data;
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

            // Copy fluid if missing on node
            if (!node.fluid && pipe.fluid) {
                updates.fluid = { ...pipe.fluid };
            }

            if (Object.keys(updates).length === 0) {
                return false;
            }
            onUpdateNode(node.id, updates);
            return true;
        };

        // If validation specifies a source (e.g. 'backward' for control valve exception), prioritize it
        if (validation.updateSource === 'backward') {
            const sourceState = findLowestState(inboundSourcePipes, (pipe) => pipe.resultSummary?.outletState);
            updateFromState(sourceState);
            return;
        } else if (validation.updateSource === 'forward') {
            const targetState = findLowestState(inboundTargetPipes, (pipe) => pipe.resultSummary?.outletState);
            updateFromState(targetState);
            return;
        }

        const targetState = findLowestState(inboundTargetPipes, (pipe) => pipe.resultSummary?.outletState);
        if (updateFromState(targetState)) {
            return;
        }
        const sourceState = findLowestState(inboundSourcePipes, (pipe) => pipe.resultSummary?.outletState);
        updateFromState(sourceState);
    };

    const handlePropagatePressure = () => {
        if (!onNetworkChange) {
            console.error("onNetworkChange is required for pressure propagation");
            return;
        }

        const result = propagatePressure(node.id, network);

        if (result.warnings.length > 0) {
            alert(`Propagation completed with warnings:\n\n${result.warnings.join("\n")}`);
        }

        // Update the network with all modified nodes and pipes
        const nextNodes = network.nodes.map(n => {
            const updated = result.updatedNodes.find(un => un.id === n.id);
            return updated || n;
        });

        const nextPipes = network.pipes.map(p => {
            const updated = result.updatedPipes.find(up => up.id === p.id);
            return updated || p;
        });

        onNetworkChange({
            ...network,
            nodes: nextNodes,
            pipes: nextPipes
        });
    };

    // Determine if this is a source node (all connected pipes are outgoing)
    const isSourceNode = (() => {
        const connectedPipes = network.pipes.filter(
            (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id
        );
        if (connectedPipes.length === 0) return false; // Isolated node is not a source for propagation

        return connectedPipes.every(pipe => {
            if (pipe.startNodeId === node.id) return pipe.direction === "forward" || !pipe.direction;
            if (pipe.endNodeId === node.id) return pipe.direction === "backward";
            return false;
        });
    })();

    return (
        <Stack spacing={2}>
            <Stack spacing={2}>
                <TextField
                    label="Label"
                    size="small"
                    value={node.label}
                    onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
                    sx={glassInputSx}
                />
            </Stack>
            <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontSize={12}>
                        Conditions
                    </Typography>
                    <Tooltip title={isSourceNode ? "Propagate Pressure Downstream" : (validation.message || "Update from Pipe")}>
                        <span>
                            {isSourceNode ? (
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={handlePropagatePressure}
                                >
                                    <PlayArrowIcon />
                                </IconButton>
                            ) : (
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() => handleUpdateFromPipe(node)}
                                    disabled={!validation.isValid}
                                >
                                    <AutoFixHighIcon />
                                </IconButton>
                            )}
                        </span>
                    </Tooltip>
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

                        sx={glassInputSx}
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
                        <Tooltip title="Auto-generate fluid properties">
                            <IconButton color="primary" size="small" onClick={handleAutoFluid}>
                                <AutoFixHighIcon />
                            </IconButton>
                        </Tooltip>
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

                                sx={glassInputSx}
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

                                sx={glassInputSx}
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

                                sx={glassInputSx}
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
