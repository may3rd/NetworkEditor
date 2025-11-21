"use client";

import { Button, Flex, Heading, Stack } from "@chakra-ui/react";
import { useCallback, useState, useEffect } from "react";
import { NetworkEditor } from "@/components/NetworkEditor";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Header } from "@/components/Header";
import { SummaryPanel } from "@/components/SummaryPanel";
import { createInitialNetwork, NetworkState, SelectedElement } from "@/lib/types";
import { runHydraulicCalculation } from "@/lib/solverClient";

export default function Home() {
  const [network, setNetwork] = useState<NetworkState>(() => createInitialNetwork());
  const [isSolving, setIsSolving] = useState(false);

  // Selection state
  const [selection, setSelection] = useState<SelectedElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"node" | "pipe" | null>(null);
  const [lastSolvedAt, setLastSolvedAt] = useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Multi-step Undo/Redo – fixed logic
  // ──────────────────────────────────────────────────────────────
  const HISTORY_LIMIT = 20;
  const [history, setHistory] = useState<NetworkState[]>([createInitialNetwork()]);
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

  return (
    <Stack bg="#f8fafc" minH="100vh" gap={6} p={8}>
      <Header onSolve={handleSolve} isSolving={isSolving} lastSolvedAt={lastSolvedAt} />
      <SummaryPanel network={network} lastSolvedAt={lastSolvedAt} />

      <Flex gap={4} align="flex-start" flexDirection={{ base: "column", xl: "row" }}>
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
          height="600px"
        />

        <PropertiesPanel
          network={network}
          selected={selection}
          onUpdateNode={(id, patch) =>
            setNetwork(current => ({
              ...current,
              nodes: current.nodes.map(node =>
                node.id === id ? { ...node, ...patch } : node
              ),
            }))
          }
          onUpdatePipe={(id, patch) =>
            setNetwork(current => ({
              ...current,
              pipes: current.pipes.map(pipe =>
                pipe.id === id ? { ...pipe, ...patch } : pipe
              ),
            }))
          }
          onReset={() => {
            setNetwork(createInitialNetwork());
            setSelection(null);
            setSelectedId(null);
            setSelectedType(null);
            setHistory([]);
            setHistoryIndex(-1);
          }}
        />
      </Flex>

      <Stack gap={3}>
        <Flex align="center" gap={2}>
          <Heading size="md" m={0}>
            Network snapshot
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowSnapshot(prev => !prev)}
            aria-label="Toggle network snapshot visibility"
            color="currentColor"
          >
            {showSnapshot ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="m16.01 7.43-1.4-1.41L9 11.6 3.42 6l-1.4 1.42 7 7z" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="m16.01 10.62-1.4 1.4L9 6.45l-5.59 5.59-1.4-1.41 7-7z" />
              </svg>
            )}
          </Button>
        </Flex>
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
