import { Stack } from "@mui/material";
import { PipeProps, PipePatch, NetworkState } from "@/lib/types";
import { PipeGeneralSection } from "./PipeGeneralSection";
import { PipeFluidSection } from "./PipeFluidSection";
import { PipeDiameterSection } from "./PipeDiameterSection";
import { PipePhysicalSection } from "./PipePhysicalSection";
import { PipeControlValveSection } from "./PipeControlValveSection";
import { PipeOrificeSection } from "./PipeOrificeSection";

type Props = {
    pipe: PipeProps;
    network: NetworkState;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
};

export function PipeProperties({ pipe, network, onUpdatePipe }: Props) {
    const startNode = network.nodes.find((n) => n.id === pipe.startNodeId);
    const endNode = network.nodes.find((n) => n.id === pipe.endNodeId);
    const pipeFluidPhase = pipe.fluid?.phase ?? startNode?.fluid?.phase ?? "liquid";
    const normalizedPipeFluidPhase =
        typeof pipeFluidPhase === "string" ? pipeFluidPhase.toLowerCase() : undefined;
    const isGasPipe = normalizedPipeFluidPhase === "gas";

    return (
        <Stack spacing={2}>
            <PipeGeneralSection
                pipe={pipe}
                startNode={startNode}
                endNode={endNode}
                onUpdatePipe={onUpdatePipe}
            />

            <PipeFluidSection
                pipe={pipe}
                startNode={startNode}
                isGasPipe={isGasPipe}
                onUpdatePipe={onUpdatePipe}
            />

            <PipeDiameterSection
                pipe={pipe}
                onUpdatePipe={onUpdatePipe}
            />

            {pipe.pipeSectionType === "pipeline" && (
                <PipePhysicalSection
                    pipe={pipe}
                    pipeFluidPhase={pipeFluidPhase}
                    onUpdatePipe={onUpdatePipe}
                />
            )}

            {pipe.pipeSectionType === "control valve" && (
                <PipeControlValveSection
                    pipe={pipe}
                    isGasPipe={isGasPipe}
                    onUpdatePipe={onUpdatePipe}
                />
            )}

            {pipe.pipeSectionType === "orifice" && (
                <PipeOrificeSection
                    pipe={pipe}
                    onUpdatePipe={onUpdatePipe}
                />
            )}
        </Stack>
    );
}
