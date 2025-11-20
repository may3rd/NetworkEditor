"use client";

import { useMemo, useCallback, useEffect, Key } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  MarkerType,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CircularNode from "@/components/CircularNode";

import { NetworkState } from "@/lib/types";

type Props = {
  network: NetworkState;
  onSelect: (id: string | null, type: "node" | "pipe" | null) => void;
  selectedId: string | null;
  selectedType: "node" | "pipe" | null;
  onDelete?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  height?: string | number;
};

export function NetworkEditor({
  network,
  onSelect,
  selectedId,
  selectedType,
  onDelete,
  onUndo,
  canUndo = false,
  height = 520
}: Props) {
  const rfNodes = useMemo<Node[]>(
    () =>
      network.nodes.map((node) => ({
        id: node.id,
        type: "circular",
        position: node.position,
        data: {
          label: node.label,
          isSelected: selectedType === "node" && selectedId === node.id,
        },// ← These two lines fix the blank MiniMap
        width: 20,   // or any reasonable value that fits your labels
        height: 20,
        // Alternative (more precise if labels vary a lot):
        // measured: { width: 140, height: 50 },
      })),
    [network.nodes, selectedId, selectedType]
  );

  // Define rectangular (orthogonal) edges with right-angle routing
const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: "#94a3b8" },
  type: "smoothstep",           // "smoothstep" or "step" gives perfect right angles
  animated: false,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#94a3b8",
  },
};

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe) => ({
        id: pipe.id,
        source: pipe.startNodeId,
        target: pipe.endNodeId,
        label: `${pipe.length} m`,
        type: "smoothstep",
        style: {
          strokeWidth: selectedType === "pipe" && selectedId === pipe.id ? 1 : 1,
          stroke: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
        },
        markerEnd: {
          type: "arrowclosed",
          color: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
        },
      })),
    [network.pipes, selectedId, selectedType]
  );

  // Register custom node types
  const nodeTypes = useMemo(
    () => ({
      circular: CircularNode,
    }),
    []
  );

  // New: Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!selectedId || !selectedType) return;

      // Prevent deletion while typing in inputs
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      e.preventDefault();

      if (window.confirm(`Delete this ${selectedType}?`)) {
        onDelete?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedType, onDelete]);

  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #e2e8f0",
        flex: 1,
        position: "relative",
      }}
    >
      {/** Toolbar - fixed at the top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          zIndex: 10,
          gap: 12,
        }}
      >
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            background: canUndo ? "#f59e0b" : "#cbd5e1",
            color: canUndo ? "#000" : "#64748b",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: "600",
            fontSize: "14px",
            cursor: canUndo ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            boxShadow: canUndo ? "0 2px 6px rgba(251, 158, 11, 0.3)" : "none",
          }}
          title="Undo last deletion (Ctrl+Z)"
        >
          ↺ Undo
        </button>

        <div style={{ fontSize: "13px", color: "#64748b" }}>
          {canUndo ? "Last action can be undone" : "No actions to undo"}
        </div>
      </div>
      
      {/* React Flow – offset by toolbar height */}
      <div style={{ height: "100%", paddingTop: 48 }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id, "node")}
          onEdgeClick={(_, edge) => onSelect(edge.id, "pipe")}
          onPaneClick={() => onSelect(null, null)}
        >    
          <Background />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => 
              node.data?.isSelected ? "#f59e0b" : "#5a5a5cff"}
            maskColor="rgba(255, 255, 255, 0.8)"
            style = {{ background: "#f8f5f9" }}
          />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
