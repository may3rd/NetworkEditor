"use client";

import { Button, Box, Typography, Stack } from "@mui/material";
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
    const hasNodes = network.nodes.length > 0;
    const bounds = hasNodes
      ? network.nodes.reduce(
        (acc, node) => {
          const { x = 0, y = 0 } = node.position ?? {};
          return {
            minX: Math.min(acc.minX, x),
            minY: Math.min(acc.minY, y),
            maxX: Math.max(acc.maxX, x),
            maxY: Math.max(acc.maxY, y),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )
      : { minX: 0, minY: 0, maxX: flowElement.clientWidth, maxY: flowElement.clientHeight };

    const exportWidth = hasNodes ? Math.max(1, bounds.maxX - bounds.minX + NODE_SIZE + PADDING * 2) : flowElement.clientWidth;
    const exportHeight = hasNodes ? Math.max(1, bounds.maxY - bounds.minY + NODE_SIZE + PADDING * 2) : flowElement.clientHeight;

    const originalStyles = {
      width: flowElement.style.width,
      height: flowElement.style.height,
      overflow: flowElement.style.overflow,
      transform: viewport?.style.transform,
      transformOrigin: viewport?.style.transformOrigin,
    };
    const hiddenGridLayers: Array<{ el: HTMLElement; display: string }> = [];

    try {
      if (hasNodes && viewport) {
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
    <Stack sx={{ bgcolor: "background.default", minHeight: "100vh", gap: 3, p: 4 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".nhf,.json,application/json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Header
        onReset={handleReset}
        onClearNetwork={handleClearNetwork}
        onExportPng={handleExportPng}
        onLoadNetwork={handleLoadNetworkClick}
        onSaveNetwork={handleSaveNetwork}
      />

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexDirection: { xs: "column", lg: "row" } }}>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
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
            height="640px"
            forceLightMode={isExporting}
            onLoad={handleLoadNetworkClick}
            onSave={handleSaveNetwork}
            onExport={handleExportPng}
          />
        </Box>

        <Box sx={{ width: "320px", height: "640px" }}>
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
          />
        </Box>
      </Box>



      <SummaryTable network={network} />

      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Network Snapshot
          </Typography>
          <Button
            size="small"
            onClick={() => setShowSnapshot(prev => !prev)}
            aria-label="Toggle network snapshot visibility"
            sx={{ color: "text.primary", minWidth: 0, p: 0.5 }}
          >
            {showSnapshot ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="m16.01 10.62-1.4 1.4L9 6.45l-5.59 5.59-1.4-1.41 7-7z" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="m16.01 7.43-1.4-1.41L9 11.6 3.42 6l-1.4 1.42 7 7z" />
              </svg>
            )}
          </Button>
        </Box>
        {showSnapshot && (
          <pre
            style={{
              background: "#0f172a",
              color: "#86efac",
              padding: "16px",
              borderRadius: "8px",
              maxHeight: "640px",
              overflow: "auto",
              fontSize: "12px",
            }}
          >
            {JSON.stringify(network, null, 2)}
          </pre>
        )}
      </Stack>
    </Stack>
  );
}
