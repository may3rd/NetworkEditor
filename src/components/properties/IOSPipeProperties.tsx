import { PipeProps, NodeProps, PipePatch, ViewSettings, NetworkState } from "@/lib/types";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, Switch, IconButton } from "@mui/material";
import { Add, Check } from "@mui/icons-material";
import {
    NamePage,
    DescriptionPage,
    FluidPage,
    MassFlowRatePage,
    DiameterPage,
    CalculationTypePage,
    LengthPage,
    ElevationPage,
    DirectionPage,
    PipeFittingsPage,
    UserSpecifiedPressureLossPage,
    PipeSummaryPage,
    ControlValvePage,
    OrificePage,
    NumberInputPage
} from "./ios/PipeSubPages";

type Props = {
    pipe: PipeProps;
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
    navigator: Navigator;
    viewSettings: ViewSettings;
};

export function IOSPipeProperties({ pipe, startNode, endNode, onUpdatePipe,
    navigator,
    viewSettings,
}: Props) {

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
            return <FluidPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} navigator={nav} />;
        });
    };

    const openMassFlowRatePage = () => {
        navigator.push("Mass Flow Rate", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <MassFlowRatePage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
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
                    label="Direction"
                    value={pipe.direction === "backward" ? "Backward" : "Forward"}
                    onClick={() => navigator.push("Direction", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return <DirectionPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
                    })}
                    chevron
                />
                <IOSListItem
                    label="Mass Flow Rate"
                    value={`${typeof pipe.massFlowRate === 'number' ? pipe.massFlowRate.toFixed(3) : "-"} ${pipe.massFlowRateUnit ?? ""}`}
                    onClick={openMassFlowRatePage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup header="Physical">
                <IOSListItem
                    label="Calculation Type"
                    value={pipe.pipeSectionType || "Pipeline"}
                    onClick={openCalculationTypePage}
                    chevron
                />
                <IOSListItem
                    label="Pipe Diameter"
                    value={`${typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} ${pipe.diameterUnit ?? ""}`}
                    onClick={() => navigator.push("Pipe Diameter", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return <DiameterPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} navigator={nav} />;
                    })}
                    chevron
                />
                <IOSListItem
                    label="Erosional Constant"
                    value={pipe.erosionalConstant?.toFixed(0) ?? "-"}
                    onClick={() => navigator.push("Erosional Constant", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return (
                            <NumberInputPage
                                value={currentPipe.erosionalConstant}
                                onChange={(v) => onUpdatePipe(pipe.id, { erosionalConstant: v })}
                                placeholder="Erosional Constant"
                                autoFocus
                                min={0}
                            />
                        );
                    })}
                    chevron
                />

                {pipe.pipeSectionType === "control valve" ? (
                    <ControlValvePage pipe={pipe} onUpdatePipe={onUpdatePipe} navigator={navigator} viewSettings={viewSettings} />
                ) : pipe.pipeSectionType === "orifice" ? (
                    <OrificePage pipe={pipe} onUpdatePipe={onUpdatePipe} navigator={navigator} viewSettings={viewSettings} />
                ) : (
                    <>
                        <IOSListItem
                            label="Length"
                            value={`${pipe.length ?? "-"} ${pipe.lengthUnit ?? ""}`}
                            onClick={openLengthPage}
                            chevron
                        />
                        {pipe.fluid?.phase !== "gas" && (
                            <IOSListItem
                                label="Elevation"
                                value={`${pipe.elevation ?? "-"} ${pipe.elevationUnit ?? ""}`}
                                onClick={openElevationPage}
                                chevron
                            />
                        )}
                        <IOSListItem
                            label="Pipe Fittings"
                            value={(pipe.fittings?.some(f => f.count > 0) || (pipe.userK && pipe.userK !== 0)) ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                            onClick={() => navigator.push("Pipe Fittings", (net, nav) => {
                                const currentPipe = net.pipes.find(p => p.id === pipe.id);
                                if (!currentPipe) return null;
                                return <PipeFittingsPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} navigator={nav} />;
                            }, "Back", (
                                <IconButton size="small" sx={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "#ffffff",
                                    color: (theme) => theme.palette.mode === 'dark' ? "#ffffff" : "#000000",
                                    "&:hover": {
                                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "#ffffff",
                                    },
                                }}>
                                    <Add sx={{ fontSize: "20px" }} />
                                </IconButton>
                            ))}
                            chevron
                        />
                        <IOSListItem
                            label="User Specified Drop"
                            value={pipe.userSpecifiedPressureLoss ? `${pipe.userSpecifiedPressureLoss} ${pipe.userSpecifiedPressureLossUnit ?? "Pa"}` : "-"}
                            onClick={() => navigator.push("User Specified Drop", (net, nav) => {
                                const currentPipe = net.pipes.find(p => p.id === pipe.id);
                                if (!currentPipe) return null;
                                return <UserSpecifiedPressureLossPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
                            })}
                            chevron
                            last
                        />
                    </>
                )}
            </IOSListGroup>

            <IOSListGroup>
                <IOSListItem
                    label="Summary"
                    onClick={() => navigator.push("Summary", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return <PipeSummaryPage pipe={currentPipe} viewSettings={viewSettings} />;
                    })}
                    chevron
                    last
                />
            </IOSListGroup>
        </Box>
    );
}
