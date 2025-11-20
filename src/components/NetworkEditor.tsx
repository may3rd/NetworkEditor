"use client";

import { useMemo, useCallback } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CircularNode from "@/components/CircularNode";

import { NetworkState } from "@/lib/types";

type Props = {
  network: NetworkState;
  onSelect: (id: string | null, type: "node" | "pipe" | null) => void;
  selectedId: string | null;
  selectedType: "node" | "pipe" | null;
  height?: string | number;
};

export function NetworkEditor({
  network,
  onSelect,
  selectedId,
  selectedType,
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

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe) => ({
        id: pipe.id,
        source: pipe.startNodeId,
        target: pipe.endNodeId,
        label: `${pipe.length} m`,
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
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
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
  );
}
