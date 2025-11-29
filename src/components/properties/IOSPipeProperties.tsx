import { PipeProps, PipePatch, NodeProps, NetworkState } from "@/lib/types";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, Switch } from "@mui/material";
import {
    NamePage,
    DescriptionPage,
    FluidPage,
    MassFlowRatePage,
    DiameterPage,
    CalculationTypePage,
    LengthPage,
    ElevationPage
} from "./ios/PipeSubPages";

type Props = {
    pipe: PipeProps;
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
    navigator: Navigator;
};

export function IOSPipeProperties({ pipe, startNode, endNode, onUpdatePipe, navigator }: Props) {

    const openNamePage = () => {
        navigator.push("Name", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <NamePage value={currentPipe.name || ""} onChange={(v) => onUpdatePipe(pipe.id, { name: v })} />;
        });
    };

    const openDescriptionPage = () => {
        navigator.push("Description", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <DescriptionPage value={currentPipe.description || ""} onChange={(v) => onUpdatePipe(pipe.id, { description: v })} />;
        });
    };

    const openFluidPage = () => {
        navigator.push("Fluid", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <FluidPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openMassFlowRatePage = () => {
        navigator.push("Mass Flow Rate", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <MassFlowRatePage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openDiameterPage = () => {
        navigator.push("Pipe Diameter", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <DiameterPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openCalculationTypePage = () => {
        navigator.push("Calculation Type", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <CalculationTypePage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openLengthPage = () => {
        navigator.push("Length", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <LengthPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openElevationPage = () => {
        navigator.push("Elevation", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <ElevationPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="General">
                <IOSListItem
                    label="Name"
                    value={pipe.name}
                    onClick={openNamePage}
                    chevron
                />
                <IOSListItem
                    label="Description"
                    value={pipe.description || "None"}
                    onClick={openDescriptionPage}
                    chevron
                />
                <IOSListItem
                    label="Fluid"
                    value={pipe.fluid?.id || "None"}
                    onClick={openFluidPage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup header="Flow">
                <IOSListItem
                    label="Backward Direction"
                    control={
                        <Switch
                            checked={pipe.direction === "backward"}
                            onChange={(e) => onUpdatePipe(pipe.id, { direction: e.target.checked ? "backward" : "forward" })}
                        />
                    }
                />
                <IOSListItem
                    label="Mass Flow Rate"
                    value={`${pipe.massFlowRate ?? "-"} ${pipe.massFlowRateUnit ?? ""}`}
                    onClick={openMassFlowRatePage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup header="Physical">
                <IOSListItem
                    label="Pipe Diameter"
                    value={`${pipe.diameter ?? "-"} ${pipe.diameterUnit ?? ""}`}
                    onClick={openDiameterPage}
                    chevron
                />
                <IOSListItem
                    label="Calculation Type"
                    value={pipe.pipeSectionType || "Pipeline"}
                    onClick={openCalculationTypePage}
                    chevron
                />
                <IOSListItem
                    label="Length"
                    value={`${pipe.length ?? "-"} ${pipe.lengthUnit ?? ""}`}
                    onClick={openLengthPage}
                    chevron
                />
                <IOSListItem
                    label="Elevation"
                    value={`${pipe.elevation ?? "-"} ${pipe.elevationUnit ?? ""}`}
                    onClick={openElevationPage}
                    chevron
                />
                <IOSListItem
                    label="Pipe Fittings"
                    value=""
                    chevron
                    last
                />
            </IOSListGroup>
        </Box>
    );
}
