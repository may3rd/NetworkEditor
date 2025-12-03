import { create } from 'zustand';
import {
    NetworkState,
    SelectedElement,
    ViewSettings,
    NodePatch,
    PipePatch,
    NodeProps,
    PipeProps,
    createInitialNetwork
} from '@/lib/types';
import { recalculatePipeFittingLosses } from '@/lib/fittings';

// Helper functions
const applyFittingLosses = (network: NetworkState): NetworkState => ({
    ...network,
    pipes: network.pipes.map(recalculatePipeFittingLosses),
});

const createNetworkWithDerivedValues = () =>
    applyFittingLosses(createInitialNetwork());

const HISTORY_LIMIT = 50;

interface NetworkStore {
    // State
    network: NetworkState;
    selection: SelectedElement;
    selectedId: string | null;
    selectedType: "node" | "pipe" | null;
    multiSelection: { nodes: string[]; edges: string[] };

    // History
    history: NetworkState[];
    historyIndex: number;

    // UI State
    viewSettings: ViewSettings;
    showSummary: boolean;
    showSnapshot: boolean;
    isAnimationEnabled: boolean;
    isConnectingMode: boolean;
    isExporting: boolean;
    isPanelOpen: boolean;

    // Actions
    setNetwork: (network: NetworkState | ((prev: NetworkState) => NetworkState)) => void;
    selectElement: (id: string | null, type: "node" | "pipe" | null, options?: { openPanel?: boolean }) => void;
    setMultiSelection: (selection: { nodes: string[]; edges: string[] }) => void;
    updateNode: (id: string, patch: NodePatch) => void;
    updatePipe: (id: string, patch: PipePatch) => void;
    deleteSelection: () => void;
    undo: () => void;
    redo: () => void;
    resetNetwork: () => void;
    clearNetwork: () => void;

    // UI Actions
    setViewSettings: (settings: ViewSettings | ((prev: ViewSettings) => ViewSettings)) => void;
    setShowSummary: (show: boolean) => void;
    setShowSnapshot: (show: boolean) => void;
    setIsAnimationEnabled: (enabled: boolean) => void;
    setIsConnectingMode: (enabled: boolean) => void;
    setIsExporting: (exporting: boolean) => void;
}

const defaultViewSettings: ViewSettings = {
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
        hoverCard: false,
        decimals: {
            length: 2,
            deltaP: 2,
            velocity: 2,
            dPPer100m: 2,
            massFlowRate: 2,
        },
    },
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
    // Initial State
    network: createNetworkWithDerivedValues(),
    selection: null,
    selectedId: null,
    selectedType: null,
    multiSelection: { nodes: [], edges: [] },
    isPanelOpen: false,

    history: [createNetworkWithDerivedValues()],
    historyIndex: 0,

    viewSettings: defaultViewSettings,
    showSummary: false,
    showSnapshot: false,
    isAnimationEnabled: false,
    isConnectingMode: false,
    isExporting: false,

    // Actions
    setNetwork: (networkOrUpdater) => {
        set((state) => {
            const newNetwork = typeof networkOrUpdater === 'function'
                ? networkOrUpdater(state.network)
                : networkOrUpdater;

            // History logic
            const currentState = state.history[state.historyIndex];
            const isSame =
                JSON.stringify(currentState?.nodes) === JSON.stringify(newNetwork.nodes) &&
                JSON.stringify(currentState?.pipes) === JSON.stringify(newNetwork.pipes);

            if (isSame) {
                // Even if nodes/pipes are same, viewSettings might have changed
                let newViewSettings = state.viewSettings;
                if (newNetwork.viewSettings) {
                    newViewSettings = {
                        ...state.viewSettings,
                        ...newNetwork.viewSettings,
                        node: { ...state.viewSettings.node, ...newNetwork.viewSettings?.node },
                        pipe: { ...state.viewSettings.pipe, ...newNetwork.viewSettings?.pipe }
                    };
                }
                return { network: newNetwork, viewSettings: newViewSettings };
            }

            let newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(newNetwork);
            if (newHistory.length > HISTORY_LIMIT) {
                newHistory = newHistory.slice(-HISTORY_LIMIT);
            }

            // Sync view settings if present in the new network
            let newViewSettings = state.viewSettings;
            if (newNetwork.viewSettings) {
                newViewSettings = {
                    ...state.viewSettings,
                    ...newNetwork.viewSettings,
                    node: { ...state.viewSettings.node, ...newNetwork.viewSettings?.node },
                    pipe: { ...state.viewSettings.pipe, ...newNetwork.viewSettings?.pipe }
                };
            }

            return {
                network: newNetwork,
                history: newHistory,
                historyIndex: newHistory.length - 1,
                viewSettings: newViewSettings
            };
        });
    },

    selectElement: (id, type, options) => {
        set((state) => {
            // const isDeselecting = id === null; // No longer force close on deselect
            let newIsPanelOpen = state.isPanelOpen;

            if (options?.openPanel !== undefined) {
                newIsPanelOpen = options.openPanel;
            }
            // If options.openPanel is undefined, keep current state (persist open if already open)

            return {
                selectedId: id,
                selectedType: type,
                selection: id && type ? { id, type } : null,
                multiSelection: { nodes: [], edges: [] }, // Clear multi-selection
                isPanelOpen: newIsPanelOpen
            };
        });
    },

    setMultiSelection: (selection) => {
        set((state) => {
            // Deep equality check
            if (
                state.multiSelection.nodes.length === selection.nodes.length &&
                state.multiSelection.edges.length === selection.edges.length &&
                state.multiSelection.nodes.every((id, i) => id === selection.nodes[i]) &&
                state.multiSelection.edges.every((id, i) => id === selection.edges[i])
            ) {
                return {};
            }

            // Handle single selection via multi-selection
            if (selection.nodes.length + selection.edges.length === 1) {
                if (selection.nodes.length > 0) {
                    return {
                        multiSelection: selection,
                        selectedId: selection.nodes[0],
                        selectedType: "node",
                        selection: { id: selection.nodes[0], type: "node" }
                    };
                } else {
                    return {
                        multiSelection: selection,
                        selectedId: selection.edges[0],
                        selectedType: "pipe",
                        selection: { id: selection.edges[0], type: "pipe" }
                    };
                }
            } else if (selection.nodes.length + selection.edges.length === 0) {
                return {
                    multiSelection: selection,
                    selectedId: null,
                    selectedType: null,
                    selection: null
                };
            } else {
                return {
                    multiSelection: selection,
                    selectedId: null,
                    selectedType: null,
                    selection: null
                };
            }
        });
    },

    updateNode: (id, patch) => {
        get().setNetwork((current) => {
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
        });
    },

    updatePipe: (id, patch) => {
        get().setNetwork((current) => {
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
        });
    },

    deleteSelection: () => {
        const { multiSelection, selectedId, selectedType } = get();
        const nodesToDelete = new Set(multiSelection.nodes);
        const edgesToDelete = new Set(multiSelection.edges);

        if (selectedId && selectedType) {
            if (selectedType === "node") nodesToDelete.add(selectedId);
            if (selectedType === "pipe") edgesToDelete.add(selectedId);
        }

        if (nodesToDelete.size === 0 && edgesToDelete.size === 0) return;

        get().setNetwork(current => ({
            ...current,
            nodes: current.nodes.filter(n => !nodesToDelete.has(n.id)),
            pipes: current.pipes.filter(p => !edgesToDelete.has(p.id) && !nodesToDelete.has(p.startNodeId) && !nodesToDelete.has(p.endNodeId)),
        }));

        get().selectElement(null, null, { openPanel: false }); // Explicitly close panel on delete
    },

    undo: () => {
        set((state) => {
            if (state.historyIndex <= 0) return {};
            const newIndex = state.historyIndex - 1;
            return {
                historyIndex: newIndex,
                network: state.history[newIndex]
            };
        });
    },

    redo: () => {
        set((state) => {
            if (state.historyIndex >= state.history.length - 1) return {};
            const newIndex = state.historyIndex + 1;
            return {
                historyIndex: newIndex,
                network: state.history[newIndex]
            };
        });
    },

    resetNetwork: () => {
        const newNetwork = createNetworkWithDerivedValues();
        set({
            network: newNetwork,
            selection: null,
            selectedId: null,
            selectedType: null,
            history: [newNetwork],
            historyIndex: 0,
            isPanelOpen: false // Reset panel state
        });
    },

    clearNetwork: () => {
        const emptyNetwork: NetworkState = { nodes: [], pipes: [] };
        set({
            network: emptyNetwork,
            selection: null,
            selectedId: null,
            selectedType: null,
            history: [],
            historyIndex: -1,
            isPanelOpen: false // Reset panel state
        });
    },

    // UI Actions
    setViewSettings: (settingsOrUpdater) => {
        set((state) => ({
            viewSettings: typeof settingsOrUpdater === 'function'
                ? settingsOrUpdater(state.viewSettings)
                : settingsOrUpdater
        }));
    },
    setShowSummary: (show) => set({ showSummary: show }),
    setShowSnapshot: (show) => set({ showSnapshot: show }),
    setIsAnimationEnabled: (enabled) => set({ isAnimationEnabled: enabled }),
    setIsConnectingMode: (enabled) => set({ isConnectingMode: enabled }),
    setIsExporting: (exporting) => set({ isExporting: exporting }),
}));
