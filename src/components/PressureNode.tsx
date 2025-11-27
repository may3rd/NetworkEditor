// components/PressureNode.tsx

import { memo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@mui/material";

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

const ROLE_COLORS_LIGHT: Record<NodeRole | "attention", string> = {
  source: "#22c55e", // Green 500
  sink: "#f97316",   // Orange 500
  middle: "#3b82f6", // Blue 500
  isolated: "#94a3b8", // Slate 400
  neutral: "#3b82f6", // Blue 500
  attention: "#ef4444", // Red 500
};

const ROLE_COLORS_DARK: Record<NodeRole | "attention", string> = {
  source: "#4ade80", // Green 400
  sink: "#fb923c",   // Orange 400
  middle: "#60a5fa", // Blue 400
  isolated: "#cbd5e1", // Slate 300
  neutral: "#60a5fa", // Blue 400
  attention: "#f87171", // Red 400
};

function PressureNode({ data }: { data: NodeData }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const {
    label,
    isSelected,
    showPressures,
    pressure,
    pressureUnit,
    flowRole = "neutral",
    needsAttention = false,
  } = data;

  const roleColors = isDark ? ROLE_COLORS_DARK : ROLE_COLORS_LIGHT;
  const roleColor = roleColors[flowRole] ?? roleColors.neutral;
  const attentionColor = roleColors.attention;

  // In dark mode, we might want the selected state to be a bit different, 
  // but yellow #fde047 (Yellow 300) usually pops well on dark too.
  const fillColor = isSelected ? "#fde047" : roleColor;

  // Use theme text color for border to adapt to light/dark mode automatically
  const borderColor = needsAttention ? attentionColor : theme.palette.text.primary;
  const borderWidth = needsAttention ? 0 : 1;

  const baseShadow = isDark
    ? "0 4px 12px rgba(0,0,0,0.5)"
    : "0 4px 12px rgba(0,0,0,0.15)";

  const selectionShadow = isSelected
    ? `${baseShadow}, 0 0 0 1px rgba(234, 179, 8, 0.5)`
    : baseShadow;

  const scaleAmount = isSelected ? 1 : 1;
  const circleSize = 20;
  const dashThickness = needsAttention ? 2 : 0;

  const handleStyle: CSSProperties = {
    opacity: 1,
    border: "none",
    background: needsAttention ? attentionColor : theme.palette.text.primary,
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
              border: `2px dashed ${attentionColor}`,
              boxSizing: "border-box",
              animation: "dash-rotate 6s linear infinite",
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
          color: "text.primary", // This MUI system prop automatically uses theme.palette.text.primary
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          // Add a text shadow in dark mode for better readability against complex backgrounds if needed,
          // but usually text.primary handles contrast well.
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


