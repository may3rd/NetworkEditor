import { NodeProps, NodePatch, NetworkState } from "@/lib/types";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, TextField, Typography, useTheme } from "@mui/material";
import { Sync, PlayArrow } from "@mui/icons-material";
import { convertUnit } from "@/lib/unitConversion";
import { propagatePressure } from "@/lib/pressurePropagation";
import { getNodeWarnings } from "@/utils/validationUtils";
import { RefObject } from "react";
import { glassListGroupSx } from "@/lib/glassStyles";

type Props = {
    node: NodeProps;
    network: NetworkState;
    onUpdateNode: (id: string, patch: NodePatch) => void;
    navigator: Navigator;
    containerRef?: RefObject<HTMLDivElement | null>;
    setTitleOpacity?: (o: number) => void;
    onNetworkChange?: (network: NetworkState) => void;
};

import { IOSTextField } from "../ios/IOSTextField";

const NamePage = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <Box sx={{ p: 2 }}>
        <IOSTextField
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClear={() => onChange("")}
            placeholder="Label"
            autoFocus
        />
    </Box>
);

import { PressurePage, TemperaturePage, NodeFluidPage } from "./subPages/NodeSubPages";

export function IOSNodeProperties({ node, network, onUpdateNode, navigator, containerRef, setTitleOpacity, onNetworkChange }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const openNamePage = () => {
        navigator.push("Label", (net: NetworkState, nav: Navigator) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return (
                <NamePage
                    value={currentNode.label || ""}
                    onChange={(v) => onUpdateNode(node.id, { label: v })}
                />
            );
        });
    };

    const openFluidPage = () => {
        navigator.push("Fluid", (net: NetworkState, nav: Navigator) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return <NodeFluidPage node={currentNode} onUpdateNode={onUpdateNode} navigator={nav} />;
        });
    };

    const openPressurePage = () => {
        navigator.push("Pressure", (net: NetworkState, nav: Navigator) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return <PressurePage node={currentNode} onUpdateNode={onUpdateNode} />;
        });
    };

    const openTemperaturePage = () => {
        navigator.push("Temperature", (net: NetworkState, nav: Navigator) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return <TemperaturePage node={currentNode} onUpdateNode={onUpdateNode} />;
        });
    };

    const handleUpdateFromPipe = () => {
        const connectedPipe = network.pipes.find(p => p.endNodeId === node.id) ||
            network.pipes.find(p => p.startNodeId === node.id);

        if (!connectedPipe) return;

        const updates: NodePatch = {};

        // 1. Update Pressure/Temperature from Simulation Results (if available)
        if (connectedPipe.resultSummary) {
            const state = connectedPipe.endNodeId === node.id
                ? connectedPipe.resultSummary.outletState
                : connectedPipe.resultSummary.inletState;

            if (state) {
                if (state.pressure !== undefined) {
                    const targetUnit = node.pressureUnit || "kPa";
                    updates.pressure = convertUnit(state.pressure, "Pa", targetUnit);
                    updates.pressureUnit = targetUnit;
                }

                if (state.temprature !== undefined) {
                    const targetUnit = node.temperatureUnit || "C";
                    updates.temperature = convertUnit(state.temprature, "K", targetUnit);
                    updates.temperatureUnit = targetUnit;
                }
            }
        }

        // 2. Copy Fluid if Node has none
        if (!node.fluid && connectedPipe.fluid) {
            updates.fluid = { ...connectedPipe.fluid };
        }

        if (Object.keys(updates).length > 0) {
            onUpdateNode(node.id, updates);
        }
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

    const getIcon = () => {
        const phase = node.fluid?.phase;
        if (phase === "liquid") {
            return <Typography variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>L</Typography>;
        } else if (phase === "gas") {
            return <Typography variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>G</Typography>;
        } else {
            return <Typography variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>?</Typography>;
        }
    };

    const getIconBgColor = () => {
        const phase = node.fluid?.phase;
        if (phase === "liquid") {
            return "linear-gradient(#00C4F9,#0076F0)";
        } else if (phase === "gas") {
            return "linear-gradient(#FF6B6B,#FF2D2D)";
        } else {
            return "#8E8E93"; // Grey
        }
    };

    return (
        <Box sx={{ mt: "-100px", pt: "100px", pb: "60px" }}>
            {/* Top Summary Section */}
            <Box sx={{
                ...glassListGroupSx,
                px: 2,
                py: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                // backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                borderRadius: "16px",
                mx: 2,
                my: 2,
            }}>
                <Box sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "14px",
                    background: getIconBgColor(),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    boxShadow: "0px 0px 2px 1px rgba(255, 255, 255, 0.3) inset, 2px 2px 3px -2px rgba(255,255,255,0.7) inset, -2px -2px 3px -2px rgba(255,255,255,0.7) inset"
                    // boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}>
                    {getIcon()}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: isDark ? "#fff" : "#000", letterSpacing: "-0.5px" }}>
                    {node.label}
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                    {node.fluid?.id || "No Fluid Defined"}
                </Typography>
                {(() => {
                    const warnings = getNodeWarnings(node, isSourceNode ? "source" : "neutral", network.pipes);
                    if (warnings.length > 0) {
                        return (
                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {warnings.map((w, i) => (
                                    <Typography key={i} variant="caption" sx={{ color: "text.primary", fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            background: "linear-gradient(#FFD60A, #FF9F0A)",
                                            color: "#000",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "11px",
                                            fontWeight: 800,
                                            border: "1px solid",
                                            borderColor: "text.primary",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                                            flexShrink: 0,
                                        }}>
                                            !
                                        </Box>
                                        {w}
                                    </Typography>
                                ))}
                            </Box>
                        );
                    }
                    return null;
                })()}
            </Box>

            <IOSListGroup>
                <IOSListItem
                    label="Label"
                    value={node.label}
                    onClick={openNamePage}
                    chevron
                />
                <IOSListItem
                    label="Fluid"
                    value={node.fluid?.id || "None"}
                    onClick={openFluidPage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup>
                <IOSListItem
                    label="Pressure"
                    value={`${node.pressure?.toFixed(2) ?? "-"} ${node.pressureUnit ?? ""}`}
                    onClick={openPressurePage}
                    chevron
                />
                <IOSListItem
                    label="Temperature"
                    value={`${node.temperature?.toFixed(2) ?? "-"} ${node.temperatureUnit ?? ""}`}
                    onClick={openTemperaturePage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup>
                {isSourceNode ? (
                    <IOSListItem
                        label="Propagate Pressure"
                        onClick={handlePropagatePressure}
                        icon={
                            <Box sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "7px",
                                background: "linear-gradient(#00C4F9,#0076F0)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white"
                            }}>
                                <PlayArrow sx={{ fontSize: 18 }} />
                            </Box>
                        }
                        textColor="primary.main"
                        last
                    />
                ) : (
                    <IOSListItem
                        label="Update from Pipe"
                        onClick={handleUpdateFromPipe}
                        icon={
                            <Box sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "7px",
                                background: "linear-gradient(#00C4F9,#0076F0)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white"
                            }}>
                                <Sync sx={{ fontSize: 18 }} />
                            </Box>
                        }
                        textColor="primary.main"
                        last
                    />
                )}
            </IOSListGroup>
        </Box>
    );
}
