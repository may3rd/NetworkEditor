import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { useTheme } from "@mui/material";
import { useState, useRef } from "react";
import { HoverCard } from "./HoverCard";
import { PipeProps } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

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
    const labelBorderColor = (data?.labelBorderColor as string) || theme.palette.divider;
    const isSelected = data?.isSelected as boolean;
    const pipe = data?.pipe as PipeProps | undefined;

    const isAnimationEnabled = data?.isAnimationEnabled as boolean;
    const isConnectingMode = data?.isConnectingMode as boolean;
    const velocity = data?.velocity as number || 0;
    const direction = pipe?.direction || "forward";

    // Calculate animation duration based on velocity
    // Base speed: 1m/s = 1s duration for a 20px dash cycle?
    // Let's say we want the dashes to move at 'velocity' pixels per second?
    // No, that would depend on zoom.
    // Let's just map velocity magnitude to a reasonable duration range.
    // Max speed (fastest animation) = 0.2s
    // Min speed (slowest visible) = 5s
    // Velocity range: 0.1 m/s to 20 m/s?

    // Let's try: duration = 1 / velocity.
    // If v=1, d=1s. If v=10, d=0.1s. If v=0.1, d=10s.
    // Clamp duration to [0.2, 5].

    const absVelocity = Math.abs(velocity);
    const clampedVelocity = Math.max(0.1, Math.min(absVelocity, 20));
    const animationDuration = absVelocity > 0 ? 2 / clampedVelocity : 0;

    const isFlowing = isAnimationEnabled && absVelocity > 0;
    const animationName = direction === "forward" ? "flowAnimationForward" : "flowAnimationBackward";

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
                            from { stroke-dashoffset: 0; }
                            to { stroke-dashoffset: 20; }
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
                    stroke={theme.palette.info.main}
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
                        }}
                        className="nodrag nopan"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                    >
                        {labelLines.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}
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

                                if (pipe.pipeSectionType === "control valve") {
                                    return [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.controlValvePressureDrop ? `${(pipe.pressureDropCalculationResults.controlValvePressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                } else if (pipe.pipeSectionType === "orifice") {
                                    return [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Beta Ratio", value: pipe.orifice?.betaRatio ?? "N/A" },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.orificePressureDrop ? `${(pipe.pressureDropCalculationResults.orificePressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                } else {
                                    return [
                                        ...commonRows,
                                        { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                        { label: "Length", value: `${(pipe.length ?? 0).toFixed(3)} ${pipe.lengthUnit ?? "m"}` },
                                        { label: "Velocity", value: pipe.resultSummary?.outletState?.velocity ? `${convertUnit(pipe.resultSummary.outletState.velocity, "m/s", "m/s").toFixed(2)} m/s` : "N/A" },
                                        { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ? `${(pipe.pressureDropCalculationResults.totalSegmentPressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                                    ];
                                }
                            })()}
                        />
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
