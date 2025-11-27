import { type Node } from "@xyflow/react";
import { type NodeProps, type ViewSettings } from "@/lib/types";

type NodeFlowState = {
    role: "source" | "sink" | "middle" | "isolated" | "neutral";
    needsAttention: boolean;
};

interface GetPressureNodeParams {
    node: NodeProps;
    isSelected: boolean;
    viewSettings: ViewSettings;
    nodeFlowStates: Record<string, NodeFlowState>;
    forceLightMode?: boolean;
}

export const getPressureNode = ({
    node,
    isSelected,
    viewSettings,
    nodeFlowStates,
    forceLightMode = false,
}: GetPressureNodeParams): Node => {
    const flowState = nodeFlowStates[node.id] ?? {
        role: "isolated",
        needsAttention: false,
    };
    const labelLines: string[] = [];
    if (viewSettings.node.name) {
        labelLines.push(node.label);
    }
    if (viewSettings.node.pressure && typeof node.pressure === "number") {
        labelLines.push(`${node.pressure.toFixed(2)} ${node.pressureUnit ?? ""}`);
    }
    if (viewSettings.node.temperature && typeof node.temperature === "number") {
        labelLines.push(`${node.temperature.toFixed(2)} ${node.temperatureUnit ?? ""}`);
    }

    return {
        id: node.id,
        type: "pressure",
        position: { ...node.position },
        data: {
            label: node.label,
            labelLines,
            isSelected,
            showPressures: viewSettings.node.pressure, // Keep for backward compatibility if needed
            pressure: node.pressure,
            pressureUnit: node.pressureUnit,
            flowRole: flowState.role,
            needsAttention: flowState.needsAttention,
            forceLightMode,
            rotation: node.rotation,
        },
        width: 20,
        height: 20,
        draggable: true,
        connectable: true,
    };
};
