import { type Node } from "@xyflow/react";
import { type NodeProps, type ViewSettings } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

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
    displayPressureUnit?: string;
}

export const getPressureNode = ({
    node,
    isSelected,
    viewSettings,
    nodeFlowStates,
    forceLightMode = false,
    displayPressureUnit,
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
        const convertedPressure = convertUnit(node.pressure, node.pressureUnit, displayPressureUnit || node.pressureUnit);
        labelLines.push(`${convertedPressure.toFixed(2)} ${displayPressureUnit || node.pressureUnit || ""}`);
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
            displayPressureUnit,
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

import { type PipeProps } from "@/lib/types";

export type NodeValidationResult = {
    isValid: boolean;
    message?: string;
    updateSource?: 'backward' | 'forward' | 'any';
};

export const validateNodeConfiguration = (
    node: NodeProps,
    pipes: PipeProps[]
): NodeValidationResult => {
    const connectedPipes = pipes.filter(
        (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id
    );

    const targetPipes = connectedPipes.filter((pipe) => pipe.endNodeId === node.id);
    const sourcePipes = connectedPipes.filter((pipe) => pipe.startNodeId === node.id);

    const normalizeDirection = (pipe: PipeProps) =>
        pipe.direction === "backward" ? "backward" : "forward";

    // Pipes flowing INTO the node
    const incomingForward = targetPipes.filter(
        (pipe) => normalizeDirection(pipe) === "forward"
    );
    const incomingBackward = sourcePipes.filter(
        (pipe) => normalizeDirection(pipe) === "backward"
    );

    // Check for invalid middle node configuration:
    // Forward pipe connected to target handle AND Backward pipe connected to source handle
    if (incomingForward.length > 0 && incomingBackward.length > 0) {
        // Exception: If the forward pipe connected to target handle is a control valve
        const hasControlValveException = incomingForward.some(
            pipe => pipe.pipeSectionType === "control valve"
        );

        if (hasControlValveException) {
            return {
                isValid: true,
                updateSource: 'backward' // Allow update from backward pipe
            };
        }

        return {
            isValid: false,
            message: "Invalid configuration: Node has conflicting flow directions (Forward in, Backward in).",
            updateSource: undefined
        };
    }

    return {
        isValid: true,
        updateSource: 'any'
    };
};
