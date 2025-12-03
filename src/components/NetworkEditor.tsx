"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Button,
  ButtonGroup,
  Stack,
  Box,
  IconButton,
  ToggleButton,
  Tooltip,
  Paper,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  Slider,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Grid3x3 as GridIcon,
  GridOn as GridOnIcon,
  PanTool as PanToolIcon,
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
  Wallpaper as WallpaperIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Cable as CableIcon,
  InsertDriveFileOutlined as NoteAddIcon,
} from "@mui/icons-material";
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useNetworkHotkeys } from "@/hooks/useNetworkHotkeys";
import { useNodeFlowState } from "@/hooks/useNodeFlowState";
import { EditorToolbar } from "./editor/EditorToolbar";
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
import PressureNode from "@/components/nodes/PressureNode";
import BackgroundNode from "@/components/customBackgrounds/BackgroundNode";
import PipeEdge from "@/components/nodes/PipeEdge";
import CustomBackground from "@/components/customBackgrounds/CustomBackground";
import { NetworkState, type NodeProps, type PipeProps } from "@/lib/types";
import { recalculatePipeFittingLosses } from "@/lib/fittings";
import { convertUnit } from "@/lib/unitConversion";
import { useColorMode } from "@/contexts/ColorModeContext";
import { getPipeEdge } from "@/utils/edgeUtils";
import { getPressureNode, validateNodeConfiguration } from "@/utils/nodeUtils";
import ViewSettingsDialog from "@/components/ViewSettingsDialog";
import { type ViewSettings } from "@/lib/types";
import { useCopyPaste } from "@/hooks/useCopyPaste";
import { CustomCursor } from "./CustomCursor";
import { glassDialogSx } from "@/lib/glassStyles";
import { useNetworkStore } from "@/store/useNetworkStore";

// ... other imports

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
  height = 520,
  forceLightMode = false,
  onLoad,
  onSave,
  onExport,
  onNew,
}: {
  height?: string | number;
  forceLightMode?: boolean;
  onLoad?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onNew?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <EditorCanvas
        height={height}
        forceLightMode={forceLightMode}
        onLoad={onLoad}
        onSave={onSave}
        onExport={onExport}
        onNew={onNew}
      />
    </ReactFlowProvider>
  );
}

function EditorCanvas({
  height,
  forceLightMode,
  onLoad,
  onSave,
  onExport,
  onNew,
}: {
  height?: string | number;
  forceLightMode?: boolean;
  onLoad?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onNew?: () => void;
}) {
  const theme = useTheme();
  const {
    network,
    setNetwork,
    selectElement,
    selectedId,
    selectedType,
    deleteSelection,
    undo,
    redo,
    historyIndex,
    history,
    viewSettings,
    setViewSettings,
    isAnimationEnabled,
    setIsAnimationEnabled,
    isConnectingMode,
    setIsConnectingMode,
    setMultiSelection,
    showSnapshot,
    setShowSnapshot,
    showSummary,
    setShowSummary,
    multiSelection,
  } = useNetworkStore();

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [panModeEnabled, setPanModeEnabled] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const onSelect = selectElement;
  const onDelete = deleteSelection;
  const onUndo = undo;
  const onRedo = redo;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const historyLength = history.length;
  const onNetworkChange = setNetwork;
  const onToggleSnapshot = () => setShowSnapshot(!showSnapshot);
  const onToggleSummary = () => setShowSummary(!showSummary);
  const onToggleAnimation = () => setIsAnimationEnabled(!isAnimationEnabled);
  const onToggleConnectingMode = () => {
    if (!isConnectingMode) setIsAddingNode(false);
    setIsConnectingMode(!isConnectingMode);
  };
  const onSelectionChangeProp = setMultiSelection;

  // ... rest of component

  // viewSettings state is now passed as prop


  const getPressureUnit = (system: ViewSettings["unitSystem"]) => {
    switch (system) {
      case "imperial": return "psig";
      case "fieldSI": return "barg";
      case "metric_kgcm2": return "kg/cm2g";
      case "metric":
      default: return "kPag";
    }
  };

  const displayPressureUnit = getPressureUnit(viewSettings.unitSystem);

  // Sync viewSettings to network state
  useEffect(() => {
    if (onNetworkChange) {
      // Avoid infinite loops by checking if deep equal or similar, but for now simple check
      // Actually, onNetworkChange updates the network prop, which might cause re-render.
      // We need to be careful.
      // Let's just update if the network.viewSettings is different from current viewSettings
      if (JSON.stringify(network.viewSettings) !== JSON.stringify(viewSettings)) {
        onNetworkChange({
          ...network,
          viewSettings
        });
      }
    }
  }, [viewSettings, onNetworkChange, network]);

  const nodeFlowStates = useNodeFlowState(network.nodes, network.pipes);

  const mapNodeToReactFlow = useCallback(
    (node: NodeProps, isSelected: boolean): Node => {
      return getPressureNode({
        node,
        isSelected,
        viewSettings,
        nodeFlowStates,
        forceLightMode,
        displayPressureUnit,
        isConnectingMode,
        isCtrlPressed,
        pipes: network.pipes,
      });
    },
    [nodeFlowStates, viewSettings, forceLightMode, displayPressureUnit, isConnectingMode, isCtrlPressed, network.pipes]
  );

  const rfNodes = useMemo<Node[]>(
    () => {
      const nodes = network.nodes.map(node => {
        const isSelected = selectedType === "node" && selectedId === node.id;
        return mapNodeToReactFlow(node, isSelected);
      });



      return nodes;
    },
    [network.nodes, network.backgroundImage, network.backgroundImageSize, network.backgroundImageOpacity, network.backgroundImagePosition, network.backgroundImageLocked, selectedId, selectedType, mapNodeToReactFlow]
  );

  const [localNodes, setLocalNodes] = useState<Node[]>(rfNodes);
  const pastedNodeIdsRef = useRef<Set<string> | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const multiSelectionCount = (multiSelection?.nodes.length ?? 0) + (multiSelection?.edges.length ?? 0);

  useEffect(() => {
    if (multiSelectionCount > 1) {
      return; // Preserve explicit multi-selection state managed by React Flow
    }

    setSelectedNodeIds((prev) => {
      if (selectedType === "node" && selectedId) {
        if (prev.size === 1 && prev.has(selectedId)) {
          return prev;
        }
        return new Set([selectedId]);
      }

      if (prev.size === 0) {
        return prev;
      }
      return new Set();
    });
  }, [selectedId, selectedType, multiSelectionCount]);

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

  const onPaste = handlePaste;

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
          isAnimationEnabled,
          isConnectingMode,
        })
      ),
    [network.pipes, selectedId, selectedType, viewSettings, theme, forceLightMode, isAnimationEnabled, isConnectingMode]
  );

  const nodeTypes = useMemo(() => ({ pressure: PressureNode, background: BackgroundNode } as any), []);
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
          if (c.id === 'background-image-node') return;
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
          let updatedNetwork = { ...network };

          // Check for background node drag
          const bgChange = dragEndedChanges.find(c => c.id === "background-image-node");
          if (bgChange) {
            updatedNetwork = {
              ...updatedNetwork,
              backgroundImagePosition: bgChange.position
            };
          }

          // Identify moved nodes
          const movedNodeIds = new Set(dragEndedChanges.map(c => c.id));

          // Update node positions
          updatedNetwork = {
            ...updatedNetwork,
            nodes: updatedNetwork.nodes.map((node) => {
              const change = dragEndedChanges.find((c) => c.id === node.id);
              return change ? { ...node, position: change.position! } : node;
            }),
          };

          // Reset label position for pipes connected to moved nodes
          updatedNetwork = {
            ...updatedNetwork,
            pipes: updatedNetwork.pipes.map(pipe => {
              if (movedNodeIds.has(pipe.startNodeId) || movedNodeIds.has(pipe.endNodeId)) {
                return { ...pipe, labelOffset: { x: 0, y: 0 } };
              }
              return pipe;
            })
          };

          onNetworkChange(updatedNetwork);
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
  // Hotkey logic moved to useNetworkHotkeys hook
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




  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const snapGrid: [number, number] = [5, 5];
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<HandleType | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);

  const { screenToFlowPosition, getNodes, getViewport, setViewport } = useReactFlow();
  const NODE_SIZE = 20;



  useCopyPaste(onPaste);

  const { isSpacePanning } = useNetworkHotkeys({
    onDelete,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    selectedId,
    selectedType,
    isAddingNode,
    setIsAddingNode,
    isConnectingMode,
    onToggleConnectingMode,
  });

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

      // If in connecting mode, do not create new nodes on drop
      if (isConnectingMode) {
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
      network,
      isConnectingMode,
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
          mapNodeToReactFlow(newNode, false), // Don't select the new node
        ]);
        // Keep adding mode active
        // setIsAddingNode(false); 
        // onSelect(newNodeId, "node"); // Don't select the new node
        return;
      }

      onSelect(null, null, { openPanel: false });
    },
    [isAddingNode, onNetworkChange, screenToFlowPosition, snapToGrid, snapGrid, network, onSelect, mapNodeToReactFlow],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | ReactMouseEvent) => {
      if (isAddingNode) {
        event.preventDefault();
        setIsAddingNode(false);
      }
    },
    [isAddingNode],
  );





  // Hotkey logic moved to useNetworkHotkeys hook

  const isPanMode = panModeEnabled || isSpacePanning;

  useEffect(() => {
    const wrapper = reactFlowWrapperRef.current;
    if (!wrapper) return;

    const pane = wrapper.querySelector(".react-flow__pane") as HTMLDivElement | null;
    if (!pane) return;

    let cursor = "";
    if (isAddingNode) {
      cursor = "none"; // Hide default cursor, use CustomCursor
    } else if (isPanMode) {
      cursor = "grab";
    }

    pane.style.cursor = cursor;

    return () => {
      pane.style.cursor = "";
    };
  }, [isAddingNode, isPanMode]);

  const canEditNetwork = Boolean(onNetworkChange);
  const editorCursor = isAddingNode
    ? "none" // Hide default cursor, use CustomCursor
    : isPanMode ? "grab" : "default";
  const { toggleColorMode } = useColorMode();
  const colorMode = theme.palette.mode;
  const isDarkMode = colorMode === "dark";
  const flowCanvasColor = isDarkMode ? theme.palette.background.paper : undefined;

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
        borderRadius: "24px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "",
      }}
    >
      <EditorToolbar
        network={network}
        onNetworkChange={onNetworkChange}
        onNew={onNew}
        onLoad={onLoad}
        onSave={onSave}
        onExport={onExport}
        onToggleSummary={onToggleSummary}
        onToggleSnapshot={onToggleSnapshot}
        setShowBackgroundSettings={setShowBackgroundSettings}
        setIsAddingNode={setIsAddingNode}
        isAddingNode={isAddingNode}
        onDelete={onDelete}
        selectedId={selectedId}
        selectedType={selectedType}
        onUndo={onUndo}
        canUndo={canUndo}
        onRedo={onRedo}
        canRedo={canRedo}
        handleRotateCW={handleRotateCW}
        handleRotateCCW={handleRotateCCW}
        handleSwapLeftRight={handleSwapLeftRight}
        handleSwapUpDown={handleSwapUpDown}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        panModeEnabled={panModeEnabled}
        setPanModeEnabled={setPanModeEnabled}
        isConnectingMode={isConnectingMode}
        onToggleConnectingMode={onToggleConnectingMode}
        isAnimationEnabled={isAnimationEnabled}
        onToggleAnimation={onToggleAnimation}
        viewSettings={viewSettings}
        setViewSettings={setViewSettings}
      />

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
          onNodeClick={(_, node) => {
            if (node.type === 'background') {
              onSelect(null, null, { openPanel: false });
              return;
            }
            // Explicit click opens the panel
            onSelect(node.id, "node", { openPanel: true });
          }}

          // Explicit click opens the panel
          onEdgeClick={(_, edge) => onSelect(edge.id, "pipe", { openPanel: true })}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodesChange={handleNodesChange}
          onSelectionChange={useCallback(({ nodes, edges }: { nodes: Node[], edges: Edge[] }) => {
            // If multiple items are selected, we don't update the single selection state
            // unless only one item is selected.
            if (nodes.length + edges.length === 1) {
              // Implicitly preserves panel state (open if already open, closed if closed)
              if (nodes.length > 0) onSelect(nodes[0].id, "node");
              if (edges.length > 0) onSelect(edges[0].id, "pipe");
            } else if (nodes.length + edges.length === 0) {
              onSelect(null, null, { openPanel: false });
            }

            // Always pass up the full selection for multi-delete support
            onSelectionChangeProp?.({ nodes: nodes.map(n => n.id), edges: edges.map(e => e.id) });
          }, [onSelect, onSelectionChangeProp])}
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
          style={{
            cursor: editorCursor,
            backgroundColor: flowCanvasColor,
          }}
        >
          <CustomBackground
            color={flowCanvasColor ?? theme.palette.background.paper}
            backgroundImage={network.backgroundImage}
            backgroundImageSize={network.backgroundImageSize}
            backgroundImagePosition={network.backgroundImagePosition}
            backgroundImageOpacity={network.backgroundImageOpacity}
            className="network-custom-background"
          />
          {showGrid && <Background className="network-grid" style={{ backgroundColor: 'transparent' }} />}
          <MiniMap
            className="network-minimap"
            pannable
            zoomable
            nodeColor={(n) => {
              if (n.type === 'background') return 'transparent';
              return n.data?.isSelected ? "#f59e0b" : "#5a5a5cff";
            }}
            nodeStrokeColor={(n) => {
              if (n.type === 'background') return 'transparent';
              return '#222';
            }}
            style={{ background: "background.paper", opacity: 0.7, width: 140, height: 90 }}
          />
          <Controls />
        </ReactFlow>
        <CustomCursor isAddingNode={isAddingNode} nodeSize={NODE_SIZE} containerRef={reactFlowWrapperRef} />
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

      <Dialog
        open={showBackgroundSettings}
        onClose={() => setShowBackgroundSettings(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: glassDialogSx
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          Background Settings
          <IconButton onClick={() => setShowBackgroundSettings(false)} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography gutterBottom>Opacity</Typography>
              <Slider
                value={(network.backgroundImageOpacity ?? 1) * 100}
                onChange={(_, value) => onNetworkChange?.({ ...network, backgroundImageOpacity: (value as number) / 100 })}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>Scale ({Math.round((network.backgroundImageSize?.width && network.backgroundImageOriginalSize?.width ? (network.backgroundImageSize.width / network.backgroundImageOriginalSize.width) : 1) * 100)}%)</Typography>
              <Slider
                value={(network.backgroundImageSize?.width && network.backgroundImageOriginalSize?.width ? (network.backgroundImageSize.width / network.backgroundImageOriginalSize.width) : 1) * 100}
                min={10}
                max={200}
                onChange={(_, value) => {
                  const scale = (value as number) / 100;
                  if (network.backgroundImageOriginalSize) {
                    onNetworkChange?.({
                      ...network,
                      backgroundImageSize: {
                        width: Math.round(network.backgroundImageOriginalSize.width * scale),
                        height: Math.round(network.backgroundImageOriginalSize.height * scale)
                      }
                    });
                  }
                }}
                valueLabelDisplay="auto"
              />
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Width"
                type="number"
                size="small"
                value={network.backgroundImageSize?.width ?? 0}
                onChange={(e) => {
                  const newWidth = Number(e.target.value);
                  let newHeight = network.backgroundImageSize?.height ?? 0;
                  if (keepAspectRatio && network.backgroundImageSize?.width && network.backgroundImageSize?.height) {
                    const ratio = network.backgroundImageSize.height / network.backgroundImageSize.width;
                    newHeight = Math.round(newWidth * ratio);
                  }
                  onNetworkChange?.({ ...network, backgroundImageSize: { width: newWidth, height: newHeight } });
                }}
              />
              <TextField
                label="Height"
                type="number"
                size="small"
                value={network.backgroundImageSize?.height ?? 0}
                onChange={(e) => {
                  const newHeight = Number(e.target.value);
                  let newWidth = network.backgroundImageSize?.width ?? 0;
                  if (keepAspectRatio && network.backgroundImageSize?.width && network.backgroundImageSize?.height) {
                    const ratio = network.backgroundImageSize.width / network.backgroundImageSize.height;
                    newWidth = Math.round(newHeight * ratio);
                  }
                  onNetworkChange?.({ ...network, backgroundImageSize: { width: newWidth, height: newHeight } });
                }}
              />
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={keepAspectRatio}
                    onChange={(e) => setKeepAspectRatio(e.target.checked)}
                  />
                }
                label="Keep Aspect Ratio"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  onNetworkChange?.({
                    ...network,
                    backgroundImageSize: network.backgroundImageOriginalSize ?? network.backgroundImageSize,
                    backgroundImageOpacity: 1,
                    backgroundImagePosition: { x: 0, y: 0 },
                  });
                }}
              >
                Reset
              </Button>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="X Position"
                type="number"
                size="small"
                value={network.backgroundImagePosition?.x ?? 0}
                onChange={(e) => onNetworkChange?.({ ...network, backgroundImagePosition: { ...network.backgroundImagePosition!, x: Number(e.target.value) } })}
              />
              <TextField
                label="Y Position"
                type="number"
                size="small"
                value={network.backgroundImagePosition?.y ?? 0}
                onChange={(e) => onNetworkChange?.({ ...network, backgroundImagePosition: { ...network.backgroundImagePosition!, y: Number(e.target.value) } })}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  onNetworkChange?.({
                    ...network,
                    backgroundImage: undefined,
                    backgroundImageSize: undefined,
                    backgroundImageOpacity: undefined,
                    backgroundImagePosition: undefined,
                    backgroundImageLocked: undefined,
                    backgroundImageOriginalSize: undefined
                  });
                  setShowBackgroundSettings(false);
                }}
                fullWidth
              >
                Remove
              </Button>
              <Button
                variant="contained"
                onClick={() => setShowBackgroundSettings(false)}
                fullWidth
              >
                OK
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper >
  );
}
