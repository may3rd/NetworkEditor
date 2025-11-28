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

    return (
        <>
            {/* Wide transparent path for easier hovering */}
            <path
                d={edgePath}
                strokeWidth={20}
                stroke="transparent"
                fill="none"
                style={{ cursor: 'pointer' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
            />
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{ ...style, strokeWidth: isHovered || isSelected ? 2 : 1 }}
            />
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
                            rows={[
                                { label: "Length", value: `${pipe.length ?? 0} ${pipe.lengthUnit ?? "m"}` },
                                { label: "Diameter", value: `${pipe.diameter ?? 0} ${pipe.diameterUnit ?? "mm"}` },
                                { label: "Mass Flow", value: `${pipe.massFlowRate ?? 0} ${pipe.massFlowRateUnit ?? "kg/h"}` },
                                { label: "Velocity", value: pipe.resultSummary?.outletState?.velocity ? `${convertUnit(pipe.resultSummary.outletState.velocity, "m/s", "m/s").toFixed(2)} m/s` : "N/A" },
                                { label: "Pressure Drop", value: pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ? `${(pipe.pressureDropCalculationResults.totalSegmentPressureDrop / 1000).toFixed(2)} kPa` : "N/A" },
                            ]}
                        />
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
