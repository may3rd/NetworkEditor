import { NodeProps, PipeProps, NodeFlowRole } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

export const getPipeWarnings = (pipe: PipeProps): string[] => {
    const warnings: string[] = [];

    if (pipe.massFlowRate === undefined && pipe.designMassFlowRate === undefined) {
        warnings.push("Mass flow rate missing");
    }

    if (!pipe.diameter && !pipe.pipeNPD) {
        warnings.push("Diameter missing");
    }

    if (!pipe.length && pipe.pipeSectionType !== "control valve" && pipe.pipeSectionType !== "orifice") {
        warnings.push("Length is 0 or missing");
    }

    const elevation = convertUnit(pipe.elevation || 0, pipe.elevationUnit || "m", "m");
    const length = convertUnit(pipe.length || 0, pipe.lengthUnit || "m", "m");

    if (Math.abs(elevation) > length) {
        warnings.push("Elevation change > Length");
    }

    if (!pipe.fluid) {
        warnings.push("Fluid properties missing");
    }

    return warnings;
};

export const getNodeWarnings = (node: NodeProps, role: NodeFlowRole, pipes: PipeProps[] = []): string[] => {
    const warnings: string[] = [];

    // Check for missing fluid properties
    if (!node.fluid) {
        warnings.push("Fluid properties missing");
    } else {
        if (!node.fluid.id) warnings.push("Fluid ID missing");
        if (!node.fluid.phase) warnings.push("Fluid phase missing");
        // Add more specific fluid property checks if needed
    }

    if (node.pressure === undefined) {
        warnings.push("Pressure not set");
    }

    if (role === "source") {
        if (node.temperature === undefined) warnings.push("Temperature missing");
    }

    // Pressure mismatch check
    if (node.pressure !== undefined) {
        const connectedPipes = pipes.filter(p => p.startNodeId === node.id || p.endNodeId === node.id);
        for (const pipe of connectedPipes) {
            // Check inlet pressure for outgoing pipes (startNode)
            if (pipe.startNodeId === node.id) {
                const inletPressure = pipe.resultSummary?.inletState?.pressure;
                if (inletPressure !== undefined && Math.abs(inletPressure - convertUnit(node.pressure, node.pressureUnit || "kPag", "Pa")) > 100) { // 100 Pa tolerance
                    warnings.push(`Pressure mismatch with pipe ${pipe.name || pipe.id}`);
                }
            }
            // Check outlet pressure for incoming pipes (endNode)
            if (pipe.endNodeId === node.id) {
                const outletPressure = pipe.resultSummary?.outletState?.pressure;
                if (outletPressure !== undefined && Math.abs(outletPressure - convertUnit(node.pressure, node.pressureUnit || "kPag", "Pa")) > 100) {
                    warnings.push(`Pressure mismatch with pipe ${pipe.name || pipe.id}`);
                }
            }
        }
    }

    // Mass Balance Check (Middle Node)
    if (pipes.length > 0) {
        const connectedPipes = pipes.filter(p => p.startNodeId === node.id || p.endNodeId === node.id);
        let massIn = 0;
        let massOut = 0;
        let hasInlet = false;
        let hasOutlet = false;

        for (const pipe of connectedPipes) {
            const isForward = pipe.direction !== "backward";
            // If forward: start -> end. If node is end, it's incoming.
            // If backward: end -> start. If node is start, it's incoming.
            const isIncoming = (isForward && pipe.endNodeId === node.id) || (!isForward && pipe.startNodeId === node.id);

            const massFlow = convertUnit(pipe.massFlowRate || 0, pipe.massFlowRateUnit || "kg/h", "kg/s");

            if (isIncoming) {
                massIn += massFlow;
                hasInlet = true;
            } else {
                massOut += massFlow;
                hasOutlet = true;
            }
        }

        // Only check for middle nodes (has both inlet and outlet)
        if (hasInlet && hasOutlet) {
            if (Math.abs(massIn - massOut) > 0.01) {
                warnings.push(`Mass balance mismatch: In ${massIn.toFixed(3)} kg/s, Out ${massOut.toFixed(3)} kg/s`);
            }
        }
    }

    return warnings;
};
