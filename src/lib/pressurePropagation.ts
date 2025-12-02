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

            const isForward = pipe.startNodeId === currentNodeId;
            const targetNodeId = isForward ? pipe.endNodeId : pipe.startNodeId;
            const targetNode = nodesMap.get(targetNodeId);

            if (!targetNode) {
                // console.log("Target node not found:", targetNodeId);
                continue;
            }

            // Scenario 1: Pipe without Length (Target Pressure Unknown)
            // If pipe is not a special component (CV/Orifice) and has no length, and target has no pressure -> Stop & Error
            const isSpecialComponent = pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice";
            if (!isSpecialComponent && (!updatedPipe.length || updatedPipe.length <= 0)) {
                if (typeof targetNode.pressure !== "number") {
                    warnings.push(`Pipe ${pipe.name}: Missing length and target node has no pressure. Propagation stopped.`);
                    continue;
                }
            }

            // Scenario 2: Pipe without Length (Target Pressure Known)
            // Estimate length if missing and target pressure is known
            if (targetNode && typeof targetNode.pressure === "number" && !isSpecialComponent && (!updatedPipe.length || updatedPipe.length <= 0)) {
                const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");

                // Pressure drop needed (must be positive for flow)
                const targetDeltaP = p1 - p2;

                if (targetDeltaP <= 0) {
                    // Impossible flow condition for estimation
                    warnings.push(`Pipe ${pipe.name}: Cannot estimate length. Upstream pressure (${p1.toFixed(0)} Pa) is less than or equal to downstream (${p2.toFixed(0)} Pa). Propagation stopped to avoid overwriting target.`);
                    continue;
                }

                // Create temp pipe with 1m length to find gradient
                let tempPipe: PipeProps = { ...updatedPipe, length: 1, lengthUnit: "m" };

                // Inject fluid if missing
                if (!tempPipe.fluid && currentNode.fluid) {
                    tempPipe.fluid = { ...currentNode.fluid };
                }

                tempPipe = recalculatePipeFittingLosses(tempPipe);

                const gradient = tempPipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

                if (gradient && gradient > 0) {
                    const estimatedLength = targetDeltaP / gradient;
                    updatedPipe.length = estimatedLength;
                    updatedPipe.lengthUnit = "m";
                    warnings.push(`Pipe ${pipe.name}: Estimated length to be ${estimatedLength.toFixed(2)}m based on target pressure.`);
                }
            }

            // Scenario 4: Control Valve / Orifice & Known Target Pressure
            // Back-calculate dP if target pressure is known
            if (isSpecialComponent && targetNode && typeof targetNode.pressure === "number") {
                const p1 = convertUnit(currentNode.pressure, currentNode.pressureUnit || "kPag", "Pa");
                const p2 = convertUnit(targetNode.pressure, targetNode.pressureUnit || "kPag", "Pa");
                const reqDrop = p1 - p2;

                if (reqDrop < 0) {
                    warnings.push(`Component ${pipe.name}: Impossible flow. Upstream pressure is lower than target pressure. Propagation stopped.`);
                    continue;
                }

                // Force update the component to match the required drop
                if (updatedPipe.pipeSectionType === "control valve" && updatedPipe.controlValve) {
                    // Check if we need to update (allow some tolerance)
                    const currentDropPa = convertUnit(updatedPipe.controlValve.pressureDrop || 0, updatedPipe.controlValve.pressureDropUnit || "kPa", "Pa");
                    if (Math.abs(currentDropPa - reqDrop) > 100) { // 100 Pa tolerance
                        updatedPipe.controlValve = {
                            ...updatedPipe.controlValve,
                            pressureDrop: reqDrop,
                            pressureDropUnit: "Pa",
                            inputMode: "pressure_drop" // Force mode to calculate Cv from dP
                        };
                        warnings.push(`Component ${pipe.name}: Adjusted pressure drop to ${(reqDrop / 1000).toFixed(2)} kPa to match target node pressure.`);
                    }
                } else if (updatedPipe.pipeSectionType === "orifice" && updatedPipe.orifice) {
                    const currentDropPa = convertUnit(updatedPipe.orifice.pressureDrop || 0, updatedPipe.orifice.pressureDropUnit || "kPa", "Pa");
                    if (Math.abs(currentDropPa - reqDrop) > 100) {
                        updatedPipe.orifice = {
                            ...updatedPipe.orifice,
                            pressureDrop: reqDrop,
                            pressureDropUnit: "Pa",
                            inputMode: "pressure_drop"
                        };
                        warnings.push(`Component ${pipe.name}: Adjusted pressure drop to ${(reqDrop / 1000).toFixed(2)} kPa to match target node pressure.`);
                    }
                }
            }

            // Recalculate pipe physics with new boundary conditions (and potentially new length)
            updatedPipe = recalculatePipeFittingLosses(updatedPipe);

            updatedPipesMap.set(updatedPipe.id, updatedPipe);

            // Get pressure drop from pipe results
            // We expect the pipe to have been calculated already
            let pressureDrop = updatedPipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

            if (typeof pressureDrop !== "number") {
                warnings.push(`Pipe ${pipe.name} (to ${targetNode.label}) has no calculated pressure drop. Assuming 0 drop.`);
                // console.log(`Pipe ${pipe.name} has no pressure drop. Using 0.`);
                pressureDrop = 0;
            }

            // Scenario 3: Pressure Drop > Inlet Pressure
            const currentPressurePa = convertUnit(
                currentNode.pressure,
                currentNode.pressureUnit || "kPag",
                "Pa"
            );

            if (pressureDrop > currentPressurePa) {
                warnings.push(`Pipe ${pipe.name}: Pressure drop (${(pressureDrop / 1000).toFixed(2)} kPa) exceeds inlet pressure (${(currentPressurePa / 1000).toFixed(2)} kPa). Propagation stopped to avoid negative pressure.`);
                continue;
            }

            // console.log(`Propagating to ${targetNode.label} via ${pipe.name}. Drop: ${pressureDrop}`);

            // Calculate new pressure for target node
            // Pressure Drop is always positive in flow direction
            // P_downstream = P_upstream - PressureDrop

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
