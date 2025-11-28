import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { useTheme } from "@mui/material";

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

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
            {labelLines.length > 0 && (
                <EdgeLabelRenderer>
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
                    >
                        {labelLines.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
