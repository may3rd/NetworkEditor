"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  type Edge,
  type Node,
  type Connection,
  type NodesChange,
  MarkerType,
  applyNodeChanges,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PressureNode from "@/components/PressureNode";
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
        type: "pressure",
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
      network.pipes.map((pipe) => {
        const roundedLength = typeof pipe.length === "number" ? pipe.length.toFixed(3) : Number(pipe.length ?? 0).toFixed(3);
        return {
          id: pipe.id,
          source: pipe.startNodeId,
          target: pipe.endNodeId,
          label: `${roundedLength} ${pipe.lengthUnit ?? ""}`.trim(),
          labelStyle: {
            fontSize: "8px",
            fill: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
          },
          type: "smoothstep",
          style: {
            strokeWidth: selectedType === "pipe" && selectedId === pipe.id ? 2 : 1,
            stroke: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: selectedType === "pipe" && selectedId === pipe.id ? "#f59e0b" : "#94a3b8",
          },
        };
      }),
    [network.pipes, selectedId, selectedType]
  );

  const nodeTypes = useMemo(() => ({ pressure: PressureNode }), []);

  const defaultEdgeOptions: DefaultEdgeOptions = {
    style: { strokeWidth: 2, stroke: "#94a3b8" },
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  };

  const handleNodesChange = useCallback(
    (changes: NodesChange<Node>[]) => {
      // Update local nodes for smooth dragging feedback
      setLocalNodes((nds) => applyNodeChanges(changes, nds));
  
      // Detect drag-end events (dragging: false + position exists)
      const dragEndedChanges = changes.filter(
        (c): c is Extract<NodesChange<Node>[number], { type: "position"; dragging: false }> =>
          c.type === "position" && c.dragging === false && c.position !== undefined
      );
  
      if (dragEndedChanges.length > 0) {
        // Persist positions to parent state
        if (onNetworkChange) {
          onNetworkChange({
            ...network,
            nodes: network.nodes.map((node) => {
              const change = dragEndedChanges.find((c) => c.id === node.id);
              return change ? { ...node, position: change.position! } : node;
            }),
          });
        }
      }
    },
    [network, onNetworkChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !onNetworkChange) return;

      // Prevent connecting a node to itself
      if (connection.source === connection.target) {
        return;
      }

      // Check if a connection already exists between these two nodes (in either direction)
      const existingConnection = network.pipes.find(
        (pipe) =>
          (pipe.startNodeId === connection.source && pipe.endNodeId === connection.target)
      );

      if (existingConnection) {
        return; // Silently prevent duplicate connection
      }

      const newPipe = {
        id: `pipe-${connection.source}-${connection.target}-${Date.now()}`,
        startNodeId: connection.source,
        endNodeId: connection.target,
        length: 100, // Default length
        diameter: 0.1, // Default diameter
      };

      onNetworkChange({
        ...network,
        pipes: [...network.pipes, newPipe],
      });
    },
    [network, onNetworkChange]
  );

  // ── Keyboard Delete (Backspace / Delete) ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!selectedId || !selectedType) return;

      // Do not delete while typing in an input field
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      e.preventDefault();

      if (window.confirm(`Delete this ${selectedType}?`)) {
        onDelete?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedType, onDelete]);
  // ───────────────────────────────────────────────────────────────────────

  return (
    <ReactFlowProvider>
      <EditorCanvas {...{ network, onSelect, selectedId, selectedType, onDelete, onUndo, onRedo, canUndo, canRedo, historyIndex, historyLength, onNetworkChange, height, localNodes, setLocalNodes, rfEdges, nodeTypes, defaultEdgeOptions, handleNodesChange, handleConnect }} />
    </ReactFlowProvider>
  );
}

function EditorCanvas({
  network,
  onSelect,
  onNetworkChange,
  height,
  localNodes,
  setLocalNodes,
  rfEdges,
  nodeTypes,
  defaultEdgeOptions,
  handleNodesChange,
  handleConnect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyIndex,
  historyLength,
}: Props & {
  localNodes: Node[];
  setLocalNodes: React.Dispatch<React.SetStateAction<Node<any, string | undefined>[]>>;
  rfEdges: Edge[];
  nodeTypes: { [key: string]: any };
  defaultEdgeOptions: DefaultEdgeOptions;
  handleNodesChange: (changes: NodesChange<Node>[]) => void;
  handleConnect: (connection: Connection) => void;
}) {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const snapGrid: [number, number] = [5, 5];
  const connectingNodeId = useRef<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnectStart = useCallback(
    (_: React.MouseEvent<Element, MouseEvent> | React.TouchEvent<Element>, { nodeId }: { nodeId: string | null }) => {
      connectingNodeId.current = nodeId;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const fromId = connectingNodeId.current;

      // Reset the ref
      connectingNodeId.current = null;

      // Check if the drop was on the pane and we have a source node
      if (!fromId || !target.classList.contains("react-flow__pane") || !onNetworkChange) {
        return;
      }

      const { clientX, clientY } = "changedTouches" in event ? event.changedTouches[0] : event;

      const position = screenToFlowPosition({ x: clientX, y: clientY });

      if (snapToGrid) {
        position.x = Math.round(position.x / snapGrid[0]) * snapGrid[0];
        position.y = Math.round(position.y / snapGrid[1]) * snapGrid[1];
      }

      const newNodeId = `node-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        label: `Node ${network.nodes.length + 1}`,
        position,
      };

      const newPipe = {
        id: `pipe-${fromId}-${newNodeId}-${Date.now()}`,
        startNodeId: fromId,
        endNodeId: newNodeId,
        length: 100, // Default length
        diameter: 0.1, // Default diameter
      };

      onNetworkChange({
        nodes: [...network.nodes, newNode],
        pipes: [...network.pipes, newPipe],
      });
    },
    [screenToFlowPosition, onNetworkChange, network.nodes, network.pipes, snapToGrid, snapGrid],
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
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
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
            color: canUndo ? "#000" : "white",
            border: "none",
            padding: "4px 8px",
            borderRadius: 6,
            fontWeight: "600",
            fontSize: "13px",
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
            padding: "4px 8px",
            borderRadius: 6,
            fontWeight: "600",
            fontSize: "13px",
            cursor: canRedo ? "pointer" : "not-allowed",
          }}
          title="Redo (Ctrl+Y)"
        >
          ↻ Redo
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
          <input
            id="snap-to-grid"
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="snap-to-grid"
            style={{
              fontSize: "13px",
              color: "#64748b",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Snap to Grid
          </label>
        </div>

        <div style={{ fontSize: "13px", color: "#64748b", marginLeft: "auto" }}>
          {canUndo || canRedo ? `${(historyIndex ?? 0) + 1} / ${historyLength ?? 0}` : "No history"}
        </div>
      </div>

      {/* React Flow */}
      <div style={{ 
        flex: 1,
        minHeight: 0,
        position: "relative",
        width: "100%",
      }}>
        <ReactFlow
          nodes={localNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id, "node")}
          onNodeDragStart={(_, node) => onSelect(node.id, "node")}
          onEdgeClick={(_, edge) => onSelect(edge.id, "pipe")}
          onPaneClick={() => onSelect(null, null)}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          snapToGrid={snapToGrid}
          snapGrid={snapGrid}
          connectionMode={ConnectionMode.Strict}
          maxZoom={16}
          minZoom={0.1}
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
