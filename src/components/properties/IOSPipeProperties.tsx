import { PipeProps, NodeProps, PipePatch, ViewSettings, NetworkState, NodePatch } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { computeErosionalVelocity } from "@/lib/calculations/utils";
import { getPipeStatus } from "@/utils/velocityCriteria";
import { getPipeWarnings } from "@/utils/validationUtils";
import { IOSListGroup } from "../ios/IOSListGroup";
import { IOSListItem } from "../ios/IOSListItem";
import { Navigator } from "../PropertiesPanel";
import { Box, IconButton, Typography, useTheme, SvgIcon, SvgIconProps, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { Add, Check, Timeline, Close, ErrorOutline } from "@mui/icons-material";
import { RefObject, useEffect, useRef, useState } from "react";
import { glassDialogSx, glassListGroupSx, glassPanelSx } from "@/lib/glassStyles";

function ControlValveIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            {/* Actuator (Semi-circle) */}
            <path d="M8 8A4 4 0 0 1 16 8L8 8Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Stem */}
            <path d="M12 8L12 16" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Valve Body (Triangles) */}
            <path d="M5 12L12 16L5 20Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M19 12L12 16L19 20Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Connecting Lines */}
            <path d="M2 16H5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M19 16H22" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </SvgIcon>
    );
}

function OrificeIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            {/* Pipe Line */}
            <path d="M2 12H10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 12H22" stroke="currentColor" strokeWidth="1.5" />
            {/* Orifice Plate (Two vertical lines) */}
            <path d="M10.5 7V17" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.5 7V17" stroke="currentColor" strokeWidth="1.5" />
        </SvgIcon>
    );
}
import {
    NamePage,
    DescriptionPage,
    FluidPage,
    MassFlowRatePage,
    DiameterPage,
    CalculationTypePage,
    RoughnessPage,
    LengthPage,
    ElevationPage,
    DirectionPage,
    PipeFittingsPage,
    UserSpecifiedPressureLossPage,
    PipeSummaryPage,
    ControlValvePage,
    OrificePage,
    NumberInputPage,
    GasFlowModelPage,
    ServiceTypePage,
    BoundaryNodePage
} from "./subPages/PipeSubPages";

type Props = {
    pipe: PipeProps;
    startNode?: NodeProps;
    endNode?: NodeProps;
    onUpdatePipe: (id: string, patch: PipePatch) => void;
    onUpdateNode: (id: string, patch: NodePatch) => void;
    navigator: Navigator;
    viewSettings: ViewSettings;
    containerRef?: RefObject<HTMLDivElement | null>;
    setTitleOpacity?: (o: number) => void;
};

export function IOSPipeProperties({ pipe, startNode, endNode, onUpdatePipe, onUpdateNode,
    navigator,
    viewSettings,
    containerRef,
    setTitleOpacity,
}: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const summaryRef = useRef<HTMLDivElement>(null);


    // Scroll listener for title fade-in
    useEffect(() => {
        const container = containerRef?.current;
        if (!container || !setTitleOpacity) return;

        const handleScroll = () => {
            if (!summaryRef.current) return;
            const summaryHeight = summaryRef.current.offsetHeight;
            const scrollTop = container.scrollTop;

            // Fade in when scrolled past 50% of summary
            const threshold = summaryHeight * 0.5;
            const opacity = Math.min(Math.max((scrollTop - threshold) / 50, 0), 1);
            setTitleOpacity(opacity);
        };

        // Initial check
        handleScroll();

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [containerRef, setTitleOpacity]);

    const openAboutPage = () => {
        navigator.push("About", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const direction = currentPipe.direction ?? "forward";
            const currentStartNode = network.nodes.find(n => n.id === currentPipe.startNodeId);
            const currentEndNode = network.nodes.find(n => n.id === currentPipe.endNodeId);
            const boundaryNode = direction === "forward" ? currentStartNode : currentEndNode;

            return (
                <Box sx={{ pt: 2 }}>
                    <IOSListGroup>
                        <IOSListItem
                            label="Name"
                            value={currentPipe.name}
                            onClick={() => nav.push("Name", (net, n) => <NamePage value={currentPipe.name || ""} onChange={(v) => onUpdatePipe(pipe.id, { name: v })} />)}
                            chevron
                        />
                        <IOSListItem
                            label="Description"
                            value={currentPipe.description || "None"}
                            onClick={() => nav.push("Description", (net, n) => <DescriptionPage value={currentPipe.description || ""} onChange={(v) => onUpdatePipe(pipe.id, { description: v })} />)}
                            chevron
                        />
                        <IOSListItem
                            label="Fluid"
                            value={currentPipe.fluid?.id || "None"}
                            onClick={() => nav.push("Fluid", (net, n) => <FluidPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} navigator={n} />)}
                            chevron
                            last
                        />
                    </IOSListGroup>

                    {boundaryNode && (
                        <BoundaryNodePage
                            node={boundaryNode}
                            onUpdateNode={onUpdateNode}
                            navigator={nav}
                        />
                    )}
                </Box>
            );
        });
    };

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

    const openRoughnessPage = () => {
        navigator.push("Roughness", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <RoughnessPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const openLengthPage = () => {
        navigator.push("Length", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;

            const currentStartNode = network.nodes.find(n => n.id === currentPipe.startNodeId);
            const currentEndNode = network.nodes.find(n => n.id === currentPipe.endNodeId);

            return <LengthPage
                pipe={currentPipe}
                onUpdatePipe={onUpdatePipe}
                startNode={currentStartNode}
                endNode={currentEndNode}
            />;
        });
    };

    const openElevationPage = () => {
        navigator.push("Elevation", (network: NetworkState, nav: Navigator) => {
            const currentPipe = network.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return <ElevationPage pipe={currentPipe} onUpdatePipe={onUpdatePipe} />;
        });
    };

    const getIcon = () => {
        switch (pipe.pipeSectionType) {
            case "control valve": return <ControlValveIcon sx={{ fontSize: 40, color: "#ffffff" }} />;
            case "orifice": return <OrificeIcon sx={{ fontSize: 40, color: "#ffffff" }} />;
            default: return <Timeline sx={{ fontSize: 40, color: "#ffffff" }} />;
        }
    };

    const getIconBgColor = () => {
        switch (pipe.pipeSectionType) {
            case "control valve": return "linear-gradient(#FFD60A, #FF9F0A)"; // Orange gradient
            case "orifice": return "linear-gradient(#BF5AF2, #5E5CE6)"; // Purple gradient
            default: return "linear-gradient(#00C4F9,#0076F0)"; // Blue gradient
        }
    };

    return (
        <Box sx={{
            mt: "-100px",
            pt: "100px",
            pb: "60px",
        }}>
            {/* Top Summary Section */}
            <Box ref={summaryRef} sx={{
                ...glassListGroupSx,
                px: 2,
                py: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                borderRadius: "16px",
                mx: 2,
                my: 2,
            }}>
                <Box sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "14px",
                    background: getIconBgColor(),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    boxShadow: "0px 0px 2px 1px rgba(255, 255, 255, 0.3) inset, 2px 2px 3px -2px rgba(255,255,255,0.7) inset, -2px -2px 3px -2px rgba(255,255,255,0.7) inset"
                    // boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}>
                    {getIcon()}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: isDark ? "#fff" : "#000", letterSpacing: "-0.5px" }}>
                    {pipe.name || "Unnamed Pipe"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                    {pipe.description ? pipe.description : "No description"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                    {pipe.fluid?.id ? `Fluid: ${pipe.fluid.id}` : ""}
                    {pipe.fluid?.phase ? ` (${pipe.fluid.phase})` : ""}
                    {pipe.fluid?.density ? `, Density: ${pipe.fluid.density} ${pipe.fluid.densityUnit}` : ""}
                    {pipe.fluid?.molecularWeight ? `, Molecular Weight: ${pipe.fluid.molecularWeight}` : ""}
                    {pipe.fluid?.zFactor ? `, Z Factor: ${pipe.fluid.zFactor}` : ""}
                    {pipe.fluid?.specificHeatRatio ? `, Specific Heat Ratio: ${pipe.fluid.specificHeatRatio}` : ""}
                    {pipe.fluid?.viscosity ? `, Viscosity: ${pipe.fluid.viscosity} ${pipe.fluid.viscosityUnit}` : ""}
                </Typography>
                {(() => {
                    const warnings = getPipeWarnings(pipe);
                    if (warnings.length > 0) {
                        return (
                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {warnings.map((w, i) => (
                                    <Typography key={i} variant="caption" sx={{ color: "text.primary", fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            background: "linear-gradient(#FFD60A, #FF9F0A)",
                                            color: "#000",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "11px",
                                            fontWeight: 800,
                                            border: "1px solid",
                                            borderColor: "text.primary",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                                            flexShrink: 0,
                                        }}>
                                            !
                                        </Box>
                                        {w}
                                    </Typography>
                                ))}
                            </Box>
                        );
                    }
                    return null;
                })()}
            </Box>

            <IOSListGroup>
                <IOSListItem
                    label="About"
                    onClick={openAboutPage}
                    chevron
                />
                <IOSListItem
                    label="Service Type"
                    value={pipe.serviceType || "Select Service"}
                    onClick={() => navigator.push("Service Type", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return <ServiceTypePage value={currentPipe.serviceType || ""} onChange={(v) => onUpdatePipe(pipe.id, { serviceType: v })} />;
                    })}
                    chevron
                />
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
                {pipe.fluid?.phase === "gas" && (
                    <IOSListItem
                        label="Flow Model"
                        value={pipe.gasFlowModel === "isothermal" ? "Isothermal" : "Adiabatic"}
                        onClick={() => navigator.push("Flow Model", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            return (
                                <GasFlowModelPage
                                    value={currentPipe.gasFlowModel ?? "adiabatic"}
                                    onChange={(v) => onUpdatePipe(pipe.id, { gasFlowModel: v })}
                                />
                            );
                        })}
                        chevron
                    />
                )}
                <IOSListItem
                    label="Mass Flow Rate"
                    value={`${typeof pipe.massFlowRate === 'number' ? pipe.massFlowRate.toFixed(3) : "-"} ${pipe.massFlowRateUnit ?? ""}`}
                    secondary={(() => {
                        if (typeof pipe.massFlowRate !== 'number') return undefined;

                        const massFlowUnit = pipe.massFlowRateUnit ?? "kg/h";
                        const massFlowKgH = convertUnit(pipe.massFlowRate, massFlowUnit, "kg/h");

                        if (pipe.fluid?.phase === "gas") {
                            const mw = pipe.fluid?.molecularWeight ?? startNode?.fluid?.molecularWeight;
                            if (typeof mw === 'number' && mw > 0) {
                                const normalFlowNm3H = (massFlowKgH / mw) * 24.465;
                                return `Normal Flow: ${normalFlowNm3H.toFixed(3)} Nm³/h`;
                            }
                        } else {
                            const density = pipe.fluid?.density ?? startNode?.fluid?.density;
                            if (typeof density === 'number' && density > 0) {
                                let densityKgM3 = density;
                                const densityUnit = pipe.fluid?.densityUnit ?? startNode?.fluid?.densityUnit;
                                if (densityUnit && densityUnit !== "kg/m3") {
                                    densityKgM3 = convertUnit(density, densityUnit, "kg/m3");
                                }
                                const volFlowM3H = massFlowKgH / densityKgM3;
                                return `Vol: ${volFlowM3H.toFixed(3)} m³/h`;
                            }
                        }
                        return undefined;
                    })()}
                    onClick={openMassFlowRatePage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup>
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
                    secondary={(() => {
                        if (typeof pipe.velocity === 'number') {
                            const text = `Pipe Velocity: ${pipe.velocity.toFixed(3)} ${pipe.velocityUnit ?? "m/s"}`;

                            const status = getPipeStatus(pipe);
                            if (status.velocityStatus.status === 'error') {
                                return (
                                    <Typography component="span" sx={{ color: "error.main", fontSize: "inherit", fontWeight: 'bold' }}>
                                        {text} ({status.velocityStatus.message})
                                    </Typography>
                                );
                            } else if (status.velocityStatus.status === 'warning') {
                                return (
                                    <Typography component="span" sx={{ color: "warning.main", fontSize: "inherit", fontWeight: 'bold' }}>
                                        {text} ({status.velocityStatus.message})
                                    </Typography>
                                );
                            }

                            return text;
                        }
                        return undefined;
                    })()}
                    chevron
                />
                <IOSListItem
                    label="Erosional Constant"
                    value={pipe.erosionalConstant?.toFixed(0) ?? "-"}
                    secondary={(() => {
                        const density = pipe.fluid?.density ?? startNode?.fluid?.density;
                        const erosionalConstant = pipe.erosionalConstant ?? 100;
                        const erosionalVelocity = computeErosionalVelocity(density, erosionalConstant);

                        if (typeof erosionalVelocity === 'number') {
                            return `Erosional Velocity: ${erosionalVelocity.toFixed(3)} m/s`;
                        }
                        return undefined;
                    })()}
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
                    <ControlValvePage
                        pipe={pipe}
                        onUpdatePipe={onUpdatePipe}
                        navigator={navigator}
                        viewSettings={viewSettings}
                        startNode={startNode}
                        endNode={endNode}
                    />
                ) : pipe.pipeSectionType === "orifice" ? (
                    <OrificePage
                        pipe={pipe}
                        onUpdatePipe={onUpdatePipe}
                        navigator={navigator}
                        viewSettings={viewSettings}
                        startNode={startNode}
                        endNode={endNode}
                    />
                ) : (
                    <>
                        <IOSListItem
                            label="Roughness"
                            value={`${pipe.roughness ?? "-"} ${pipe.roughnessUnit ?? ""}`}
                            onClick={openRoughnessPage}
                            chevron
                        />
                        <IOSListItem
                            label="Length"
                            value={`${pipe.length?.toFixed(3) ?? "-"} ${pipe.lengthUnit ?? ""}`}
                            onClick={openLengthPage}
                            chevron
                        />
                        {pipe.fluid?.phase !== "gas" && (
                            <IOSListItem
                                label="Elevation"
                                value={`${pipe.elevation?.toFixed(3) ?? "-"} ${pipe.elevationUnit ?? ""}`}
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
                            }, "Back")}
                            chevron
                        />
                        <IOSListItem
                            label="User Specified Drop"
                            value={pipe.userSpecifiedPressureLoss ? `${pipe.userSpecifiedPressureLoss.toFixed(3)} ${pipe.userSpecifiedPressureLossUnit ?? "Pa"}` : "-"}
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
                    label="Result Summary"
                    onClick={() => navigator.push("Result Summary", (net, nav) => {
                        const currentPipe = net.pipes.find(p => p.id === pipe.id);
                        if (!currentPipe) return null;
                        return <PipeSummaryPage pipe={currentPipe} viewSettings={viewSettings} navigator={navigator} />;
                    })}
                    chevron
                    last
                />
            </IOSListGroup>
        </Box>
    );
}
