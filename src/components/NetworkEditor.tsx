"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NetworkState } from "@/lib/types";

type Props = {
  network: NetworkState;
  onSelect: (id: string | null, type: "node" | "pipe" | null) => void;
  height?: string | number;
};

export function NetworkEditor({ network, onSelect, height = 520 }: Props) {
  const rfNodes = useMemo<Node[]>(
    () =>
      network.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: { label: node.label },
      })),
    [network.nodes]
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe) => ({
        id: pipe.id,
        source: pipe.startNodeId,
        target: pipe.endNodeId,
        label: `${pipe.length} m`,
      })),
    [network.pipes]
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onNodeClick={(_, node) => onSelect(node.id, "node")}
        onEdgeClick={(_, edge) => onSelect(edge.id, "pipe")}
        onPaneClick={() => onSelect(null, null)}
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
