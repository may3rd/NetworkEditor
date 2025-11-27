// components/PressureNode.tsx

import { memo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@mui/material";

type NodeRole = "source" | "sink" | "middle" | "isolated" | "neutral";

type NodeData = {
  label: string;
  labelLines?: string[];
  isSelected?: boolean;
  showPressures?: boolean;
  pressure?: number;
  pressureUnit?: string;
  flowRole?: NodeRole;
  needsAttention?: boolean;
  forceLightMode?: boolean;
  rotation?: number;
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
  isolated: "#64748b", // Slate 500
  neutral: "#60a5fa", // Blue 400
  attention: "#f87171", // Red 400
};

function PressureNode({ data }: { data: NodeData }) {
  const theme = useTheme();
  const isDark = !data.forceLightMode && theme.palette.mode === "dark";

  const {
    label,
    isSelected,
    showPressures,
    pressure,
    pressureUnit,
    flowRole = "neutral",
    needsAttention = false,
    rotation = 0,
  } = data;

  const roleColors = isDark ? ROLE_COLORS_DARK : ROLE_COLORS_LIGHT;
  const roleColor = roleColors[flowRole] ?? roleColors.neutral;
  const attentionColor = roleColors.attention;

  // If forced light mode, use hardcoded light mode colors, otherwise use theme
  const textPrimary = data.forceLightMode ? "#000000" : theme.palette.text.primary;
  const paperBackground = data.forceLightMode ? "#ffffff" : theme.palette.background.paper;

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
    background: needsAttention ? attentionColor : textPrimary,
    width: 7,
    height: 7,
    zIndex: 0,
  };

  // Determine handle positions based on rotation
  // 0: Target Left, Source Right
  // 90: Target Top, Source Bottom
  // 180: Target Right, Source Left
  // 270: Target Bottom, Source Top
  let targetPos = Position.Left;
  let sourcePos = Position.Right;

  switch (rotation % 360) {
    case 90:
      targetPos = Position.Top;
      sourcePos = Position.Bottom;
      break;
    case 180:
      targetPos = Position.Right;
      sourcePos = Position.Left;
      break;
    case 270:
      targetPos = Position.Bottom;
      sourcePos = Position.Top;
      break;
    default: // 0
      targetPos = Position.Left;
      sourcePos = Position.Right;
      break;
  }

  return (
    <>
      <Handle
        type="target"
        position={targetPos}
        style={handleStyle}
        id="target"
      />
      <Handle
        type="source"
        position={sourcePos}
        style={handleStyle}
        id="source"
      />

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
          fontSize: 9,
          color: "text.primary", // This MUI system prop automatically uses theme.palette.text.primary
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          // Add a text shadow in dark mode for better readability against complex backgrounds if needed,
          // but usually text.primary handles contrast well.
        }}
      >
        {data.labelLines && data.labelLines.length > 0 ? (
          data.labelLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))
        ) : (
          showPressures && typeof pressure === "number"
            ? `${label} (${pressure.toFixed(2)} ${pressureUnit ?? ""})`
            : label
        )}
      </div>
    </>
  );
}

export default memo(PressureNode);


