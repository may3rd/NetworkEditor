"use client";

import { Flex, Heading, Stack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { NetworkEditor } from "@/components/NetworkEditor";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Header } from "@/components/Header";
import { SummaryPanel } from "@/components/SummaryPanel";
import { createInitialNetwork, NetworkState, SelectedElement } from "@/lib/types";
import { runHydraulicCalculation } from "@/lib/solverClient";

export default function Home() {
  const [network, setNetwork] = useState<NetworkState>(() => createInitialNetwork());
  const [isSolving, setIsSolving] = useState(false);
  
  // Selection for PropertiesPanel (existing behavior)
  const [selection, setSelection] = useState<SelectedElement>(null);
  
  // New: Selection state specifically for visual highlighting in NetworkEditor
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"node" | "pipe" | null>(null);

  const [previousNetwork, setPreviousNetwork] = useState<NetworkState | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  const [lastSolvedAt, setLastSolvedAt] = useState<string | null>(null);

  const handleSolve = useCallback(async () => {
    try {
      setIsSolving(true);
      const response = await runHydraulicCalculation(network);
      setNetwork(response.network);
      setLastSolvedAt(new Date().toLocaleTimeString());
    } finally {
      setIsSolving(false);
    }
  }, [network]);

  // Unified selection handler — updates both visual highlight and properties panel
  const handleSelect = useCallback((id: string | null, type: "node" | "pipe" | null) => {
    setSelectedId(id);
    setSelectedType(type);

    // Keep existing SelectedElement format for PropertiesPanel
    if (!id || !type) {
      setSelection(null);
    } else {
      setSelection({ id, type });
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (!selection || !selectedType) return;

    // Store current state for undo
    setPreviousNetwork(network);
    setUndoMessage(
      selectedType === "node"
      ? `Node "${network.nodes.find(n => n.id === selectedId)?.label || selectedId}" deleted`
      : `Pipe deleted`
    );
    
    if (selectedType === "node") {
      const nodeId = selectedId;

      setNetwork((current) => ({
        ...current,
        nodes: current.nodes.filter(n => n.id !== nodeId),
        pipes: current.pipes.filter(p => p.startNodeId !== nodeId && p.endNodeId !== nodeId),
      }));
    } else if (selectedType === "pipe") {
      setNetwork((current) => ({
        ...current,
        pipes: current.pipes.filter(p => p.id !== selectedId),
      }));
    }
    
    // Clear selection
    handleSelect(null, null);

    // Auto-clear the message after 5 seconds
    setTimeout(() => setUndoMessage(null), 5000);
  }, [network, selectedId, selectedType, handleSelect]);

  const handleUndo = useCallback(() => {
    if (previousNetwork) {
      setNetwork(previousNetwork);
      setPreviousNetwork(null);
      setUndoMessage(null);
      handleSelect(null, null);
    }
  }, [previousNetwork, handleSelect]);

  const handleNetworkChange = useCallback((updatedNetwork: NetworkState) => {
    setNetwork(updatedNetwork);
  }, []);

  return (
    <Stack bg="#f8fafc" minH="100vh" gap={6} p={8}>
      <Header onSolve={handleSolve} isSolving={isSolving} />
      <SummaryPanel network={network} lastSolvedAt={lastSolvedAt} />

      <Flex gap={4} align="flex-start" flexDirection={{ base: "column", xl: "row" }}>
        <NetworkEditor
          network={network}
          onSelect={handleSelect}
          selectedId={selectedId}
          selectedType={selectedType}
          onDelete={handleDelete}
          onUndo={handleUndo}
          canUndo={!!previousNetwork}
          onNetworkChange={handleNetworkChange}
          height="600px"
        />

        <PropertiesPanel
          network={network}
          selected={selection}
          onUpdateNode={(id, patch) =>
            setNetwork((current) => ({
              ...current,
              nodes: current.nodes.map((node) =>
                node.id === id ? { ...node, ...patch } : node
              ),
            }))
          }
          onUpdatePipe={(id, patch) =>
            setNetwork((current) => ({
              ...current,
              pipes: current.pipes.map((pipe) =>
                pipe.id === id ? { ...pipe, ...patch } : pipe
              ),
            }))
          }
          onReset={() => {
            setNetwork(createInitialNetwork());
            setSelection(null);
            setSelectedId(null);
            setSelectedType(null);
          }}
        />
      </Flex>

      <Stack gap={3}>
        <Heading size="md">Network snapshot</Heading>
        <pre
          style={{
            background: "#0f172a",
            color: "#86efac",
            padding: "16px",
            borderRadius: "8px",
            maxHeight: "320px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(network, null, 2)}
        </pre>
      </Stack>
    </Stack>
  );
}