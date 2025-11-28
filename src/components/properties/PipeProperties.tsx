import {
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    DialogActions,
} from "@mui/material";
import { useState } from "react";
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
    const [openCopyDialog, setOpenCopyDialog] = useState(false);

    const startNode = network.nodes.find((n) => n.id === pipe.startNodeId);
    const endNode = network.nodes.find((n) => n.id === pipe.endNodeId);
    const pipeFluidPhase = pipe.fluid?.phase ?? startNode?.fluid?.phase ?? "liquid";
    const normalizedPipeFluidPhase =
        typeof pipeFluidPhase === "string" ? pipeFluidPhase.toLowerCase() : undefined;
    const isGasPipe = normalizedPipeFluidPhase === "gas";

    const handleCopyFromPipe = (sourcePipe: PipeProps) => {
        const patch: PipePatch = {
            pipeSectionType: sourcePipe.pipeSectionType,
            pipeNPD: sourcePipe.pipeNPD,
            pipeSchedule: sourcePipe.pipeSchedule,
            diameter: sourcePipe.diameter,
            diameterUnit: sourcePipe.diameterUnit,
            diameterInputMode: sourcePipe.diameterInputMode,
            pipeDiameter: sourcePipe.pipeDiameter,
            pipeDiameterUnit: sourcePipe.pipeDiameterUnit,
            inletDiameter: sourcePipe.inletDiameter,
            inletDiameterUnit: sourcePipe.inletDiameterUnit,
            outletDiameter: sourcePipe.outletDiameter,
            outletDiameterUnit: sourcePipe.outletDiameterUnit,
            roughness: sourcePipe.roughness,
            roughnessUnit: sourcePipe.roughnessUnit,
            length: sourcePipe.length,
            lengthUnit: sourcePipe.lengthUnit,
            elevation: sourcePipe.elevation,
            elevationUnit: sourcePipe.elevationUnit,
            fittingType: sourcePipe.fittingType,
            fittings: sourcePipe.fittings ? JSON.parse(JSON.stringify(sourcePipe.fittings)) : undefined,
            pipeLengthK: sourcePipe.pipeLengthK,
            fittingK: sourcePipe.fittingK,
            userK: sourcePipe.userK,
            pipingFittingSafetyFactor: sourcePipe.pipingFittingSafetyFactor,
            erosionalConstant: sourcePipe.erosionalConstant,
            gasFlowModel: sourcePipe.gasFlowModel,
            designMargin: sourcePipe.designMargin,
            controlValve: sourcePipe.controlValve ? { ...sourcePipe.controlValve } : undefined,
            orifice: sourcePipe.orifice ? { ...sourcePipe.orifice } : undefined,
            massFlowRate: sourcePipe.massFlowRate,
            massFlowRateUnit: sourcePipe.massFlowRateUnit,
        };

        onUpdatePipe(pipe.id, patch);
        setOpenCopyDialog(false);
    };

    return (
        <Stack spacing={2}>
            <PipeGeneralSection
                pipe={pipe}
                pipes={network.pipes}
                startNode={startNode}
                endNode={endNode}
                onUpdatePipe={onUpdatePipe}
            />

            <PipeFluidSection
                pipe={pipe}
                sourceNode={pipe.direction === "backward" ? endNode : startNode}
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
                    startNode={startNode}
                    endNode={endNode}
                    onUpdatePipe={onUpdatePipe}
                />
            )}

            {pipe.pipeSectionType === "control valve" && (
                <PipeControlValveSection
                    pipe={pipe}
                    isGasPipe={isGasPipe}
                    startNode={startNode}
                    endNode={endNode}
                    onUpdatePipe={onUpdatePipe}
                />
            )}

            {pipe.pipeSectionType === "orifice" && (
                <PipeOrificeSection
                    pipe={pipe}
                    onUpdatePipe={onUpdatePipe}
                />
            )}

            <Button variant="outlined" onClick={() => setOpenCopyDialog(true)}>
                Copy Properties
            </Button>

            <Dialog open={openCopyDialog} onClose={() => setOpenCopyDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Copy Properties From</DialogTitle>
                <DialogContent dividers>
                    <List>
                        {network.pipes
                            .filter((p) => p.id !== pipe.id)
                            .map((p, index) => (
                                <ListItem disablePadding key={p.id}>
                                    <ListItemButton onClick={() => handleCopyFromPipe(p)}>
                                        <ListItemText primary={p.name || `P-${index + 1}`} secondary={p.description} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCopyDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
