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
} from "@/lib/types";
import { recalculatePipeFittingLosses } from "@/lib/fittings";
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
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedId || !selectedType) return;

    if (selectedType === "node") {
      setNetwork(current => ({
        ...current,
        nodes: current.nodes.filter(n => n.id !== selectedId),
        pipes: current.pipes.filter(p => p.startNodeId !== selectedId && p.endNodeId !== selectedId),
      }));
    } else if (selectedType === "pipe") {
      setNetwork(current => ({
        ...current,
        pipes: current.pipes.filter(p => p.id !== selectedId),
      }));
    }

    handleSelect(null, null);
  }, [selectedId, selectedType, handleSelect]);

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

  return (
    <Stack sx={{ bgcolor: "background.default", height: "100vh", gap: 3, p: 4 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".nhf,.json,application/json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Header
        onReset={handleReset}
        onExportPng={handleExportPng}
        onLoadNetwork={handleLoadNetworkClick}
        onSaveNetwork={handleSaveNetwork}
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
          />
        </Box>

        <Slide direction="left" in={!!selection} mountOnEnter unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "320px",
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          >
            <PropertiesPanel
              network={network}
              selected={selection}
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
              onUpdatePipe={(id, patch: PipePatch) =>
                setNetwork(current => ({
                  ...current,
                  pipes: current.pipes.map(pipe => {
                    if (pipe.id !== id) return pipe;
                    const pipePatch = typeof patch === "function" ? patch(pipe) : patch;
                    const updatedPipe = { ...pipe, ...pipePatch };
                    if ('controlValve' in pipePatch && Object.keys(pipePatch).length === 1) {
                      return updatedPipe;
                    }
                    return recalculatePipeFittingLosses(updatedPipe);
                  }),
                }))
              }
              onReset={handleReset}
              onClose={() => handleSelect(null, null)}
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
