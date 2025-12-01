
// Mock types
const convertUnit = (val, from, to) => val; // Mock conversion

const propagatePressure = (startNodeId, network) => {
    const nodesMap = new Map();
    network.nodes.forEach(node => nodesMap.set(node.id, { ...node }));

    const warnings = [];
    const visited = new Set();
    const queue = [startNodeId];

    // Helper to find connected pipes
    const getOutgoingPipes = (nodeId) => {
        return network.pipes.filter(pipe => {
            const isForward = pipe.startNodeId === nodeId && (pipe.direction === "forward" || !pipe.direction);
            const isBackward = pipe.endNodeId === nodeId && pipe.direction === "backward";
            return isForward || isBackward;
        });
    };

    while (queue.length > 0) {
        const currentNodeId = queue.shift();

        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);

        const currentNode = nodesMap.get(currentNodeId);
        if (!currentNode) continue;

        console.log(`Processing Node: ${currentNode.label} (${currentNode.id})`);

        // Ensure current node has pressure
        if (typeof currentNode.pressure !== "number") {
            warnings.push(`Node ${currentNode.label} has no pressure defined. Propagation stopped for this branch.`);
            continue;
        }

        const outgoingPipes = getOutgoingPipes(currentNodeId);
        console.log(`  Found ${outgoingPipes.length} outgoing pipes`);

        for (const pipe of outgoingPipes) {
            const isForward = pipe.startNodeId === currentNodeId;
            const targetNodeId = isForward ? pipe.endNodeId : pipe.startNodeId;
            const targetNode = nodesMap.get(targetNodeId);

            if (!targetNode) continue;

            console.log(`    Propagating to ${targetNode.label} via ${pipe.name}`);

            // Get pressure drop from pipe results
            const pressureDrop = pipe.pressureDropCalculationResults?.totalSegmentPressureDrop;

            if (typeof pressureDrop !== "number") {
                warnings.push(`Pipe ${pipe.name} (to ${targetNode.label}) has no calculated pressure drop. Propagation stopped for this branch.`);
                continue;
            }

            // Calculate new pressure for target node
            const currentPressurePa = currentNode.pressure; // Mock unit conversion
            const newTargetPressurePa = currentPressurePa - pressureDrop;
            const newTargetPressure = newTargetPressurePa; // Mock unit conversion

            targetNode.pressure = newTargetPressure;

            console.log(`      New Pressure for ${targetNode.label}: ${targetNode.pressure}`);

            // Add target to queue to continue propagation
            if (!visited.has(targetNodeId)) {
                queue.push(targetNodeId);
            }
        }
    }

    return {
        updatedNodes: Array.from(nodesMap.values()),
        warnings
    };
};

// Mock Network
const nodes = [
    { id: "source", position: { x: 0, y: 0 }, pressure: 1000, pressureUnit: "kPag", label: "Source" },
    { id: "node1", position: { x: 100, y: 0 }, pressure: 0, pressureUnit: "kPag", label: "Node 1" },
    { id: "node2", position: { x: 200, y: 0 }, pressure: 0, pressureUnit: "kPag", label: "Node 2" },
];

const pipes = [
    {
        id: "pipe1",
        startNodeId: "source",
        endNodeId: "node1",
        direction: "forward",
        pressureDropCalculationResults: { totalSegmentPressureDrop: 100 },
        name: "Pipe 1"
    },
    {
        id: "pipe2",
        startNodeId: "node1",
        endNodeId: "node2",
        direction: "forward",
        pressureDropCalculationResults: { totalSegmentPressureDrop: 50 },
        name: "Pipe 2"
    }
];

const network = { nodes, pipes };

console.log("Starting Propagation...");
const result = propagatePressure("source", network);
console.log("Done.");
