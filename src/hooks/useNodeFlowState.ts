import { useMemo } from "react";
import { NodeProps, PipeProps, NodeFlowRole, NodeFlowState } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { validateNodeConfiguration } from "@/utils/nodeUtils";
import { getNodeWarnings } from "@/utils/validationUtils";

export function useNodeFlowState(nodes: NodeProps[], pipes: PipeProps[]) {
    const nodeFlowStates = useMemo<Record<string, NodeFlowState>>(() => {
        const PRESSURE_TOLERANCE = 0.001;
        const connectionMap = new Map<
            string,
            { asSource: PipeProps[]; asTarget: PipeProps[] }
        >();

        nodes.forEach(node => {
            connectionMap.set(node.id, { asSource: [], asTarget: [] });
        });

        pipes.forEach(pipe => {
            connectionMap.get(pipe.startNodeId)?.asSource.push(pipe);
            connectionMap.get(pipe.endNodeId)?.asTarget.push(pipe);
        });

        const normalizeDirection = (pipe: PipeProps) =>
            pipe.direction === "backward" ? "backward" : "forward";

        const states: Record<string, NodeFlowState> = {};

        nodes.forEach(node => {
            const connectionEntry = connectionMap.get(node.id);
            const asSource = connectionEntry?.asSource ?? [];
            const asTarget = connectionEntry?.asTarget ?? [];
            const totalConnections = asSource.length + asTarget.length;
            const isIsolated = totalConnections === 0;

            const sourceDirections = asSource.map(normalizeDirection);
            const targetDirections = asTarget.map(normalizeDirection);

            const allSourceForward =
                asSource.length === 0 || sourceDirections.every(direction => direction === "forward");
            const allSourceBackward =
                asSource.length === 0 || sourceDirections.every(direction => direction === "backward");
            const anySourceBackward = sourceDirections.some(direction => direction === "backward");

            const allTargetForward =
                asTarget.length === 0 || targetDirections.every(direction => direction === "forward");
            const allTargetBackward =
                asTarget.length === 0 || targetDirections.every(direction => direction === "backward");
            const anyTargetForward = targetDirections.some(direction => direction === "forward");

            const incomingPipelineForward = asTarget.some(p => p.pipeSectionType === 'pipeline' && normalizeDirection(p) === 'forward');
            const connectedToControlValve = [...asSource, ...asTarget].some(p => p.pipeSectionType === 'control valve');

            const targetControlValve = asTarget.some(p => p.pipeSectionType === 'control valve');
            const sourcePipelineBackward = asSource.some(p => p.pipeSectionType === 'pipeline' && normalizeDirection(p) === 'backward');

            let role: NodeFlowRole = "neutral";
            if (isIsolated) {
                role = "isolated";
            } else if ((incomingPipelineForward && connectedToControlValve) || (targetControlValve && sourcePipelineBackward)) {
                role = "sink";
            } else if (allSourceForward && allTargetBackward) {
                role = "source";
            } else if (allSourceBackward && allTargetForward) {
                role = "sink";
            } else if (anySourceBackward || anyTargetForward) {
                role = "middle";
            }

            const validation = validateNodeConfiguration(node, pipes);
            const warnings = getNodeWarnings(node, role, pipes);
            const needsAttention = warnings.length > 0 || !validation.isValid;

            // Debug logging
            if (needsAttention) {
                console.log(`Node ${node.label} (${node.id}) needs attention:`, { warnings, invalidConfig: !validation.isValid });
            }

            if (!validation.isValid) {
                role = "isolated";
            }

            states[node.id] = { role, needsAttention };
        });

        return states;
    }, [nodes, pipes]);

    return nodeFlowStates;
}
