// components/PressureNode.tsx

import { memo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

type NodeRole = "source" | "sink" | "middle" | "isolated" | "neutral";

type NodeData = {
  label: string;
  isSelected: boolean;
  showPressures: boolean;
  pressure?: number;
  pressureUnit?: string;
  flowRole?: NodeRole;
  needsAttention?: boolean;
};

const ROLE_COLORS: Record<NodeRole, string> = {
  source: "#22c55e",
  sink: "#f97316",
  middle: "#3b82f6",
  isolated: "#94a3b8",
  neutral: "#3b82f6",
};

function PressureNode({ data }: { data: NodeData }) {
  const {
    label,
    isSelected,
    showPressures,
    pressure,
    pressureUnit,
    flowRole = "neutral",
    needsAttention = false,
  } = data;

  const roleColor = ROLE_COLORS[flowRole] ?? ROLE_COLORS.neutral;
  const fillColor = isSelected ? "#fde047" : roleColor;
  const borderColor = needsAttention ? "#dc2626" : "black";
  const borderWidth = needsAttention ? 0 : 1;
  const baseShadow = "0 4px 12px rgba(0,0,0,0.15)";
  const selectionShadow = isSelected
    ? `${baseShadow}, 0 0 0 1px rgba(234, 179, 8, 0.5)`
    : baseShadow;
  const scaleAmount = isSelected ? 1 : 1;
  const circleSize = 20;
  const dashThickness = needsAttention ? 2 : 0;
  const handleStyle: CSSProperties = {
    opacity: 1,
    border: "none",
    background: needsAttention ? "#dc2626" : "black",
    width: 7,
    height: 7,
    zIndex: 0,
  };

  return (
    <>
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      {needsAttention && (
        <style>
          {`@keyframes dash-rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }`}
        </style>
      )}
      <div style={{ position: "relative", width: circleSize, height: circleSize }}>
        {needsAttention && (
          <div
            style={{
              position: "absolute",
              top: -dashThickness / 2,
              left: -dashThickness / 2,
              width: circleSize + dashThickness,
              height: circleSize + dashThickness,
              borderRadius: "50%",
              border: "2px dashed #dc2626",
              boxSizing: "border-box",
              animation: "dash-rotate 10s linear infinite",
              pointerEvents: "none",
              transformOrigin: "center",
              zIndex: 3,
            }}
          />
        )}
        <div
          style={{
            width: circleSize,
            height: circleSize,
            borderRadius: "50%",
            background: fillColor,
            border: `${borderWidth}px solid ${borderColor}`,
            boxShadow: selectionShadow,
            transform: `scale(${scaleAmount})`,
            transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 2,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 9,
          color: "text.primary",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {showPressures && typeof pressure === "number"
          ? `${label} (${pressure.toFixed(2)} ${pressureUnit ?? ""})`
          : label}
      </div>
    </>
  );
}

export default memo(PressureNode);
