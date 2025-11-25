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
  type NodeChange,
  MarkerType,
  applyNodeChanges,
  type DefaultEdgeOptions,
  type HandleType,
  type OnConnectStartParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PressureNode from "@/components/PressureNode";
import { NetworkState, type NodeProps, type PipeProps } from "@/lib/types";
import { recalculatePipeFittingLosses } from "@/lib/fittings";

const ADD_NODE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path fill='#0f172a' d='M11 0h2v24h-2zM0 11h24v2H0z'/></svg>"
)}") 12 12, auto`;

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
  showPressures?: boolean;
  setShowPressures?: (show: boolean) => void;
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
  showPressures: externalShowPressures,
  setShowPressures: externalSetShowPressures,
}: Props) {
  const [internalShowPressures, setInternalShowPressures] = useState(false);
  const showPressures = externalShowPressures ?? internalShowPressures;
  const setShowPressures = externalSetShowPressures ?? setInternalShowPressures;

  const mapNodeToReactFlow = useCallback(
    (node: NodeProps, isSelected: boolean): Node => ({
      id: node.id,
      type: "pressure",
      position: { ...node.position },
      data: {
        label: node.label,
        isSelected,
        showPressures,
        pressure: node.pressure,
        pressureUnit: node.pressureUnit,
      },
      width: 20,
      height: 20,
      draggable: true,
      connectable: true,
    }),
    []
  );

  const rfNodes = useMemo<Node[]>(
    () =>
      network.nodes.map(node => {
        const isSelected = selectedType === "node" && selectedId === node.id;
        return {
          id: node.id,
          type: "pressure",
          position: { ...node.position },
          data: {
            label: node.label,
            isSelected,
            showPressures,
            pressure: node.pressure,
            pressureUnit: node.pressureUnit,
          },
          width: 20,
          height: 20,
          draggable: true,
          connectable: true,
        };
      }),
    [network.nodes, selectedId, selectedType, showPressures]
  );

  const [localNodes, setLocalNodes] = useState<Node[]>(rfNodes);
  useEffect(() => setLocalNodes(rfNodes), [rfNodes]);

  useEffect(() => {
    if (selectedType === "pipe" && selectedId) {
      const selectedPipe = network.pipes.find(pipe => pipe.id === selectedId);
      console.log("[PipeDebug] Selected pipe fluid:", selectedPipe?.fluid);
    }
  }, [selectedType, selectedId, network.pipes]);

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe) => {
        const isSelectedPipe = selectedType === "pipe" && selectedId === pipe.id;
        let label: string;
        if (pipe.pipeSectionType === "control valve") {
          label = "CV";
        } else if (pipe.pipeSectionType === "orifice") {
          label = "RO";
        } else {
          const roundedLength =
            typeof pipe.length === "number"
              ? pipe.length.toFixed(3)
              : Number(pipe.length ?? 0).toFixed(3);
          label = `${roundedLength} ${pipe.lengthUnit ?? ""}`.trim();
        }
        if (
          showPressures &&
          pipe.pressureDropCalculationResults?.totalSegmentPressureDrop !== undefined
        ) {
          const deltaP = pipe.pressureDropCalculationResults.totalSegmentPressureDrop / 1000; // Pa to kPa
          label += `, ΔP: ${deltaP.toFixed(1)} kPa`;
        }
        return {
          id: pipe.id,
          source: pipe.startNodeId,
          target: pipe.endNodeId,
          label,
          labelStyle: {
            fontSize: "9px",
            fontWeight: 500,
            fill: isSelectedPipe ? "#92400e" : "#0f172a",
          },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 4,
          labelBgStyle: {
            fill: isSelectedPipe ? "#fffbeb" : "#ffffff",
            fillOpacity: 0.92,
            stroke: isSelectedPipe ? "#f59e0b" : "#cbd5f5",
            strokeWidth: 0.5,
          },
          type: "smoothstep",
          style: {
            strokeWidth: isSelectedPipe ? 2 : 1,
            stroke: isSelectedPipe ? "#f59e0b" : "#94a3b8",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelectedPipe ? "#f59e0b" : "#94a3b8",
          },
        };
      }),
    [network.pipes, selectedId, selectedType, showPressures]
  );

  const nodeTypes = useMemo(() => ({ pressure: PressureNode }), []);

  const defaultEdgeOptions: DefaultEdgeOptions = {
    style: { strokeWidth: 2, stroke: "#94a3b8" },
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      // Update local nodes for smooth dragging feedback
      setLocalNodes((nds) => applyNodeChanges(changes, nds));
  
      // Detect drag-end events (dragging: false + position exists)
      const dragEndedChanges = changes.filter(
        (c): c is { id: string; type: "position"; dragging: false; position: { x: number; y: number } } =>
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
      const existingConnection = network.pipes.find(pipe => {
        const connectsForward = pipe.startNodeId === connection.source && pipe.endNodeId === connection.target;
        const connectsBackward = pipe.startNodeId === connection.target && pipe.endNodeId === connection.source;
        return connectsForward || connectsBackward;
      });

      if (existingConnection) {
        return; // Silently prevent duplicate connection
      }

      const startNode = network.nodes.find(node => node.id === connection.source);
      const gasFlowModel: PipeProps["gasFlowModel"] =
        startNode?.fluid?.phase?.toLowerCase() === "gas" ? "adiabatic" : undefined;
      const newPipe = {
        id: `pipe-${connection.source}-${connection.target}-${Date.now()}`,
        startNodeId: connection.source,
        endNodeId: connection.target,
        pipeSectionType: "pipeline" as "pipeline" | "control valve" | "orifice",
        massFlowRate: 1000, // Default mass flow rate
        massFlowRateUnit: "kg/h",
        length: 100, // Default length
        lengthUnit: "m",
        diameter: 102.26, // Default diameter
        diameterUnit: "mm",
        roughness: 0.0457, // Default roughness
        roughnessUnit: "mm",
        fluid: startNode?.fluid ? { ...startNode.fluid } : undefined,
        gasFlowModel,
        direction: "forward",
        boundaryPressure: startNode?.pressure,
        boundaryPressureUnit: startNode?.pressureUnit,
        boundaryTemperature: startNode?.temperature,
        boundaryTemperatureUnit: startNode?.temperatureUnit,
        erosionalConstant: 100,
        pipingFittingSafetyFactor: 1,
        fittingType: "LR",
      };

      const calculatedPipe = recalculatePipeFittingLosses(newPipe);

      onNetworkChange({
        ...network,
        pipes: [...network.pipes, calculatedPipe],
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
      <EditorCanvas {...{ network, onSelect, selectedId, selectedType, onDelete, onUndo, onRedo, canUndo, canRedo, historyIndex, historyLength, onNetworkChange, height, localNodes, setLocalNodes, rfEdges, nodeTypes, defaultEdgeOptions, handleNodesChange, handleConnect, mapNodeToReactFlow, showPressures, setShowPressures }} />
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
  mapNodeToReactFlow,
  showPressures,
  setShowPressures,
  onDelete,
  selectedId,
  selectedType,
}: Props & {
  localNodes: Node[];
  setLocalNodes: React.Dispatch<React.SetStateAction<Node<any, string | undefined>[]>>;
  rfEdges: Edge[];
  nodeTypes: { [key: string]: any };
  defaultEdgeOptions: DefaultEdgeOptions;
  handleNodesChange: (changes: NodeChange<Node>[]) => void;
  handleConnect: (connection: Connection) => void;
  mapNodeToReactFlow: (node: NodeProps, isSelected: boolean) => Node;
  showPressures: boolean;
  setShowPressures: (show: boolean) => void;
  onDelete?: () => void;
  selectedId: string | null;
  selectedType: "node" | "pipe" | null;
}) {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [panModeEnabled, setPanModeEnabled] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const snapGrid: [number, number] = [5, 5];
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<HandleType | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const NODE_SIZE = 20;

  const onConnectStart = useCallback(
    (_: MouseEvent, { nodeId, handleType }: OnConnectStartParams) => {
      connectingNodeId.current = nodeId;
      connectingHandleType.current = handleType ?? null;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const fromId = connectingNodeId.current;
      const handleType = connectingHandleType.current;

      // Reset the ref
      connectingNodeId.current = null;
      connectingHandleType.current = null;

      const pointer = "changedTouches" in event ? event.changedTouches[0] : event;
      const { clientX, clientY } = pointer;

      // Check if the drop was on the pane and we have a source node
      if (!fromId || !target.classList.contains("react-flow__pane")) {
        return;
      }

      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
      const existingNodeAtPointer = getNodes().find((node) => {
        const width = node.width ?? 20;
        const height = node.height ?? 20;
        const nodePosition = (node as { positionAbsolute?: { x: number; y: number } }).positionAbsolute ?? node.position;
        return (
          flowPosition.x >= nodePosition.x &&
          flowPosition.x <= nodePosition.x + width &&
          flowPosition.y >= nodePosition.y &&
          flowPosition.y <= nodePosition.y + height
        );
      });

      if (existingNodeAtPointer && existingNodeAtPointer.id !== fromId) {
        const connection: Connection =
          handleType === "target"
            ? { source: existingNodeAtPointer.id, target: fromId }
            : { source: fromId, target: existingNodeAtPointer.id };
        handleConnect(connection);
        connectingNodeId.current = null;
        connectingHandleType.current = null;
        return;
      }

      if (!onNetworkChange) {
        return;
      }

      const position = screenToFlowPosition({ x: clientX, y: clientY });

      if (snapToGrid) {
        position.x = Math.round(position.x / snapGrid[0]) * snapGrid[0];
        position.y = Math.round(position.y / snapGrid[1]) * snapGrid[1];
      }

      const newNodeId = `node-${Date.now()}`;
      const sourceNode = network.nodes.find((node) => node.id === fromId);
      const copiedFluid = sourceNode?.fluid ? { ...sourceNode.fluid } : { id: "fluid", phase: "liquid" };
      const newNode = {
        id: newNodeId,
        label: `Node ${network.nodes.length + 1}`,
        position: {
          x: position.x - NODE_SIZE / 2,
          y: position.y - NODE_SIZE / 2,
        },
        fluid: copiedFluid,
        temperature: sourceNode?.temperature,
        temperatureUnit: sourceNode?.temperatureUnit,
      };

      const startsFromSourceHandle = handleType !== "target";

      const pipeStartNodeId = startsFromSourceHandle ? fromId : newNodeId;
      const pipeStartNode =
        pipeStartNodeId === newNodeId
          ? newNode
          : network.nodes.find(node => node.id === pipeStartNodeId);
      const gasFlowModel: PipeProps["gasFlowModel"] =
        pipeStartNode?.fluid?.phase?.toLowerCase() === "gas" ? "adiabatic" : undefined;
      const newPipe = {
        id: `pipe-${startsFromSourceHandle ? fromId : newNodeId}-${startsFromSourceHandle ? newNodeId : fromId}-${Date.now()}`,
        startNodeId: pipeStartNodeId,
        endNodeId: startsFromSourceHandle ? newNodeId : fromId,
        pipeSectionType: "pipeline" as "pipeline" | "control valve" | "orifice",
        massFlowRate: 1000, // Default mass flow rate
        massFlowRateUnit: "kg/h",
        length: 100, // Default length
        lengthUnit: "m",
        diameter: 102.26, // Default diameter
        diameterUnit: "mm",
        roughness: 0.0457, // Default roughness
        roughnessUnit: "mm",
        fluid: pipeStartNode?.fluid ? { ...pipeStartNode.fluid } : undefined,
        gasFlowModel,
        direction: "forward",
        boundaryPressure: sourceNode?.pressure, // Use source node pressure
        boundaryPressureUnit: sourceNode?.pressureUnit,
        boundaryTemperature: sourceNode?.temperature,
        boundaryTemperatureUnit: sourceNode?.temperatureUnit,
        erosionalConstant: 100,
        pipingFittingSafetyFactor: 1,
        fittingType: "LR",
      };

      const calculatedPipe = recalculatePipeFittingLosses(newPipe);

      onNetworkChange({
        ...network,
        nodes: [...network.nodes, newNode],
        pipes: [...network.pipes, calculatedPipe],
      });

      setLocalNodes((current) => [
        ...current,
        mapNodeToReactFlow(newNode, false),
      ]);
    },
    [
      screenToFlowPosition,
      getNodes,
      onNetworkChange,
      network.nodes,
      network.pipes,
      snapToGrid,
      snapGrid,
      handleConnect,
      setLocalNodes,
      mapNodeToReactFlow,
    ],
  );

  const handlePaneClick = useCallback(
    (event: MouseEvent) => {
      if (isAddingNode && !onNetworkChange) {
        setIsAddingNode(false);
        return;
      }

      if (isAddingNode && onNetworkChange) {
        const pointerPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        let position = { ...pointerPosition };
        if (snapToGrid) {
          position = {
            x: Math.round(position.x / snapGrid[0]) * snapGrid[0],
            y: Math.round(position.y / snapGrid[1]) * snapGrid[1],
          };
        }
        position.x -= NODE_SIZE / 2;
        position.y -= NODE_SIZE / 2;

        const newNodeId = `node-${Date.now()}`;
        const templateFluid =
          network.nodes[0]?.fluid !== undefined
            ? { ...network.nodes[0].fluid }
            : { id: "fluid", phase: "liquid" };
        const liquidDefaults = {
          density: 1000,
          densityUnit: "kg/m3",
          viscosity: 1,
          viscosityUnit: "cP",
        } as const;
        const newNodeFluid =
          templateFluid?.phase?.toLowerCase() === "liquid" || !templateFluid?.phase
            ? { ...templateFluid, ...liquidDefaults }
            : templateFluid;

        const newNode = {
          id: newNodeId,
          label: `Node ${network.nodes.length + 1}`,
          position,
          fluid: newNodeFluid,
          temperature: network.nodes[0]?.temperature,
          temperatureUnit: network.nodes[0]?.temperatureUnit ?? "°C",
          pressure: network.nodes[0]?.pressure,
          pressureUnit: network.nodes[0]?.pressureUnit ?? "kPag",
        };

        onNetworkChange({
          ...network,
          nodes: [...network.nodes, newNode],
        });
        setLocalNodes(current => [
          ...current,
          mapNodeToReactFlow(newNode, true),
        ]);
        setIsAddingNode(false);
        onSelect(newNodeId, "node");
        return;
      }

      onSelect(null, null);
    },
    [isAddingNode, onNetworkChange, screenToFlowPosition, snapToGrid, snapGrid, network, onSelect, mapNodeToReactFlow],
  );

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isAddingNode) return;
      event.preventDefault();
      setIsAddingNode(false);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isAddingNode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.tagName === "BUTTON" ||
          active.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      setIsSpacePanning(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      setIsSpacePanning(false);
    };

    const handleWindowBlur = () => setIsSpacePanning(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const isPanMode = panModeEnabled || isSpacePanning;

  useEffect(() => {
    const wrapper = reactFlowWrapperRef.current;
    if (!wrapper) return;

    const pane = wrapper.querySelector(".react-flow__pane") as HTMLDivElement | null;
    if (!pane) return;

    let cursor = "";
    if (isAddingNode) {
      cursor = ADD_NODE_CURSOR;
    } else if (isPanMode) {
      cursor = "grab";
    }

    pane.style.cursor = cursor;

    return () => {
      pane.style.cursor = "";
    };
  }, [isAddingNode, isPanMode]);

  const canEditNetwork = Boolean(onNetworkChange);
  const editorCursor = isAddingNode ? ADD_NODE_CURSOR : isPanMode ? "grab" : "default";

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
          onClick={() => setIsAddingNode((value) => !value)}
          disabled={!canEditNetwork}
          style={{
            background: isAddingNode ? "#3b82f6" : "#0ea5e9",
            color: "white",
            border: "none",
            padding: "4px 10px",
            borderRadius: 6,
            fontWeight: "600",
            fontSize: "12px",
            cursor: canEditNetwork ? "pointer" : "not-allowed",
            opacity: canEditNetwork ? 1 : 0.6,
          }}
          title="Add node"
        >
          ＋ Add Node
        </button>

        <button
          onClick={onDelete}
          disabled={!canEditNetwork || !selectedId}
          style={{
            background: selectedId ? "#dc2626" : "#cbd5e1",
            color: "white",
            border: "none",
            padding: "4px 10px",
            borderRadius: 6,
            fontWeight: "600",
            fontSize: "12px",
            cursor: canEditNetwork && selectedId ? "pointer" : "not-allowed",
            opacity: canEditNetwork && selectedId ? 1 : 0.6,
          }}
          title="Delete selected item"
        >
          🗑️ Delete
        </button>

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
            fontSize: "12px",
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
            fontSize: "12px",
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
              fontSize: "11px",
              color: "#64748b",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Snap to Grid
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            id="show-grid"
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="show-grid"
            style={{
              fontSize: "11px",
              color: "#64748b",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Show Grid
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            id="pan-mode-toggle"
            type="checkbox"
            checked={panModeEnabled}
            onChange={(e) => setPanModeEnabled(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="pan-mode-toggle"
            style={{
              fontSize: "11px",
              color: "#64748b",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Pan mode
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            id="show-pressures"
            type="checkbox"
            checked={showPressures}
            onChange={(e) => setShowPressures(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="show-pressures"
            style={{
              fontSize: "11px",
              color: "#64748b",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Show Pressures
          </label>
        </div>

        <div style={{ fontSize: "13px", color: "#64748b", marginLeft: "auto" }}>
          {canUndo || canRedo ? `${(historyIndex ?? 0) + 1} / ${historyLength ?? 0}` : "No history"}
        </div>
      </div>

      {/* React Flow */}
      <div
        ref={reactFlowWrapperRef}
        style={{ 
        flex: 1,
        minHeight: 0,
        position: "relative",
        width: "100%",
        cursor: editorCursor,
      }}>
        <ReactFlow
          className={isPanMode ? "pan-mode" : "design-mode"}
          nodes={localNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id, "node")}
          onNodeDragStart={(_, node) => onSelect(node.id, "node")}
          onEdgeClick={(_, edge) => onSelect(edge.id, "pipe")}
          onPaneClick={handlePaneClick}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          snapToGrid={snapToGrid}
          snapGrid={snapGrid}
          connectionMode={ConnectionMode.Strict}
          maxZoom={16}
          minZoom={0.1}
          nodesDraggable={!isPanMode}
          selectionOnDrag={!isPanMode}
          panOnDrag={isPanMode}
          style={{ cursor: editorCursor }}
        >
          {showGrid && <Background className="network-grid" />}
          <MiniMap
            className="network-minimap"
            pannable
            zoomable
            nodeColor={(n) => (n.data?.isSelected ? "#f59e0b" : "#5a5a5cff")}
            style={{ background: "#f8f5f9", opacity: 0.7, width: 140, height: 90 }}
          />
          <Controls />
        </ReactFlow>
        <style jsx global>{`
          .react-flow.design-mode .react-flow__node {
            cursor: default !important;
          }
          .react-flow.pan-mode .react-flow__node {
            cursor: grab !important;
          }
          .network-minimap {
            transition: opacity 0.2s ease;
          }
          .network-minimap:hover {
            opacity: 1 !important;
          }
        `}</style>
      </div>
    </div>
  );
}
