"use client";

import { Button, Box, Typography, Stack, Slide, Paper, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useCallback, useState, useEffect, useRef, ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { SummaryTable } from "@/components/SummaryTable";
import { NetworkEditor } from "@/components/NetworkEditor";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Header } from "@/components/Header";
import {
  createInitialNetwork,
  NetworkState,
  NodePatch,
  PipePatch,
  SelectedElement,
  NodeProps,
  PipeProps,
  ViewSettings,
} from "@/lib/types";
import { recalculatePipeFittingLosses } from "@/lib/fittings";
import { parseExcelNetwork } from "@/utils/excelImport";
// import { convertUnit } from "@/lib/unitConversion";

const createNetworkWithDerivedValues = () =>
  applyFittingLosses(createInitialNetwork());

const applyFittingLosses = (network: NetworkState): NetworkState => ({
  ...network,
  pipes: network.pipes.map(recalculatePipeFittingLosses),
});

export default function Home() {
  const [network, setNetwork] = useState<NetworkState>(() => createNetworkWithDerivedValues());


  // Selection state
  const [selection, setSelection] = useState<SelectedElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"node" | "pipe" | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const [isConnectingMode, setIsConnectingMode] = useState(false);

  const [viewSettings, setViewSettings] = useState<ViewSettings>(() => {
    const defaults: ViewSettings = {
      unitSystem: "metric",
      node: {
        name: true,
        pressure: false,
        temperature: false,
        hoverCard: false,
        decimals: {
          pressure: 2,
          temperature: 2,
        },
      },
      pipe: {
        name: true,
        length: true,
        deltaP: false,
        velocity: false,
        dPPer100m: false,
        massFlowRate: false,
        decimals: {
          length: 2,
          deltaP: 2,
          velocity: 2,
          dPPer100m: 2,
          massFlowRate: 2,
        },
      },
    };

    // We can't access network.viewSettings here easily because network is also state.
    // But we can initialize with defaults and let useEffect sync if needed, 
    // or just rely on the fact that we'll pass it down.
    // Actually, let's just use defaults here. If network has settings, we should probably load them when network loads.
    return defaults;
  });

  // Sync viewSettings from network when network changes (e.g. load)
  useEffect(() => {
    if (network.viewSettings) {
      setViewSettings(prev => ({
        ...prev,
        ...network.viewSettings,
        node: { ...prev.node, ...network.viewSettings!.node },
        pipe: { ...prev.pipe, ...network.viewSettings!.pipe }
      }));
    }
  }, [network.viewSettings]);

  // ──────────────────────────────────────────────────────────────
  // Multi-step Undo/Redo – fixed logic
  // ──────────────────────────────────────────────────────────────
  const HISTORY_LIMIT = 50;
  const [history, setHistory] = useState<NetworkState[]>([createNetworkWithDerivedValues()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0); // start at 0

  // Only push new state when the network actually changes (deep compare)
  useEffect(() => {
    const currentState = history[historyIndex];

    // Simple deep equality check for our data structure
    const isSame =
      JSON.stringify(currentState?.nodes) === JSON.stringify(network.nodes) &&
      JSON.stringify(currentState?.pipes) === JSON.stringify(network.pipes);

    if (isSame) return; // no change → do nothing

    // Truncate forward history if we are not at the end
    let newHistory = history.slice(0, historyIndex + 1);

    // Add new state
    newHistory.push(network);

    // Enforce limit
    if (newHistory.length > HISTORY_LIMIT) {
      newHistory = newHistory.slice(-HISTORY_LIMIT);
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [network, history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    setHistoryIndex(i => i - 1);
    setNetwork(history[historyIndex - 1]);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(i => i + 1);
    setNetwork(history[historyIndex + 1]);
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  // ──────────────────────────────────────────────────────────────



  const handleSelect = useCallback((id: string | null, type: "node" | "pipe" | null) => {
    setSelectedId(id);
    setSelectedType(type);
    setSelection(id && type ? { id, type } : null);
    // Clear multi-selection when single selecting
    setMultiSelection({ nodes: [], edges: [] });
  }, []);

  const [multiSelection, setMultiSelection] = useState<{ nodes: string[]; edges: string[] }>({ nodes: [], edges: [] });

  const handleSelectionChange = useCallback((selection: { nodes: string[]; edges: string[] }) => {
    setMultiSelection(prev => {
      // Simple deep equality check to prevent infinite loops
      if (
        prev.nodes.length === selection.nodes.length &&
        prev.edges.length === selection.edges.length &&
        prev.nodes.every((id, i) => id === selection.nodes[i]) &&
        prev.edges.every((id, i) => id === selection.edges[i])
      ) {
        return prev;
      }
      return selection;
    });

    // We only update single selection state if it actually changed
    // But since setMultiSelection is async, we should probably check against 'selection' argument
    // However, updating single selection state also triggers re-renders.
    // Let's rely on the check inside setMultiSelection to stop the loop if selection is stable.

    // Wait, if we update single selection state (setSelectedId), it triggers a re-render of NetworkEditor.
    // NetworkEditor then calls onSelectionChange again.
    // If onSelectionChange passes the SAME selection, our check above prevents setMultiSelection update.
    // But we still execute the code below.

    // If single item selected, update single selection state for backward compatibility/properties panel
    if (selection.nodes.length + selection.edges.length === 1) {
      if (selection.nodes.length > 0) {
        setSelectedId(selection.nodes[0]);
        setSelectedType("node");
        setSelection({ id: selection.nodes[0], type: "node" });
      } else {
        setSelectedId(selection.edges[0]);
        setSelectedType("pipe");
        setSelection({ id: selection.edges[0], type: "pipe" });
      }
    } else if (selection.nodes.length + selection.edges.length === 0) {
      // Only clear if we are sure (React Flow might send empty selection on click)
      // But we handle single select via onSelect.
      // Let's trust React Flow's selection change.
      setSelectedId(null);
      setSelectedType(null);
      setSelection(null);
    } else {
      // Multiple items selected
      setSelectedId(null);
      setSelectedType(null);
      setSelection(null);
    }
  }, []);

  const handleDelete = useCallback(() => {
    const nodesToDelete = new Set(multiSelection.nodes);
    const edgesToDelete = new Set(multiSelection.edges);

    if (selectedId && selectedType) {
      if (selectedType === "node") nodesToDelete.add(selectedId);
      if (selectedType === "pipe") edgesToDelete.add(selectedId);
    }

    if (nodesToDelete.size === 0 && edgesToDelete.size === 0) return;

    setNetwork(current => ({
      ...current,
      nodes: current.nodes.filter(n => !nodesToDelete.has(n.id)),
      pipes: current.pipes.filter(p => !edgesToDelete.has(p.id) && !nodesToDelete.has(p.startNodeId) && !nodesToDelete.has(p.endNodeId)),
    }));

    handleSelect(null, null);
    setMultiSelection({ nodes: [], edges: [] });
  }, [selectedId, selectedType, multiSelection, handleSelect]);

  const handleNetworkChange = useCallback((updatedNetwork: NetworkState) => {
    setNetwork(updatedNetwork);
  }, []);

  const handleClearNetwork = useCallback(() => {
    const emptyNetwork: NetworkState = { nodes: [], pipes: [] };
    setNetwork(emptyNetwork);
    setSelection(null);
    setSelectedId(null);
    setSelectedType(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, [setHistory, setHistoryIndex, setNetwork, setSelection, setSelectedId, setSelectedType]);

  const handleReset = () => {
    setNetwork(createNetworkWithDerivedValues());
    setSelection(null);
    setSelectedId(null);
    setSelectedType(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleExportPng = useCallback(async () => {
    const flowElement = document.querySelector(".react-flow") as HTMLElement | null;
    if (!flowElement) {
      alert("Unable to locate the network canvas.");
      return;
    }

    // Force light mode for export
    setIsExporting(true);
    // Wait for render to apply light mode styles
    await new Promise(resolve => setTimeout(resolve, 100));

    const viewport = flowElement.querySelector(".react-flow__viewport") as HTMLElement | null;
    const NODE_SIZE = 20;
    const PADDING = 80;
    const hasContent = network.nodes.length > 0 || !!network.backgroundImage;

    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    if (network.nodes.length > 0) {
      network.nodes.forEach(node => {
        const { x = 0, y = 0 } = node.position ?? {};
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      });
    }

    if (network.backgroundImage && network.backgroundImageSize) {
      const { x = 0, y = 0 } = network.backgroundImagePosition ?? {};
      const { width, height } = network.backgroundImageSize;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x + width);
      bounds.maxY = Math.max(bounds.maxY, y + height);
    }

    if (bounds.minX === Infinity) {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = flowElement.clientWidth;
      bounds.maxY = flowElement.clientHeight;
    }

    const exportWidth = hasContent ? Math.max(1, bounds.maxX - bounds.minX + NODE_SIZE + PADDING * 2) : flowElement.clientWidth;
    const exportHeight = hasContent ? Math.max(1, bounds.maxY - bounds.minY + NODE_SIZE + PADDING * 2) : flowElement.clientHeight;

    const originalStyles = {
      width: flowElement.style.width,
      height: flowElement.style.height,
      overflow: flowElement.style.overflow,
      transform: viewport?.style.transform,
      transformOrigin: viewport?.style.transformOrigin,
    };
    const hiddenGridLayers: Array<{ el: HTMLElement; display: string }> = [];

    try {
      if (hasContent && viewport) {
        flowElement.style.width = `${exportWidth}px`;
        flowElement.style.height = `${exportHeight}px`;
        flowElement.style.overflow = "visible";
        viewport.style.transform = `translate(${PADDING - bounds.minX}px, ${PADDING - bounds.minY}px) scale(1)`;
        viewport.style.transformOrigin = "0 0";
      }
      flowElement.querySelectorAll<HTMLElement>(".react-flow__background").forEach(el => {
        hiddenGridLayers.push({ el, display: el.style.display });
        el.style.display = "none";
      });
      const dataUrl = await toPng(flowElement, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: node => {
          if (!(node instanceof HTMLElement)) {
            return true;
          }
          const className = node.className;
          if (typeof className !== "string") {
            return true;
          }
          return !(
            className.includes("react-flow__controls") ||
            className.includes("react-flow__minimap") ||
            className.includes("react-flow__panel") ||
            className.includes("react-flow__background")
          );
        },
      });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `network-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export network PNG", error);
      alert("Unable to export the network diagram. Please try again.");
    } finally {
      flowElement.style.width = originalStyles.width;
      flowElement.style.height = originalStyles.height;
      flowElement.style.overflow = originalStyles.overflow;
      if (viewport) {
        viewport.style.transform = originalStyles.transform ?? "";
        viewport.style.transformOrigin = originalStyles.transformOrigin ?? "";
      }
      hiddenGridLayers.forEach(({ el, display }) => {
        el.style.display = display;
      });
      setIsExporting(false);
    }
  }, [network.nodes]);

  const handleSaveNetwork = useCallback(() => {
    try {
      const data = JSON.stringify(network, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `network-${timestamp}.nhf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to save network", error);
      alert("Unable to save the network snapshot. Please try again.");
    }
  }, [network]);

  const handleLoadNetworkClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === "string" ? reader.result : "";
          if (!text) {
            throw new Error("File is empty");
          }
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.pipes)) {
            throw new Error("File does not contain a valid network");
          }
          const nextNetwork = applyFittingLosses(parsed as NetworkState);
          setNetwork(nextNetwork);
          setSelection(null);
          setSelectedId(null);
          setSelectedType(null);
          setHistory([nextNetwork]);
          setHistoryIndex(0);
        } catch (error) {
          console.error("Failed to load network file", error);
          alert("Unable to load the selected file. Please ensure it is a valid NHF/JSON snapshot.");
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.onerror = () => {
        console.error("Error reading network file", reader.error);
        alert("Unable to read the selected file. Please try again.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    },
    [setNetwork, setSelection, setSelectedId, setSelectedType, setHistory, setHistoryIndex]
  );

  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportExcelClick = useCallback(() => {
    excelInputRef.current?.click();
  }, []);

  const handleExcelFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const newState = await parseExcelNetwork(file);
      if (newState) {
        const nextNetwork = applyFittingLosses(newState);
        setNetwork(nextNetwork);
        setSelection(null);
        setSelectedId(null);
        setSelectedType(null);
        setHistory([nextNetwork]);
        setHistoryIndex(0);
      }
    } catch (error) {
      console.error("Failed to import Excel file", error);
      alert("Failed to import Excel file. Please check the console for details.");
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }
    }
  }, []);

  return (
    <Stack sx={{ bgcolor: "background.default", height: "100vh", gap: 3, p: 4 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".nhf,.json,application/json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{ display: "none" }}
        onChange={handleExcelFileChange}
      />
      <Header
        onReset={handleReset}
        onExportPng={handleExportPng}
        onLoadNetwork={handleLoadNetworkClick}
        onSaveNetwork={handleSaveNetwork}
        onImportExcel={handleImportExcelClick}
      />

      <Box sx={{ position: "relative", flex: 1, width: "100%", overflow: "hidden", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ width: "100%", height: "100%" }}>
          <NetworkEditor
            network={network}
            onSelect={handleSelect}
            selectedId={selectedId}
            selectedType={selectedType}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onNetworkChange={handleNetworkChange}
            historyIndex={historyIndex}
            historyLength={history.length}
            height="100%"
            forceLightMode={isExporting}
            onLoad={handleLoadNetworkClick}
            onSave={handleSaveNetwork}
            onExport={handleExportPng}
            onNew={handleClearNetwork}
            onToggleSnapshot={() => setShowSnapshot(true)}
            onToggleSummary={() => setShowSummary(true)}
            isAnimationEnabled={isAnimationEnabled}
            onToggleAnimation={() => setIsAnimationEnabled(!isAnimationEnabled)}
            isConnectingMode={isConnectingMode}
            onToggleConnectingMode={() => setIsConnectingMode(!isConnectingMode)}
            onSelectionChangeProp={handleSelectionChange}
            viewSettings={viewSettings}
            setViewSettings={setViewSettings}
          />
        </Box>

        <Slide direction="left" in={!!selection} mountOnEnter unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              top: 0,
              right: "0px",
              bottom: 0,
              width: "340px",
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          >
            <PropertiesPanel
              network={network}
              selectedElement={selection}
              onUpdateNode={(id, patch: NodePatch) =>
                setNetwork(current => {
                  let updatedNode: NodeProps | undefined;

                  const nextNodes = current.nodes.map(node => {
                    if (node.id !== id) return node;

                    const nodePatch = typeof patch === "function" ? patch(node) : patch;
                    const mergedNode = {
                      ...node,
                      ...nodePatch,
                    };

                    updatedNode = mergedNode;
                    return mergedNode;
                  });

                  if (!updatedNode) {
                    return current;
                  }

                  const nextPipes = current.pipes.map(pipe => {
                    const isStartNode = pipe.startNodeId === id;
                    const isEndNode = pipe.endNodeId === id;

                    if (!isStartNode && !isEndNode) {
                      return pipe;
                    }

                    const pipePatch: Partial<PipeProps> = {};

                    const direction = pipe.direction ?? "forward";
                    const shouldUpdateBoundary =
                      (direction === "forward" && isStartNode) ||
                      (direction === "backward" && isEndNode);

                    if (shouldUpdateBoundary) {
                      pipePatch.boundaryPressure = updatedNode?.pressure;
                      pipePatch.boundaryPressureUnit = updatedNode?.pressureUnit;
                      pipePatch.boundaryTemperature = updatedNode?.temperature;
                      pipePatch.boundaryTemperatureUnit = updatedNode?.temperatureUnit;
                      pipePatch.fluid = updatedNode?.fluid ? { ...updatedNode.fluid } : undefined;
                    }

                    if (Object.keys(pipePatch).length === 0) {
                      return pipe;
                    }
                    return recalculatePipeFittingLosses({ ...pipe, ...pipePatch });
                  });

                  return {
                    ...current,
                    nodes: nextNodes,
                    pipes: nextPipes,
                  };
                })
              }
              onUpdatePipe={(id, patch) =>
                setNetwork(current => {
                  const targetPipe = current.pipes.find(p => p.id === id);
                  if (!targetPipe) return current;

                  const resolvedPatch = typeof patch === "function" ? patch(targetPipe) : patch;
                  const finalPipePatch: Partial<PipeProps> = { ...resolvedPatch };
                  let nextNodes = current.nodes;

                  const isDirectionChange = finalPipePatch.direction && finalPipePatch.direction !== targetPipe.direction;
                  const isFluidChange = !!finalPipePatch.fluid;

                  if (isDirectionChange) {
                    const newDirection = finalPipePatch.direction!;
                    const newInletNodeId = newDirection === "forward" ? targetPipe.startNodeId : targetPipe.endNodeId;
                    const newInletNode = current.nodes.find(n => n.id === newInletNodeId);

                    if (newInletNode) {
                      // 1. Pull Pressure & Temperature from New Inlet Node
                      finalPipePatch.boundaryPressure = newInletNode.pressure;
                      finalPipePatch.boundaryPressureUnit = newInletNode.pressureUnit;
                      finalPipePatch.boundaryTemperature = newInletNode.temperature;
                      finalPipePatch.boundaryTemperatureUnit = newInletNode.temperatureUnit;

                      // 2. Handle Fluid
                      if (newInletNode.fluid) {
                        // Case A: Node has fluid -> Pipe adopts it (Pull)
                        finalPipePatch.fluid = { ...newInletNode.fluid };
                      } else {
                        // Case B: Node empty -> Node adopts Pipe's fluid (Push)
                        const fluidToPush = finalPipePatch.fluid || targetPipe.fluid;
                        if (fluidToPush) {
                          nextNodes = nextNodes.map(n => n.id === newInletNodeId ? { ...n, fluid: { ...fluidToPush } } : n);
                        }
                      }
                    }
                  } else if (isFluidChange) {
                    // Explicit fluid change without direction change -> Push to current inlet node
                    const direction = targetPipe.direction ?? "forward";
                    const inletNodeId = direction === "forward" ? targetPipe.startNodeId : targetPipe.endNodeId;
                    nextNodes = nextNodes.map(n => n.id === inletNodeId ? { ...n, fluid: { ...finalPipePatch.fluid! } } : n);
                  }

                  return {
                    ...current,
                    nodes: nextNodes,
                    pipes: current.pipes.map(pipe => {
                      if (pipe.id !== id) return pipe;
                      const updatedPipe = { ...pipe, ...finalPipePatch };
                      return recalculatePipeFittingLosses(updatedPipe);
                    }),
                  };
                })
              }

              onClose={() => handleSelect(null, null)}
              viewSettings={viewSettings}
              onNetworkChange={handleNetworkChange}
            />
          </Paper>
        </Slide>
      </Box>



      <Dialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: "100vh",
            bgcolor: "background.paper",
            borderRadius: 0,
            m: 0,
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Summary Table
          <IconButton onClick={() => setShowSummary(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <SummaryTable network={network} onNetworkChange={handleNetworkChange} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSnapshot}
        onClose={() => setShowSnapshot(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            color: "#86efac",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          Network Snapshot
          <IconButton onClick={() => setShowSnapshot(false)} sx={{ color: 'white' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <pre
            style={{
              margin: 0,
              padding: "16px",
              overflow: "auto",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            {JSON.stringify(network, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

    </Stack >
  );
}
