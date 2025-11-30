import { NodeProps, NodePatch, NetworkState } from "@/lib/types";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, TextField } from "@mui/material";
import { glassInputSx } from "@/lib/glassStyles";
import { Sync } from "@mui/icons-material";
import { convertUnit } from "@/lib/unitConversion";

type Props = {
    node: NodeProps;
    network: NetworkState;
    onUpdateNode: (id: string, patch: NodePatch) => void;
    navigator: Navigator;
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

export function IOSNodeProperties({ node, network, onUpdateNode, navigator }: Props) {

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

        if (!connectedPipe || !connectedPipe.resultSummary) return;

        const state = connectedPipe.endNodeId === node.id
            ? connectedPipe.resultSummary.outletState
            : connectedPipe.resultSummary.inletState;

        if (!state) return;

        const updates: NodePatch = {};

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

        if (Object.keys(updates).length > 0) {
            onUpdateNode(node.id, updates);
        }
    };

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
                <IOSListItem
                    label="Update from Pipe"
                    onClick={handleUpdateFromPipe}
                    icon={<Sync sx={{ fontSize: 20 }} />}
                    textColor="primary.main"
                    last
                />
            </IOSListGroup>
        </Box>
    );
}
