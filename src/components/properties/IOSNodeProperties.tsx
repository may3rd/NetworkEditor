import { NodeProps, NodePatch, NetworkState } from "@/lib/types";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, TextField } from "@mui/material";
import { Sync, PlayArrow } from "@mui/icons-material";
import { convertUnit } from "@/lib/unitConversion";
import { propagatePressure } from "@/lib/pressurePropagation";
import { RefObject } from "react";

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

import { PressurePage, TemperaturePage, NodeFluidPage } from "./ios/NodeSubPages";

export function IOSNodeProperties({ node, network, onUpdateNode, navigator, containerRef, setTitleOpacity, onNetworkChange }: Props) {

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

    const openFluidPage = () => {
        navigator.push("Fluid", (net: NetworkState, nav: Navigator) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            return <NodeFluidPage node={currentNode} onUpdateNode={onUpdateNode} navigator={nav} />;
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

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="General">
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

            <IOSListGroup header="State">
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
                        icon={<PlayArrow sx={{ fontSize: 20 }} />}
                        textColor="primary.main"
                        last
                    />
                ) : (
                    <IOSListItem
                        label="Update from Pipe"
                        onClick={handleUpdateFromPipe}
                        icon={<Sync sx={{ fontSize: 20 }} />}
                        textColor="primary.main"
                        last
                    />
                )}
            </IOSListGroup>
        </Box>
    );
}
