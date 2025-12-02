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
import { useNetworkStore } from "@/store/useNetworkStore";
// import { convertUnit } from "@/lib/unitConversion";

const createNetworkWithDerivedValues = () =>
  applyFittingLosses(createInitialNetwork());

const applyFittingLosses = (network: NetworkState): NetworkState => ({
  ...network,
  pipes: network.pipes.map(recalculatePipeFittingLosses),
});

export default function Home() {
  const {
    network,
    setNetwork,
    selection,
    resetNetwork,
    clearNetwork,
    showSummary,
    setShowSummary,
    showSnapshot,
    setShowSnapshot,
    isExporting,
    setIsExporting,
  } = useNetworkStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const handleNetworkChange = useCallback((updatedNetwork: NetworkState) => {
    setNetwork(updatedNetwork);
  }, [setNetwork]);

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
        filter: (node: Node) => {
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
  }, [network, setIsExporting]);

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
          // Selection and history reset are handled in setNetwork if needed, 
          // but here we might want to explicitly reset history if it's a new load.
          // The store's setNetwork appends to history. 
          // We might need a specific 'loadNetwork' action in the store to reset history.
          // For now, let's use setNetwork, which will add to history. 
          // If we want to reset history, we should add a resetHistory action or use clearNetwork then setNetwork.
          // Actually, let's just use setNetwork. The user might want to undo the load.
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
    [setNetwork]
  );

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
      }
    } catch (error) {
      console.error("Failed to import Excel file", error);
      alert("Failed to import Excel file. Please check the console for details.");
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }
    }
  }, [setNetwork]);

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
        network={network}
        onNetworkChange={handleNetworkChange}
        onReset={resetNetwork}
        onImportExcel={handleImportExcelClick}
      />

      <Box sx={{
        position: "relative",
        flex: 1, width: "100%",
        overflow: "hidden",
        borderRadius: "24px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0px 0px 12px rgba(0, 0, 0, 0.1)",
      }}>
        <Box sx={{
          width: "100%",
          height: "100%",
        }}>
          <NetworkEditor
            height="100%"
            forceLightMode={isExporting}
            onLoad={handleLoadNetworkClick}
            onSave={handleSaveNetwork}
            onExport={handleExportPng}
            onNew={clearNetwork}
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
              borderRadius: "27px",
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          >
            <PropertiesPanel />
          </Paper>
        </Slide>
      </Box>



      <Dialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        maxWidth="xl"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              height: "100vh",
              bgcolor: "background.paper",
              borderRadius: 0,
              m: 0,
            }
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
          <SummaryTable />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSnapshot}
        onClose={() => setShowSnapshot(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0f172a",
              color: "#86efac",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.7)",
            }
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
