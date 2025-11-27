import { useReactFlow, Node, Edge } from "@xyflow/react";
import { useCallback, useEffect } from "react";
import { NetworkState, NodeProps, PipeProps } from "@/lib/types";

export const useCopyPaste = (
    network: NetworkState,
    onNetworkChange: ((updatedNetwork: NetworkState) => void) | undefined,
) => {
    const { getNodes, getEdges } = useReactFlow();

    const onCopyCapture = useCallback(
        (event: ClipboardEvent) => {
            // Prevent default behavior to handle it manually
            // We only want to intercept if we are not in an input field
            const activeElement = document.activeElement;
            if (
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    (activeElement as HTMLElement).isContentEditable)
            ) {
                return;
            }

            const selectedNodes = getNodes().filter((n) => n.selected);
            const selectedEdges = getEdges().filter((e) => e.selected);

            if (selectedNodes.length === 0 && selectedEdges.length === 0) {
                return;
            }

            event.preventDefault();

            // Find full data objects from network state
            const nodesToCopy = network.nodes.filter((n) =>
                selectedNodes.some((sn) => sn.id === n.id)
            );

            // Only copy edges if both source and target are also being copied
            // OR if the edge itself is selected.
            // However, if we paste an edge without its nodes, it might be invalid if we can't map the IDs.
            // Strategy: Copy selected edges. When pasting, only keep edges where we can resolve the endpoints.
            // But wait, if I select just an edge and copy/paste it, what should happen?
            // Usually you can't duplicate just a connection without the things it connects.
            // So we will restrict copying edges to:
            // 1. Edges that are explicitly selected
            // 2. AND/OR Edges whose both nodes are selected?
            // Let's stick to "Selected items". If I select an edge and copy it, I probably want to copy it.
            // But pasting it requires new nodes or reusing existing ones?
            // If I reuse existing ones, it's just a duplicate pipe between same nodes? That's allowed in our model?
            // The `handleConnect` logic prevents duplicate connections.
            // So let's focus on copying nodes and the edges between them.

            const edgesToCopy = network.pipes.filter((p) =>
                selectedEdges.some((se) => se.id === p.id)
            );

            // Also include edges that connect two selected nodes, even if the edge itself wasn't explicitly selected?
            // Standard diagramming tool behavior: usually yes.
            // But let's start with explicit selection or implicit if both nodes selected.
            const implicitEdges = network.pipes.filter(p =>
                selectedNodes.some(sn => sn.id === p.startNodeId) &&
                selectedNodes.some(sn => sn.id === p.endNodeId)
            );

            // Merge unique edges
            const allEdgesToCopy = [...new Set([...edgesToCopy, ...implicitEdges])];

            const clipboardData = {
                nodes: nodesToCopy,
                pipes: allEdgesToCopy,
            };

            event.clipboardData?.setData(
                "application/json",
                JSON.stringify(clipboardData)
            );
        },
        [getNodes, getEdges, network]
    );

    const onPasteCapture = useCallback(
        (event: ClipboardEvent) => {
            const activeElement = document.activeElement;
            if (
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    (activeElement as HTMLElement).isContentEditable)
            ) {
                return;
            }

            const dataStr = event.clipboardData?.getData("application/json");
            if (!dataStr) return;

            try {
                const { nodes, pipes } = JSON.parse(dataStr) as {
                    nodes: NodeProps[];
                    pipes: PipeProps[];
                };

                if (!nodes && !pipes) return;
                if ((!nodes || nodes.length === 0) && (!pipes || pipes.length === 0)) return;

                event.preventDefault();

                const idMap = new Map<string, string>();
                const newNodes: NodeProps[] = [];
                const newPipes: PipeProps[] = [];

                // Process Nodes
                if (nodes) {
                    nodes.forEach((node) => {
                        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        idMap.set(node.id, newId);

                        // Generate unique label
                        let newLabel = node.label;
                        // Check for collision in existing network AND in the new batch being created
                        // Actually, we should check against the final combined list, but checking current network + suffix is a good heuristic.
                        // Simple approach: append -1, then -1-1, etc.
                        let counter = 1;
                        let candidateLabel = `${node.label}-1`;

                        // Helper to check if label exists in network or newNodes
                        const labelExists = (lbl: string) =>
                            network.nodes.some(n => n.label === lbl) || newNodes.some(n => n.label === lbl);

                        while (labelExists(candidateLabel)) {
                            candidateLabel = `${node.label}-${++counter}`; // Actually this logic produces Node A-2, Node A-3. 
                            // If we want Node A-1-1, we need to base it on the *copied* label.
                            // If I copy "Node A", I get "Node A-1".
                            // If I copy "Node A-1", I get "Node A-1-1"? Or "Node A-2"?
                            // The user prompt asked for adding '-1' at end.
                            // Let's try to just append -1.
                        }
                        // Wait, if I paste multiple times, I want unique names.
                        // If I paste "Node A", I get "Node A-1".
                        // If I paste again, "Node A-1" exists, so I should get "Node A-1-1" or "Node A-2"?
                        // "add '-1' at end if target name is already exist" implies recursive appending.

                        let suffix = "-1";
                        candidateLabel = node.label;
                        while (labelExists(candidateLabel)) {
                            candidateLabel = `${candidateLabel}${suffix}`;
                        }

                        newNodes.push({
                            ...node,
                            id: newId,
                            label: candidateLabel,
                            position: {
                                x: node.position.x + 20, // Offset
                                y: node.position.y + 20,
                            },
                        });
                    });
                }

                // Process Pipes
                if (pipes) {
                    pipes.forEach((pipe) => {
                        // We can only paste a pipe if we have mapped IDs for its start and end nodes.
                        // This implies we only support pasting pipes that are internal to the copied group.
                        const newStartId = idMap.get(pipe.startNodeId);
                        const newEndId = idMap.get(pipe.endNodeId);

                        if (newStartId && newEndId) {
                            const newId = `pipe-${newStartId}-${newEndId}-${Date.now()}`;

                            // Unique Name
                            let candidateName = pipe.name || "Pipe";
                            const nameExists = (name: string) =>
                                network.pipes.some(p => p.name === name) || newPipes.some(p => p.name === name);

                            let suffix = "-1";
                            while (nameExists(candidateName)) {
                                candidateName = `${candidateName}${suffix}`;
                            }

                            newPipes.push({
                                ...pipe,
                                id: newId,
                                name: candidateName,
                                startNodeId: newStartId,
                                endNodeId: newEndId,
                            });
                        }
                    });
                }

                if (onNetworkChange) {
                    onNetworkChange({
                        nodes: [...network.nodes, ...newNodes],
                        pipes: [...network.pipes, ...newPipes],
                    });
                }
            } catch (error) {
                console.error("Failed to paste network elements:", error);
            }
        },
        [network, onNetworkChange]
    );

    useEffect(() => {
        window.addEventListener("copy", onCopyCapture);
        window.addEventListener("paste", onPasteCapture);
        return () => {
            window.removeEventListener("copy", onCopyCapture);
            window.removeEventListener("paste", onPasteCapture);
        };
    }, [onCopyCapture, onPasteCapture]);
};
