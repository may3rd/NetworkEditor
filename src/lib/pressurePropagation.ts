import { NetworkState, NodeProps, PipeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

import { recalculatePipeFittingLosses } from "./fittings";

type PropagationResult = {
    updatedNodes: NodeProps[];
    updatedPipes: PipeProps[];
    warnings: string[];
};

export const propagatePressure = (
    startNodeId: string,
    network: NetworkState
): PropagationResult => {
    const nodesMap = new Map<string, NodeProps>();
    network.nodes.forEach(node => nodesMap.set(node.id, { ...node }));

    const warnings: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    // Helper to find connected pipes
    const getOutgoingPipes = (nodeId: string) => {
        return network.pipes.filter(pipe => {
            const isForward = pipe.startNodeId === nodeId && (pipe.direction === "forward" || !pipe.direction);
            const isBackward = pipe.endNodeId === nodeId && pipe.direction === "backward";
            return isForward || isBackward;
        });
    };

    const updatedPipesMap = new Map<string, PipeProps>();

    // console.log("Starting pressure propagation from:", startNodeId);

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        // console.log("Processing node:", currentNodeId);

        if (visited.has(currentNodeId)) {
            // console.log("Already visited:", currentNodeId);
            continue;
        }
        visited.add(currentNodeId);

        const currentNode = nodesMap.get(currentNodeId);
        if (!currentNode) {
            // console.log("Node not found in map:", currentNodeId);
            continue;
        }

        // Ensure current node has pressure
        if (typeof currentNode.pressure !== "number") {
            warnings.push(`Node ${currentNode.label} has no pressure defined. Propagation stopped for this branch.`);
            // console.log("Node has no pressure:", currentNodeId);
            continue;
        }

        const outgoingPipes = getOutgoingPipes(currentNodeId);
        // console.log(`Found ${outgoingPipes.length} outgoing pipes for ${currentNodeId}`);

        for (const pipe of outgoingPipes) {
            // Update pipe boundary conditions to match the current node (inlet)
            let updatedPipe = { ...pipe };
            updatedPipe.boundaryPressure = currentNode.pressure;
            updatedPipe.boundaryPressureUnit = currentNode.pressureUnit;
            updatedPipe.boundaryTemperature = currentNode.temperature;
            updatedPipe.boundaryTemperatureUnit = currentNode.temperatureUnit;

            // Recalculate pipe physics with new boundary conditions
            updatedPipe = recalculatePipeFittingLosses(updatedPipe);

            updatedPipesMap.set(updatedPipe.id, updatedPipe);

            const isForward = pipe.startNodeId === currentNodeId;
            const targetNodeId = isForward ? pipe.endNodeId : pipe.startNodeId;
            const targetNode = nodesMap.get(targetNodeId);

            if (!targetNode) {
                // console.log("Target node not found:", targetNodeId);
                continue;
            }

            // Get pressure drop from pipe results
            // We expect the pipe to have been calculated already
            let pressureDrop = updatedPipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

            if (typeof pressureDrop !== "number") {
                warnings.push(`Pipe ${pipe.name} (to ${targetNode.label}) has no calculated pressure drop. Assuming 0 drop.`);
                // console.log(`Pipe ${pipe.name} has no pressure drop. Using 0.`);
                pressureDrop = 0;
            }

            // console.log(`Propagating to ${targetNode.label} via ${pipe.name}. Drop: ${pressureDrop}`);

            // Calculate new pressure for target node
            // Pressure Drop is always positive in flow direction
            // P_downstream = P_upstream - PressureDrop

            // Convert current node pressure to Pa
            const currentPressurePa = convertUnit(
                currentNode.pressure,
                currentNode.pressureUnit || "kPag",
                "Pa"
            );

            const newTargetPressurePa = currentPressurePa - pressureDrop;

            // Update target node
            // Convert back to target node's unit (or default to kPag if not set)
            const targetUnit = targetNode.pressureUnit || "kPag";
            const newTargetPressure = convertUnit(
                newTargetPressurePa,
                "Pa",
                targetUnit
            );

            targetNode.pressure = newTargetPressure;
            targetNode.pressureUnit = targetUnit;

            // Also propagate temperature
            // 1. Try to get from pipe results (outletState)
            // 2. Fallback: Isothermal (use current node's temperature)
            const outletState = updatedPipe.resultSummary?.outletState;

            if (outletState && typeof outletState.temprature === "number") {
                const newTargetTemp = convertUnit(
                    outletState.temprature,
                    "K",
                    targetNode.temperatureUnit || "C"
                );
                targetNode.temperature = newTargetTemp;
                targetNode.temperatureUnit = targetNode.temperatureUnit || "C";
            } else if (typeof currentNode.temperature === "number") {
                // Fallback: Isothermal propagation
                // Convert current node temp to target node unit
                const currentTempK = convertUnit(
                    currentNode.temperature,
                    currentNode.temperatureUnit || "C",
                    "K"
                );
                const newTargetTemp = convertUnit(
                    currentTempK,
                    "K",
                    targetNode.temperatureUnit || "C"
                );
                targetNode.temperature = newTargetTemp;
                targetNode.temperatureUnit = targetNode.temperatureUnit || "C";
            }

            // Add target to queue to continue propagation
            if (!visited.has(targetNodeId)) {
                // console.log("Adding target to queue:", targetNodeId);
                queue.push(targetNodeId);
            } else {
                // console.log("Target already visited:", targetNodeId);
            }
        }
    }

    return {
        updatedNodes: Array.from(nodesMap.values()),
        updatedPipes: Array.from(updatedPipesMap.values()),
        warnings
    };
};
