// components/PressureNode.tsx

import { memo, useState, useRef, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@mui/material";
import { convertUnit } from "@/lib/unitConversion";
import { HoverCard } from "./HoverCard";
import { NodeProps } from "@/lib/types";

type NodeRole = "source" | "sink" | "middle" | "isolated" | "neutral";

type NodeData = {
  label: string;
  labelLines?: string[];
  isSelected?: boolean;
  showPressures?: boolean;
  pressure?: number;
  pressureUnit?: string;
  displayPressureUnit?: string;
  flowRole?: NodeRole;
  needsAttention?: boolean;
  forceLightMode?: boolean;
  rotation?: number;
  node?: NodeProps;
  isConnectingMode?: boolean;
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
    displayPressureUnit,
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

  // Handle colors
  const sourceColor = isDark ? "#60a5fa" : "#3b82f6"; // Blue
  const targetColor = isDark ? "#f87171" : "#ef4444"; // Red

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

  const isVertical = targetPos === Position.Top || targetPos === Position.Bottom;
  const handleWidth = isVertical ? 4 : 4;
  const handleHeight = isVertical ? 4 : 4;
  const borderRadius = 0;

  const isConnectingMode = data.isConnectingMode as boolean;

  const commonHandleStyle: CSSProperties = {
    opacity: isConnectingMode ? 1 : 0, // Only show in connecting mode
    border: "none",
    zIndex: isConnectingMode ? 100 : -1, // Bring to front in connecting mode
    borderRadius: borderRadius,
    width: handleWidth,
    height: handleHeight,
    pointerEvents: isConnectingMode ? "all" : "none", // Only interactive in connecting mode
  };

  const getHandlePositionStyle = (pos: Position): CSSProperties => {
    const offset = isHovered || isConnectingMode ? -1 : 3; // Pull handle inward by 3px normally, 0px on hover/connecting
    switch (pos) {
      case Position.Left:
        return { left: offset };
      case Position.Right:
        return { right: offset };
      case Position.Top:
        return { top: offset };
      case Position.Bottom:
        return { bottom: offset };
      default:
        return {};
    }
  };

  return (
    <div
      onMouseEnter={!isConnectingMode ? handleMouseEnter : undefined}
      onMouseLeave={!isConnectingMode ? handleMouseLeave : undefined}
      onMouseMove={!isConnectingMode ? handleMouseMove : undefined}
      style={{ position: "relative" }}
    >
      <Handle
        type="target"
        position={targetPos}
        style={{
          ...commonHandleStyle,
          ...getHandlePositionStyle(targetPos),
          background: targetColor,
        }}
        id="target"
      />
      <Handle
        type="source"
        position={sourcePos}
        style={{
          ...commonHandleStyle,
          ...getHandlePositionStyle(sourcePos),
          background: sourceColor,
        }}
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
          position: "absolute",
          top: circleSize + 4,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          fontSize: 9,
          color: textPrimary,
          background: paperBackground,
          padding: "2px 4px",
          borderRadius: 4,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          border: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        {data.labelLines && data.labelLines.length > 0 ? (
          data.labelLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))
        ) : (
          showPressures && typeof pressure === "number"
            ? `${label} (${convertUnit(pressure, pressureUnit, displayPressureUnit || pressureUnit).toFixed(2)} ${displayPressureUnit || pressureUnit || ""})`
            : label
        )}
      </div>

      {isHovered && data.node && (
        <HoverCard
          title={data.node.label}
          subtitle="Node Properties"
          x={hoverPos.x}
          y={hoverPos.y}
          rows={[
            { label: "Pressure", value: typeof data.node.pressure === 'number' ? `${convertUnit(data.node.pressure, data.node.pressureUnit, data.displayPressureUnit || data.node.pressureUnit).toFixed(2)} ${data.displayPressureUnit || data.node.pressureUnit}` : "N/A" },
            { label: "Temperature", value: typeof data.node.temperature === 'number' ? `${data.node.temperature.toFixed(2)} ${data.node.temperatureUnit}` : "N/A" },
            { label: "Fluid", value: data.node.fluid?.id || "None" },
            { label: "Phase", value: data.node.fluid?.phase || "N/A" },
          ]}
        />
      )}
    </div>
  );
}

export default memo(PressureNode);


