// components/PressureNode.tsx

import { memo } from "react";
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
    isSelected,
    showPressures,
    pressure,
    pressureUnit,
    label,
    flowRole = "neutral",
    needsAttention = false,
  } = data;

  const fillColor = ROLE_COLORS[flowRole] ?? ROLE_COLORS.neutral;
  const borderAlert = needsAttention;
  const borderColor = borderAlert ? "#dc2626" : "#1e293b";
  const borderWidth = borderAlert ? 2 : 1;
  const baseShadow = "0 4px 12px rgba(0,0,0,0.15)";
  const selectionShadow = isSelected
    ? `${baseShadow}, 0 0 0 2px rgba(245, 158, 11, 0.4)`
    : baseShadow;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 1 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 1 }} />

      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: fillColor,
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: selectionShadow,
          transition: "background 0.2s ease, box-shadow 0.2s ease",
        }}
      />

      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 9,
          color: "#0f172a",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {showPressures && typeof pressure === "number"
          ? `${label} (${pressure.toFixed(1)} ${pressureUnit ?? ""})`
          : label}
      </div>
    </>
  );
}

export default memo(PressureNode);
