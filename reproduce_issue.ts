
import { propagatePressure } from "./src/lib/pressurePropagation.ts";
import { NetworkState, NodeProps, PipeProps } from "./src/lib/types.ts";

// Mock Network
const nodes: NodeProps[] = [
    { id: "source", position: { x: 0, y: 0 }, pressure: 1000, pressureUnit: "kPag", label: "Source" },
    { id: "node1", position: { x: 100, y: 0 }, pressure: 0, pressureUnit: "kPag", label: "Node 1" },
    { id: "node2", position: { x: 200, y: 0 }, pressure: 0, pressureUnit: "kPag", label: "Node 2" },
];

const pipes: PipeProps[] = [
    {
        id: "pipe1",
        startNodeId: "source",
        endNodeId: "node1",
        direction: "forward",
        pressureDropCalculationResults: { totalSegmentPressureDrop: 100000 }, // 100 kPa drop
        name: "Pipe 1"
    },
    {
        id: "pipe2",
        startNodeId: "node1",
        endNodeId: "node2",
        direction: "forward",
        pressureDropCalculationResults: { totalSegmentPressureDrop: 50000 }, // 50 kPa drop
        name: "Pipe 2"
    }
];

const network: NetworkState = { nodes, pipes };

console.log("Initial State:");
console.log("Source Pressure:", nodes[0].pressure);
console.log("Node 1 Pressure:", nodes[1].pressure);
console.log("Node 2 Pressure:", nodes[2].pressure);

const result = propagatePressure("source", network);

console.log("\nPropagation Result:");
result.updatedNodes.forEach(node => {
    console.log(`${node.label}: ${node.pressure} ${node.pressureUnit}`);
});

console.log("\nWarnings:", result.warnings);
