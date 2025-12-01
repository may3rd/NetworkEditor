import { useEffect, useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

type UseNetworkHotkeysProps = {
    onDelete?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    selectedId: string | null;
    selectedType: "node" | "pipe" | null;
    isAddingNode: boolean;
    setIsAddingNode: (isAdding: boolean) => void;
    isConnectingMode?: boolean;
    onToggleConnectingMode?: () => void;
};

export function useNetworkHotkeys({
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
}: UseNetworkHotkeysProps) {
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    const lastMousePos = useRef<{ x: number; y: number } | null>(null);
    const { getViewport, setViewport } = useReactFlow();

    // ── Keyboard Delete (Backspace / Delete) ───────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Backspace" && e.key !== "Delete") return;
            if (e.repeat) return;
            if (!selectedId || !selectedType) return;

            // Do not delete while typing in an input field
            const active = document.activeElement;
            if (
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    (active as HTMLElement).isContentEditable)
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Use setTimeout to allow the event loop to clear before blocking with confirm
            setTimeout(() => {
                if (window.confirm(`Delete this ${selectedType}?`)) {
                    onDelete?.();
                }
            }, 10);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, selectedType, onDelete]);

    // ── Keyboard Undo/Redo (Ctrl+Z / Ctrl+Y) ───────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "y" || e.key === "Z" || e.key === "Y")) {
                // Do not trigger if focus is on an input
                const active = document.activeElement;
                if (
                    active &&
                    (active.tagName === "INPUT" ||
                        active.tagName === "TEXTAREA" ||
                        (active as HTMLElement).isContentEditable)
                ) {
                    return;
                }

                e.preventDefault();

                if (e.key === "z" || e.key === "Z") {
                    if (e.shiftKey) {
                        if (canRedo) onRedo?.();
                    } else {
                        if (canUndo) onUndo?.();
                    }
                } else if (e.key === "y" || e.key === "Y") {
                    if (canRedo) onRedo?.();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onUndo, onRedo, canUndo, canRedo]);

    // ── Escape Key (Exit Modes) ────────────────────────────────────────────
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            if (isAddingNode) {
                event.preventDefault();
                setIsAddingNode(false);
            } else if (isConnectingMode && onToggleConnectingMode) {
                event.preventDefault();
                onToggleConnectingMode();
            }
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isAddingNode, isConnectingMode, onToggleConnectingMode, setIsAddingNode]);

    // ── Spacebar Panning ───────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "Space" || event.repeat) {
                return;
            }

            const active = document.activeElement as HTMLElement | null;
            if (
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT" ||
                    active.tagName === "BUTTON" ||
                    active.isContentEditable)
            ) {
                return;
            }

            event.preventDefault();
            setIsSpacePanning(true);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code !== "Space") {
                return;
            }
            setIsSpacePanning(false);
            lastMousePos.current = null;
        };

        const handleWindowBlur = () => {
            setIsSpacePanning(false);
            lastMousePos.current = null;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, []);

    useEffect(() => {
        if (!isSpacePanning) return;

        const handleMouseMove = (event: MouseEvent) => {
            if (lastMousePos.current) {
                const dx = event.clientX - lastMousePos.current.x;
                const dy = event.clientY - lastMousePos.current.y;
                const { x, y, zoom } = getViewport();
                setViewport({ x: x + dx, y: y + dy, zoom });
            }
            lastMousePos.current = { x: event.clientX, y: event.clientY };
        };

        const handleMouseUp = () => {
            lastMousePos.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isSpacePanning, getViewport, setViewport]);

    return { isSpacePanning };
}
