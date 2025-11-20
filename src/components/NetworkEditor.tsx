"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  MarkerType,
  type NodesChange,
  applyNodeChanges,
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
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  historyIndex?: number;
  historyLength?: number;
  onNetworkChange?: (updatedNetwork: NetworkState) => void;
  height?: string | number;
};

export function NetworkEditor({
  network,
  onSelect,
  selectedId,
  selectedType,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  historyIndex = 0,
  historyLength = 0,
  onNetworkChange,
  height = 520,
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
        },
        width: 20,
        height: 20,
      })),
    [network.nodes, selectedId, selectedType]
  );

  const [localNodes, setLocalNodes] = useState<Node[]>(rfNodes);
  useEffect(() => setLocalNodes(rfNodes), [rfNodes]);

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe) => ({
        id: pipe.id,
        source: pipe.startNodeId,
        target: pipe.endNodeId,
        label: `${pipe.length} m`,
        type: "smoothstep",
        style: {
          strokeWidth: selectedType === "pipe" && selectedId === pipe.id ? 4 : 2,
          stroke: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
        },
      })),
    [network.pipes, selectedId, selectedType]
  );

  const nodeTypes = useMemo(() => ({ circular: CircularNode }), []);

  const defaultEdgeOptions: DefaultEdgeOptions = {
    style: { strokeWidth: 2, stroke: "#94a3b8" },
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  };

  const handleNodesChange = useCallback(
    (changes: NodesChange<Node>[]) => {
      setLocalNodes((nds) => applyNodeChanges(changes, nds));

      const endedDragChanges = changes.filter(
        (c): c is Extract<NodesChange<Node>[number], { type: "position"; dragging: false }> =>
          c.type === "position" && c.dragging === false && !!c.position
      );

      if (endedDragChanges.length > 0 && onNetworkChange) {
        onNetworkChange({
          ...network,
          nodes: network.nodes.map((node) => {
            const change = endedDragChanges.find((c) => c.id === node.id);
            return change ? { ...node, position: change.position! } : node;
          }),
        });
      }
    },
    [network, onNetworkChange]
  );

  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #e2e8f0",
        position: "relative",
        flex: 1,
      }}
    >
      {/* Toolbar */}
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
            cursor: canUndo ? "pointer" : "not-allowed",
          }}
          title="Undo (Ctrl+Z)"
        >
          ↺ Undo
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            background: canRedo ? "#10b981" : "#cbd5e1",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: "600",
            cursor: canRedo ? "pointer" : "not-allowed",
          }}
          title="Redo (Ctrl+Y)"
        >
          ↻ Redo
        </button>

        <div style={{ fontSize: "13px", color: "#64748b", marginLeft: "auto" }}>
          {canUndo || canRedo ? `${historyIndex + 1} / ${historyLength}` : "No history"}
        </div>
      </div>

      {/* React Flow */}
      <div style={{ height: "100%", paddingTop: 48 }}>
        <ReactFlow
          nodes={localNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id, "node")}
          onEdgeClick={(_, edge) => onSelect(edge.id, "pipe")}
          onPaneClick={() => onSelect(null, null)}
          onNodesChange={handleNodesChange}
          // Correct way to hide connection indicator halo
          connectionLineStyle={{ stroke: "#94a3b8", strokeWidth: 2 }}
        >
          <Background />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => (n.data?.isSelected ? "#f59e0b" : "#5a5a5cff")}
            style={{ background: "#f8f5f9" }}
          />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}