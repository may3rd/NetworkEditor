import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { useTheme } from "@mui/material";
import { ErrorOutline } from "@mui/icons-material";
import { useState, useRef } from "react";
import { HoverCard } from "./HoverCard";
import { PipeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";
import { getPipeStatus } from "@/utils/velocityCriteria";
import { getPipeWarnings } from "@/utils/validationUtils";


export default function PipeEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: EdgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const currentMousePos = useRef({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        currentMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        currentMousePos.current = { x: e.clientX, y: e.clientY };
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            setHoverPos(currentMousePos.current);
            setIsHovered(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setIsHovered(false);
    };
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const theme = useTheme();
    const labelLines = (data?.labelLines as string[]) || [];
    const labelBgColor = (data?.labelBgColor as string) || theme.palette.background.paper;
    const labelTextColor = (data?.labelTextColor as string) || theme.palette.text.primary;
    const labelBorderColor = theme.palette.divider;
    const isSelected = data?.isSelected as boolean;
    const pipe = data?.pipe as PipeProps | undefined;

    const isAnimationEnabled = data?.isAnimationEnabled as boolean;
    const isConnectingMode = data?.isConnectingMode as boolean;
    const velocity = data?.velocity as number || 0;
    const direction = pipe?.direction || "forward";

    // Calculate animation duration based on velocity
    const absVelocity = Math.abs(velocity);
    const clampedVelocity = Math.max(0.1, Math.min(absVelocity, 20));
    const animationDuration = absVelocity > 0 ? 2 / clampedVelocity : 0;

    const isFlowing = isAnimationEnabled && absVelocity > 0;
    const animationName = direction === "forward" ? "flowAnimationForward" : "flowAnimationBackward";

    const status = pipe ? getPipeStatus(pipe) : { velocityStatus: { status: 'ok' as const }, pressureDropStatus: { status: 'ok' as const } };
    let animationColor = theme.palette.info.main;
    if (status.velocityStatus.status === 'error') {
        animationColor = theme.palette.error.main;
    } else if (status.velocityStatus.status === 'warning' || status.pressureDropStatus.status === 'warning') {
        animationColor = theme.palette.warning.main;
    }

    const needsAttention = pipe && (
        pipe.pressureDropCalculationResults?.totalSegmentPressureDrop === undefined ||
        pipe.resultSummary?.outletState === undefined ||
        (Math.abs(convertUnit(pipe.elevation || 0, pipe.elevationUnit || "m", "m")) > convertUnit(pipe.length || 0, pipe.lengthUnit || "m", "m"))
    );

    // Determine Badge Type
    let badgeType: 'error' | 'warning' | 'attention' | null = null;
    if (status.velocityStatus.status === 'error') {
        badgeType = 'error';
    } else if (status.velocityStatus.status === 'warning' || status.pressureDropStatus.status === 'warning') {
        badgeType = 'warning';
    } else if (needsAttention) {
        badgeType = 'attention';
    }

    const renderBadge = () => {
        if (!badgeType) return null;

        const commonStyle: React.CSSProperties = {
            position: "absolute",
            width: 14,
            height: 14,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 800,
            border: `1px solid ${theme.palette.text.primary}`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
        };

        if (badgeType === 'error') {
            return (
                <div style={{
                    ...commonStyle,
                    backgroundColor: theme.palette.error.main,
                    color: "#fff",
                    top: -8,
                    right: -8,
                }}>
                    !
                </div>
            );
        }

        if (badgeType === 'warning') {
            return (
                <div style={{
                    ...commonStyle,
                    backgroundColor: theme.palette.warning.main,
                    border: `1px solid ${theme.palette.warning.dark}`,
                    top: -8,
                    right: -8,
                }} />
            );
        }

        if (badgeType === 'attention') {
            return (
                <div style={{
                    ...commonStyle,
                    backgroundColor: "#fbbf24",
                    color: "#000",
                    top: -8,
                    right: -8,
                }}>
                    !
                </div>
            );
        }
    };

    const renderFallbackBadge = () => {
        if (!badgeType) return null;
        const commonStyle: React.CSSProperties = {
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: 1,
            pointerEvents: "none",
            width: 14,
            height: 14,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 800,
            border: `1px solid ${theme.palette.text.primary}`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
        };

        if (badgeType === 'error') {
            return (
                <div
                    style={{
                        ...commonStyle,
                        backgroundColor: theme.palette.error.main,
                        color: "#fff",
                    }}
                    className="nodrag nopan"
                >
                    !
                </div>
            );
        }
        if (badgeType === 'warning') {
            return (
                <div
                    style={{
                        ...commonStyle,
                        backgroundColor: theme.palette.warning.main,
                        border: `1px solid ${theme.palette.warning.dark}`,
                    }}
                    className="nodrag nopan"
                />
            );
        }
        if (badgeType === 'attention') {
            return (
                <div
                    style={{
                        ...commonStyle,
                        backgroundColor: "#fbbf24",
                        color: "#000",
                    }}
                    className="nodrag nopan"
                >
                    !
                </div>
            );
        }
    }


    return (
        <>
            {isFlowing && (
                <style>
                    {`
                        @keyframes flowAnimationForward {
                            from { stroke-dashoffset: 20; }
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes flowAnimationBackward {
                            from { stroke-dashoffset: 20; }
                            to { stroke-dashoffset: 0; }
                        }
                    `}
                </style>
            )}

            {/* Wide transparent path for easier hovering */}
            <path
                d={edgePath}
                strokeWidth={20}
                stroke="transparent"
                fill="none"
                style={{ cursor: 'pointer' }}
                onMouseEnter={!isConnectingMode ? handleMouseEnter : undefined}
                onMouseLeave={!isConnectingMode ? handleMouseLeave : undefined}
                onMouseMove={!isConnectingMode ? handleMouseMove : undefined}
            />
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{ ...style, strokeWidth: isHovered || isSelected ? 2 : 1 }}
            />

            {/* Animation Layer */}
            {isFlowing && (
                <path
                    d={edgePath}
                    stroke={animationColor}
                    strokeWidth={3}
                    strokeDasharray="10 10"
                    fill="none"
                    style={{
                        animation: `${animationName} ${animationDuration}s linear infinite`,
                        opacity: 0.6,
                        pointerEvents: "none",
                    }}
                />
            )}

            <EdgeLabelRenderer>
                {labelLines.length > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            background: labelBgColor,
                            padding: "0px 8px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: 500,
                            color: labelTextColor,
                            border: `1px solid ${labelBorderColor}`,
                            pointerEvents: "all",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            zIndex: isSelected ? 10 : 1,
                            boxShadow: isSelected ? "0 0 0 1px #f59e0b" : "none",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                        className="nodrag nopan"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                    >
                        {renderBadge()}
                        {labelLines.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}

                {/* Fallback warning if no labels are shown */}
                {labelLines.length === 0 && renderFallbackBadge()}

                {isHovered && pipe && (
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            zIndex: 1000,
                            pointerEvents: "none",
                        }}
                        className="nodrag nopan"
                    >
                        <HoverCard
                            title={pipe.name || "Pipe"}
                            subtitle="Pipe Properties"
                            x={hoverPos.x}
                            y={hoverPos.y}
                            rows={(() => {
                                const commonRows = [
                                    { label: "Mass Flow", value: `${pipe.massFlowRate ?? 0} ${pipe.massFlowRateUnit ?? "kg/h"}` },
                                ];

                                let rows: Array<{ label: string; value: string | number | React.ReactNode }> = [];
                                if (pipe.pipeSectionType === "control valve") {
                                    rows = [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.controlValvePressureDrop ? `${(pipe.pressureDropCalculationResults.controlValvePressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                } else if (pipe.pipeSectionType === "orifice") {
                                    rows = [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Beta Ratio", value: pipe.orifice?.betaRatio ?? "N/A" },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.orificePressureDrop ? `${(pipe.pressureDropCalculationResults.orificePressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                } else {
                                    rows = [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Length", value: `${(pipe.length ?? 0).toFixed(3)} ${pipe.lengthUnit ?? "m"}` },
                                        { label: "Velocity", value: pipe.resultSummary?.outletState?.velocity ? `${convertUnit(pipe.resultSummary.outletState.velocity, "m/s", "m/s").toFixed(2)} m/s` : "N/A" },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ? `${(pipe.pressureDropCalculationResults.totalSegmentPressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                }

                                const warnings = getPipeWarnings(pipe);

                                // Add velocity/pressure warnings
                                if (status.velocityStatus.status !== 'ok' && status.velocityStatus.message) {
                                    warnings.push(status.velocityStatus.message);
                                }
                                if (status.pressureDropStatus.status !== 'ok' && status.pressureDropStatus.message) {
                                    warnings.push(status.pressureDropStatus.message);
                                }

                                if (warnings.length > 0) {
                                    warnings.forEach(w => {
                                        rows.push({
                                            label: "",
                                            value: (
                                                <span style={{ color: theme.palette.error.main, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ErrorOutline sx={{ fontSize: 16 }} /> {w}
                                                </span>
                                            )
                                        });
                                    });
                                }

                                return rows;
                            })()}
                        />
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
