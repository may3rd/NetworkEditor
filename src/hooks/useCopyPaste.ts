import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect } from "react";
import { NetworkState, NodeProps, PipeProps } from "@/lib/types";

export const useCopyPaste = (
    network: NetworkState,
    onNetworkChange: ((updatedNetwork: NetworkState) => void) | undefined,
    onPaste?: (pastedNodeIds: string[]) => void,
) => {
    const { getNodes, getEdges } = useReactFlow();

    const onCopyCapture = useCallback(
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

            const selectedNodes = getNodes().filter((n) => n.selected);
            const selectedEdges = getEdges().filter((e) => e.selected);

            if (selectedNodes.length === 0 && selectedEdges.length === 0) {
                return;
            }

            event.preventDefault();

            const nodesToCopy = network.nodes.filter((n) =>
                selectedNodes.some((sn) => sn.id === n.id)
            );

            const edgesToCopy = network.pipes.filter((p) =>
                selectedEdges.some((se) => se.id === p.id)
            );

            const implicitEdges = network.pipes.filter(p =>
                selectedNodes.some(sn => sn.id === p.startNodeId) &&
                selectedNodes.some(sn => sn.id === p.endNodeId)
            );

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

                if ((!nodes || nodes.length === 0) && (!pipes || pipes.length === 0)) return;

                event.preventDefault();

                const idMap = new Map<string, string>();
                const newNodes: NodeProps[] = [];
                const newPipes: PipeProps[] = [];

                if (nodes) {
                    nodes.forEach((node) => {
                        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        idMap.set(node.id, newId);

                        let counter = 1;
                        let candidateLabel = node.label;
                        const labelExists = (lbl: string) =>
                            network.nodes.some(n => n.label === lbl) || newNodes.some(n => n.label === lbl);

                        let suffix = "-1";
                        while (labelExists(candidateLabel)) {
                            candidateLabel = `${candidateLabel}${suffix}`;
                        }

                        newNodes.push({
                            ...node,
                            id: newId,
                            label: candidateLabel,
                            position: {
                                x: node.position.x + 20,
                                y: node.position.y + 20,
                            },
                        });
                    });
                }

                if (pipes) {
                    pipes.forEach((pipe) => {
                        const newStartId = idMap.get(pipe.startNodeId);
                        const newEndId = idMap.get(pipe.endNodeId);

                        if (newStartId && newEndId) {
                            const newId = `pipe-${newStartId}-${newEndId}-${Date.now()}`;

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

                    if (onPaste) {
                        onPaste(newNodes.map((n) => n.id));
                    }
                }
            } catch (error) {
                console.error("Failed to paste network elements:", error);
            }
        },
        [network, onNetworkChange, onPaste]
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
