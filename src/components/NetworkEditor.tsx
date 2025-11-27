"use client";

import { useMemo, useCallback, useEffect, useState, useRef, type ChangeEventHandler } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Button,
  ButtonGroup,
  Stack,
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Grid3x3 as GridIcon,
  GridOn as GridOnIcon,
  PanTool as PanToolIcon,
  Speed as SpeedIcon,
  DarkMode as DarkModeIcon,
  RotateRight as RotateRightIcon,
  RotateLeft as RotateLeftIcon,
  SwapHoriz as SwapHorizIcon,
  SwapVert as SwapVertIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Image as ExportIcon,
  Visibility as VisibilityIcon,
  TableChart as TableChartIcon,
} from "@mui/icons-material";
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
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PressureNode from "@/components/PressureNode";
import PipeEdge from "@/components/PipeEdge";
import { NetworkState, type NodeProps, type PipeProps } from "@/lib/types";
import { recalculatePipeFittingLosses } from "@/lib/fittings";
import { convertUnit } from "@/lib/unitConversion";
import { useColorMode } from "@/contexts/ColorModeContext";
import { getPipeEdge } from "@/utils/edgeUtils";
import { getPressureNode, validateNodeConfiguration } from "@/utils/nodeUtils";
import ViewSettingsMenu from "@/components/ViewSettingsMenu";
import { type ViewSettings } from "@/lib/types";
import { useCopyPaste } from "@/hooks/useCopyPaste";

const ADD_NODE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path fill='#0f172a' d='M11 0h2v24h-2zM0 11h24v2H0z'/></svg>"
)}") 12 12, auto`;

type NetworkEditorProps = {
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
  forceLightMode?: boolean;
  onLoad?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onToggleSnapshot?: () => void;
  onToggleSummary?: () => void;
};

type NodeFlowRole = "source" | "sink" | "middle" | "isolated" | "neutral";

type NodeFlowState = {
  role: NodeFlowRole;
  needsAttention: boolean;
};

const generateUniquePipeName = (pipes: PipeProps[]): string => {
  let counter = 1;
  while (true) {
    const name = `P-${String(counter).padStart(3, "0")}`;
    if (!pipes.some((p) => p.name === name)) {
      return name;
    }
    counter++;
  }
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
  forceLightMode = false,
  onLoad,
  onSave,
  onExport,
  onToggleSnapshot,
  onToggleSummary,
}: NetworkEditorProps) {
  const theme = useTheme();
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    node: {
      name: true,
      pressure: false,
      temperature: false,
    },
    pipe: {
      name: true,
      length: true,
      deltaP: false,
      velocity: false,
      dPPer100m: false,
    },
  });

  // Sync external showPressures prop with viewSettings (backward compatibility)
  useEffect(() => {
    if (externalShowPressures !== undefined) {
      setViewSettings(prev => ({
        ...prev,
        node: { ...prev.node, pressure: externalShowPressures },
        pipe: { ...prev.pipe, deltaP: externalShowPressures }
      }));
    }
  }, [externalShowPressures]);

  // Sync internal changes back to external prop if provided
  useEffect(() => {
    if (externalSetShowPressures) {
      externalSetShowPressures(viewSettings.node.pressure || viewSettings.pipe.deltaP);
    }
  }, [viewSettings.node.pressure, viewSettings.pipe.deltaP, externalSetShowPressures]);

  const nodeFlowStates = useMemo<Record<string, NodeFlowState>>(() => {
    const PRESSURE_TOLERANCE = 0.001;
    const connectionMap = new Map<
      string,
      { asSource: PipeProps[]; asTarget: PipeProps[] }
    >();

    network.nodes.forEach(node => {
      connectionMap.set(node.id, { asSource: [], asTarget: [] });
    });

    network.pipes.forEach(pipe => {
      connectionMap.get(pipe.startNodeId)?.asSource.push(pipe);
      connectionMap.get(pipe.endNodeId)?.asTarget.push(pipe);
    });

    const normalizeDirection = (pipe: PipeProps) =>
      pipe.direction === "backward" ? "backward" : "forward";

    const states: Record<string, NodeFlowState> = {};

    network.nodes.forEach(node => {
      const connectionEntry = connectionMap.get(node.id);
      const asSource = connectionEntry?.asSource ?? [];
      const asTarget = connectionEntry?.asTarget ?? [];
      const totalConnections = asSource.length + asTarget.length;
      const isIsolated = totalConnections === 0;

      const sourceDirections = asSource.map(normalizeDirection);
      const targetDirections = asTarget.map(normalizeDirection);

      const allSourceForward =
        asSource.length === 0 || sourceDirections.every(direction => direction === "forward");
      const allSourceBackward =
        asSource.length === 0 || sourceDirections.every(direction => direction === "backward");
      const anySourceBackward = sourceDirections.some(direction => direction === "backward");

      const allTargetForward =
        asTarget.length === 0 || targetDirections.every(direction => direction === "forward");
      const allTargetBackward =
        asTarget.length === 0 || targetDirections.every(direction => direction === "backward");
      const anyTargetForward = targetDirections.some(direction => direction === "forward");

      let role: NodeFlowRole = "neutral";
      if (isIsolated) {
        role = "isolated";
      } else if (allSourceForward && allTargetBackward) {
        role = "source";
      } else if (allSourceBackward && allTargetForward) {
        role = "sink";
      } else if (anySourceBackward || anyTargetForward) {
        role = "middle";
      }

      const missingPressure = typeof node.pressure !== "number";
      const missingTemperature = typeof node.temperature !== "number";

      const incomingSourcePipes = asSource.filter(pipe => normalizeDirection(pipe) === "backward");
      const incomingTargetPipes = asTarget.filter(pipe => normalizeDirection(pipe) === "forward");

      const incomingPressures: number[] = [];
      incomingSourcePipes.forEach(pipe => {
        const pressure = pipe.resultSummary?.inletState?.pressure;
        if (typeof pressure === "number") {
          incomingPressures.push(pressure);
        }
      });
      incomingTargetPipes.forEach(pipe => {
        const pressure = pipe.resultSummary?.outletState?.pressure;
        if (typeof pressure === "number") {
          incomingPressures.push(pressure);
        }
      });

      let flowMismatch = false;
      if ((role === "sink" || role === "middle") && !missingPressure && incomingPressures.length > 0) {
        const nodePressurePa = convertUnit(
          node.pressure as number,
          node.pressureUnit ?? "kPag",
          "Pa",
        );
        if (typeof nodePressurePa === "number" && Number.isFinite(nodePressurePa)) {
          const hasMatch = incomingPressures.some(
            stagePressure => Math.abs(stagePressure - nodePressurePa) <= PRESSURE_TOLERANCE,
          );
          flowMismatch = !hasMatch;
        }
      }

      const validation = validateNodeConfiguration(node, network.pipes);
      const needsAttention = missingPressure || missingTemperature || flowMismatch || !validation.isValid;

      // Debug logging
      if (needsAttention) {
        console.log(`Node ${node.label} (${node.id}) needs attention:`, {
          missingPressure,
          missingTemperature,
          flowMismatch,
          invalidConfig: !validation.isValid
        });
      }

      if (!validation.isValid) {
        role = "isolated";
      }

      states[node.id] = { role, needsAttention };
    });

    return states;
  }, [network.nodes, network.pipes]);

  const mapNodeToReactFlow = useCallback(
    (node: NodeProps, isSelected: boolean): Node => {
      return getPressureNode({
        node,
        isSelected,
        viewSettings,
        nodeFlowStates,
        forceLightMode,
      });
    },
    [nodeFlowStates, viewSettings, forceLightMode]
  );

  const rfNodes = useMemo<Node[]>(
    () =>
      network.nodes.map(node => {
        const isSelected = selectedType === "node" && selectedId === node.id;
        return mapNodeToReactFlow(node, isSelected);
      }),
    [network.nodes, selectedId, selectedType, mapNodeToReactFlow]
  );

  const [localNodes, setLocalNodes] = useState<Node[]>(rfNodes);
  const pastedNodeIdsRef = useRef<Set<string> | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (pastedNodeIdsRef.current) {
      const allPresent = Array.from(pastedNodeIdsRef.current).every(id => rfNodes.some(n => n.id === id));
      if (allPresent) {
        const newSelectedIds = new Set(pastedNodeIdsRef.current);
        setSelectedNodeIds(newSelectedIds);
        setLocalNodes(rfNodes.map(n => ({
          ...n,
          selected: newSelectedIds.has(n.id)
        })));
        pastedNodeIdsRef.current = null;
        return;
      }
    }

    // Sync localNodes with rfNodes, but preserve selection state from selectedNodeIds
    setLocalNodes(rfNodes.map(n => ({
      ...n,
      selected: selectedNodeIds.has(n.id) || (selectedType === "node" && selectedId === n.id)
    })));
  }, [rfNodes, selectedId, selectedType]); // Added selectedId/Type dependencies

  const handlePaste = useCallback((ids: string[]) => {
    pastedNodeIdsRef.current = new Set(ids);
  }, []);

  useEffect(() => {
    if (selectedType === "pipe" && selectedId) {
      const selectedPipe = network.pipes.find(pipe => pipe.id === selectedId);
      console.log("[PipeDebug] Selected pipe fluid:", selectedPipe?.fluid);
    }
  }, [selectedType, selectedId, network.pipes]);

  const rfEdges = useMemo<Edge[]>(
    () =>
      network.pipes.map((pipe, index) =>
        getPipeEdge({
          pipe,
          index,
          selectedId,
          selectedType,
          viewSettings,
          theme,
          forceLightMode,
        })
      ),
    [network.pipes, selectedId, selectedType, viewSettings, theme, forceLightMode]
  );

  const nodeTypes = useMemo(() => ({ pressure: PressureNode }), []);
  const edgeTypes = useMemo(() => ({ pipe: PipeEdge }), []);

  const defaultEdgeOptions: DefaultEdgeOptions = {
    style: { strokeWidth: 2, stroke: "#94a3b8" },
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      // Update local nodes for smooth dragging feedback
      setLocalNodes((nds) => applyNodeChanges(changes, nds));

      // Sync selection state
      let selectionChanged = false;
      const newSelectedIds = new Set(selectedNodeIds);

      changes.forEach(c => {
        if (c.type === 'select') {
          selectionChanged = true;
          if (c.selected) newSelectedIds.add(c.id);
          else newSelectedIds.delete(c.id);
        }
      });

      if (selectionChanged) {
        setSelectedNodeIds(newSelectedIds);
      }

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
    [network, onNetworkChange, selectedNodeIds]
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
        name: generateUniquePipeName(network.pipes),
        startNodeId: connection.source,
        endNodeId: connection.target,
        pipeSectionType: "pipeline" as "pipeline" | "control valve" | "orifice",
        massFlowRate: undefined, // Default mass flow rate
        massFlowRateUnit: "kg/h",
        length: undefined, // Default length
        lengthUnit: "m",
        diameter: undefined, // Default diameter
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
      if (e.repeat) return;
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
      e.stopPropagation();

      // Use setTimeout to allow the event loop to clear before blocking with confirm
      // This prevents issues where the dialog closes immediately or flashes
      setTimeout(() => {
        if (window.confirm(`Delete this ${selectedType}?`)) {
          onDelete?.();
        }
      }, 10);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedType, onDelete]);
  // ───────────────────────────────────────────────────────────────────────

  // ── Keyboard Undo/Redo (Ctrl+Z / Ctrl+Y) ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "y" || e.key === "Z" || e.key === "Y")) {
        // Do not trigger if focus is on an input
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

        if (e.key === "z" || e.key === "Z") {
          if (e.shiftKey) {
            if (canRedo) onRedo?.();
          } else {
            if (canUndo) onUndo?.();
          }
        } else if (e.key === "y" || e.key === "Y") {
          if (canRedo) onRedo?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);
  // ───────────────────────────────────────────────────────────────────────

  const handleRotateCW = useCallback(() => {
    if (!selectedId || selectedType !== "node") return;
    const node = network.nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const currentRotation = node.rotation ?? 0;
    const newRotation = (currentRotation + 90) % 360;

    const updatedNodes = network.nodes.map((n) =>
      n.id === selectedId ? { ...n, rotation: newRotation } : n
    );
    onNetworkChange?.({ ...network, nodes: updatedNodes });
  }, [network, selectedId, selectedType, onNetworkChange]);

  const handleRotateCCW = useCallback(() => {
    if (!selectedId || selectedType !== "node") return;
    const node = network.nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const currentRotation = node.rotation ?? 0;
    const newRotation = (currentRotation - 90 + 360) % 360;

    const updatedNodes = network.nodes.map((n) =>
      n.id === selectedId ? { ...n, rotation: newRotation } : n
    );
    onNetworkChange?.({ ...network, nodes: updatedNodes });
  }, [network, selectedId, selectedType, onNetworkChange]);

  const handleSwapLeftRight = useCallback(() => {
    if (!selectedId || selectedType !== "node") return;
    const node = network.nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const currentRotation = node.rotation ?? 0;
    // Only swap if horizontal (0 or 180)
    if (currentRotation % 180 !== 0) return;

    const newRotation = currentRotation === 0 ? 180 : 0;

    const updatedNodes = network.nodes.map((n) =>
      n.id === selectedId ? { ...n, rotation: newRotation } : n
    );
    onNetworkChange?.({ ...network, nodes: updatedNodes });
  }, [network, selectedId, selectedType, onNetworkChange]);

  const handleSwapUpDown = useCallback(() => {
    if (!selectedId || selectedType !== "node") return;
    const node = network.nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const currentRotation = node.rotation ?? 0;
    // Only swap if vertical (90 or 270)
    if (currentRotation % 180 !== 90) return;

    const newRotation = currentRotation === 90 ? 270 : 90;

    const updatedNodes = network.nodes.map((n) =>
      n.id === selectedId ? { ...n, rotation: newRotation } : n
    );
    onNetworkChange?.({ ...network, nodes: updatedNodes });
  }, [network, selectedId, selectedType, onNetworkChange]);

  return (
    <ReactFlowProvider>
      <EditorCanvas {...{
        network,
        onSelect,
        selectedId,
        selectedType,
        onDelete,
        onUndo,
        onRedo,
        canUndo,
        canRedo,
        historyIndex,
        historyLength,
        onNetworkChange,
        height,
        localNodes,
        setLocalNodes,
        rfEdges,
        nodeTypes,
        edgeTypes,
        defaultEdgeOptions,
        handleNodesChange,
        handleConnect,
        mapNodeToReactFlow,
        viewSettings,
        setViewSettings,
        forceLightMode,
        handleRotateCW,
        handleRotateCCW,
        handleSwapLeftRight,
        handleSwapUpDown,
        onLoad,
        onSave,
        onExport,
        onPaste: handlePaste,
        onToggleSnapshot,
        onToggleSummary,
      }} />
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
  edgeTypes,
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
  viewSettings,
  setViewSettings,
  onDelete,
  selectedId,
  selectedType,
  forceLightMode,
  handleRotateCW,
  handleRotateCCW,
  handleSwapLeftRight,
  handleSwapUpDown,
  onLoad,
  onSave,
  onExport,
  onPaste,
  onToggleSnapshot,
  onToggleSummary,
}: NetworkEditorProps & {
  localNodes: Node[];
  setLocalNodes: React.Dispatch<React.SetStateAction<Node<any, string | undefined>[]>>;
  rfEdges: Edge[];
  nodeTypes: { [key: string]: any };
  edgeTypes: { [key: string]: any };
  defaultEdgeOptions: DefaultEdgeOptions;
  handleNodesChange: (changes: NodeChange<Node>[]) => void;
  handleConnect: (connection: Connection) => void;
  mapNodeToReactFlow: (node: NodeProps, isSelected: boolean) => Node;
  viewSettings: ViewSettings;
  setViewSettings: (settings: ViewSettings) => void;
  onDelete?: () => void;
  selectedId: string | null;
  selectedType: "node" | "pipe" | null;
  forceLightMode?: boolean;
  handleRotateCW: () => void;
  handleRotateCCW: () => void;
  handleSwapLeftRight: () => void;
  handleSwapUpDown: () => void;
  onPaste: (ids: string[]) => void;
  onToggleSnapshot?: () => void;
  onToggleSummary?: () => void;
}) {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [panModeEnabled, setPanModeEnabled] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const snapGrid: [number, number] = [5, 5];
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<HandleType | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition, getNodes, getViewport, setViewport } = useReactFlow();
  const NODE_SIZE = 20;

  useCopyPaste(network, onNetworkChange, onPaste);

  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, { nodeId, handleType }: OnConnectStartParams) => {
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
        const nullHandles = { sourceHandle: null, targetHandle: null };
        const connection: Connection =
          handleType === "target"
            ? { ...nullHandles, source: existingNodeAtPointer.id, target: fromId }
            : { ...nullHandles, source: fromId, target: existingNodeAtPointer.id };
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
        name: generateUniquePipeName(network.pipes),
        startNodeId: pipeStartNodeId,
        endNodeId: startsFromSourceHandle ? newNodeId : fromId,
        pipeSectionType: "pipeline" as "pipeline" | "control valve" | "orifice",
        // massFlowRate: 1000, // Default mass flow rate
        massFlowRateUnit: "kg/h",
        // length: 100, // Default length
        lengthUnit: "m",
        // diameter: 102.26, // Default diameter
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
    (event: ReactMouseEvent) => {
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
        const newNode = {
          id: newNodeId,
          label: `Node ${network.nodes.length + 1}`,
          position,
          // fluid is now optional and undefined for new nodes
          temperature: undefined,
          temperatureUnit: "C",
          pressure: undefined,
          pressureUnit: "kPag",
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
      lastMousePos.current = null;
    };

    const handleWindowBlur = () => {
      setIsSpacePanning(false);
      lastMousePos.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!isSpacePanning) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (lastMousePos.current) {
        const dx = event.clientX - lastMousePos.current.x;
        const dy = event.clientY - lastMousePos.current.y;
        const { x, y, zoom } = getViewport();
        setViewport({ x: x + dx, y: y + dy, zoom });
      }
      lastMousePos.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      lastMousePos.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSpacePanning, getViewport, setViewport]);

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
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const colorMode = theme.palette.mode;

  return (
    <Paper
      elevation={0}
      sx={{
        height,
        width: "100%",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          height: 48,
          width: "100%",
          flexShrink: 0,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 2,
          zIndex: 10,
        }}
      >
        <Stack direction="row" spacing={2}>
          <ButtonGroup variant="contained" size="small" aria-label="File tools">
            <Tooltip title="Load">
              <span>
                <IconButton size="small" onClick={onLoad} disabled={!onLoad}>
                  <LoadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Save">
              <span>
                <IconButton size="small" onClick={onSave} disabled={!onSave}>
                  <SaveIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Export">
              <span>
                <IconButton size="small" onClick={onExport} disabled={!onExport}>
                  <ExportIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {onToggleSummary && (
              <Tooltip title="Summary Table">
                <IconButton size="small" onClick={onToggleSummary}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </ButtonGroup>

          <ButtonGroup variant="contained" size="small" aria-label="Edit tools">
            <Tooltip title="Add Node">
              <span>
                <IconButton size="small" onClick={() => setIsAddingNode(true)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete Selected">
              <span>
                <IconButton size="small" onClick={onDelete} disabled={!selectedId}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Undo">
              <span>
                <IconButton size="small" onClick={onUndo} disabled={!canUndo}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo">
              <span>
                <IconButton size="small" onClick={onRedo} disabled={!canRedo}>
                  <RedoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup variant="contained" size="small" aria-label="Rotation tools">
            <Tooltip title="Rotate 90° CW">
              <span>
                <IconButton size="small" onClick={handleRotateCW} disabled={!selectedId || selectedType !== "node"}>
                  <RotateRightIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Rotate 90° CCW">
              <span>
                <IconButton size="small" onClick={handleRotateCCW} disabled={!selectedId || selectedType !== "node"}>
                  <RotateLeftIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Swap Left-Right">
              <span>
                <IconButton
                  size="small"
                  onClick={handleSwapLeftRight}
                  disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 0}
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Swap Up-Down">
              <span>
                <IconButton
                  size="small"
                  onClick={handleSwapUpDown}
                  disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 90}
                >
                  <SwapVertIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup variant="contained" size="small" aria-label="View tools">
            <Tooltip title="Snap to Grid">
              <ToggleButton
                value="snap"
                selected={snapToGrid}
                onChange={() => setSnapToGrid(!snapToGrid)}
                size="small"
                sx={{ border: 'none', padding: '5px' }}
              >
                <GridIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Show Grid">
              <ToggleButton
                value="grid"
                selected={showGrid}
                onChange={() => setShowGrid(!showGrid)}
                size="small"
                sx={{ border: 'none', padding: '5px' }}
              >
                <GridOnIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Pan Mode">
              <ToggleButton
                value="pan"
                selected={panModeEnabled}
                onChange={() => setPanModeEnabled(!panModeEnabled)}
                size="small"
                sx={{ border: 'none', padding: '5px' }}
              >
                <PanToolIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <ViewSettingsMenu
              settings={viewSettings}
              onSettingsChange={setViewSettings}
            />
            <Tooltip title="Toggle Dark Mode">
              <IconButton size="small" onClick={toggleColorMode}>
                <DarkModeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        {/* <Box sx={{ display: 'flex', alignItems: 'center', px: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
          {canUndo || canRedo ? `${(historyIndex ?? 0) + 1} / ${historyLength ?? 0}` : "No history"}
        </Box> */}
        {onToggleSnapshot && (
          <Tooltip title="Network Snapshot">
            <IconButton size="small" onClick={onToggleSnapshot}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

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
          colorMode={forceLightMode ? "light" : colorMode}
          nodes={localNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id, "node")}
          onNodeDragStart={(_, node) => {
            if (!node.selected) {
              onSelect(node.id, "node");
            }
          }}
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
          panActivationKeyCode={undefined} // We handle space panning manually
          deleteKeyCode={null} // We handle delete manually with confirmation
          nodesDraggable={!isPanMode}
          selectionOnDrag={!isPanMode}
          panOnDrag={panModeEnabled || [1, 2]} // Pan on left click if in pan mode, or middle/right click always
          selectionKeyCode={isPanMode ? null : "Shift"} // Use Shift for selection if not in pan mode
          multiSelectionKeyCode={isPanMode ? null : "Meta"}
          style={{ cursor: editorCursor }}
        >
          {showGrid && <Background className="network-grid" />}
          <MiniMap
            className="network-minimap"
            pannable
            zoomable
            nodeColor={(n) => (n.data?.isSelected ? "#f59e0b" : "#5a5a5cff")} // Set themee color
            style={{ background: "background.paper", opacity: 0.7, width: 140, height: 90 }}
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
    </Paper >
  );
}
