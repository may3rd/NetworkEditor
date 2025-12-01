import {
    Stack,
    ButtonGroup,
    Tooltip,
    IconButton,
    ToggleButton,
    Box,
    useTheme,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Undo as UndoIcon,
    Redo as RedoIcon,
    Grid3x3 as GridIcon,
    GridOn as GridOnIcon,
    PanTool as PanToolIcon,
    DarkMode as DarkModeIcon,
    RotateRight as RotateRightIcon,
    RotateLeft as RotateLeftIcon,
    SwapHoriz as SwapHorizIcon,
    SwapVert as SwapVertIcon,
    Save as SaveIcon,
    FolderOpen as LoadIcon,
    Image as ExportIcon,
    Visibility as VisibilityIcon,
    TableChart as TableChartIcon,
    Wallpaper as WallpaperIcon,
    Settings as SettingsIcon,
    Cable as CableIcon,
    InsertDriveFileOutlined as NoteAddIcon,
} from "@mui/icons-material";
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useColorMode } from "@/contexts/ColorModeContext";
import ViewSettingsDialog from "@/components/ViewSettingsDialog";
import { NetworkState, ViewSettings } from "@/lib/types";
import { useState, useRef, ChangeEvent } from "react";

type EditorToolbarProps = {
    network: NetworkState;
    onNetworkChange?: (updatedNetwork: NetworkState) => void;
    onNew?: () => void;
    onLoad?: () => void;
    onSave?: () => void;
    onExport?: () => void;
    onToggleSummary?: () => void;
    onToggleSnapshot?: () => void;
    setShowBackgroundSettings: (show: boolean) => void;
    setIsAddingNode: (isAdding: boolean) => void;
    isAddingNode: boolean;
    onDelete?: () => void;
    selectedId: string | null;
    selectedType: "node" | "pipe" | null;
    onUndo?: () => void;
    canUndo: boolean;
    onRedo?: () => void;
    canRedo: boolean;
    handleRotateCW: () => void;
    handleRotateCCW: () => void;
    handleSwapLeftRight: () => void;
    handleSwapUpDown: () => void;
    snapToGrid: boolean;
    setSnapToGrid: (snap: boolean) => void;
    showGrid: boolean;
    setShowGrid: (show: boolean) => void;
    panModeEnabled: boolean;
    setPanModeEnabled: (pan: boolean) => void;
    isConnectingMode?: boolean;
    onToggleConnectingMode?: () => void;
    isAnimationEnabled?: boolean;
    onToggleAnimation?: () => void;
    viewSettings: ViewSettings;
    setViewSettings: (settings: ViewSettings) => void;
};

export function EditorToolbar({
    network,
    onNetworkChange,
    onNew,
    onLoad,
    onSave,
    onExport,
    onToggleSummary,
    onToggleSnapshot,
    setShowBackgroundSettings,
    setIsAddingNode,
    isAddingNode,
    onDelete,
    selectedId,
    selectedType,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    handleRotateCW,
    handleRotateCCW,
    handleSwapLeftRight,
    handleSwapUpDown,
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    panModeEnabled,
    setPanModeEnabled,
    isConnectingMode,
    onToggleConnectingMode,
    isAnimationEnabled,
    onToggleAnimation,
    viewSettings,
    setViewSettings,
}: EditorToolbarProps) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const [viewSettingsDialogOpen, setViewSettingsDialogOpen] = useState(false);
    const backgroundInputRef = useRef<HTMLInputElement | null>(null);

    const handleUploadBackground = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !onNetworkChange) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                onNetworkChange({
                    ...network,
                    backgroundImage: result,
                    backgroundImageSize: { width: img.width, height: img.height },
                    backgroundImageOpacity: 1,
                    backgroundImagePosition: { x: 0, y: 0 },
                    backgroundImageLocked: true,
                });
                setShowBackgroundSettings(true);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);

        // Reset input
        if (backgroundInputRef.current) {
            backgroundInputRef.current.value = "";
        }
    };

    return (
        <>
            <input
                type="file"
                accept="image/*"
                ref={backgroundInputRef}
                style={{ display: "none" }}
                onChange={handleUploadBackground}
            />
            <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                    height: 64,
                    width: "100%",
                    flexShrink: 0,
                    bgcolor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: 2,
                    zIndex: 10,
                    pl: 1.5,
                }}
            >
                <Stack direction="row" spacing={2}>
                    <ButtonGroup variant="contained" aria-label="File tools">
                        <Tooltip title="New">
                            <span>
                                <IconButton onClick={onNew} disabled={!onNew}>
                                    <NoteAddIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Load">
                            <span>
                                <IconButton onClick={onLoad} disabled={!onLoad}>
                                    <LoadIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Save">
                            <span>
                                <IconButton onClick={onSave} disabled={!onSave}>
                                    <SaveIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Export">
                            <span>
                                <IconButton onClick={onExport} disabled={!onExport}>
                                    <ExportIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {onToggleSummary && (
                            <Tooltip title="Summary Table">
                                <IconButton onClick={onToggleSummary}>
                                    <TableChartIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Upload Background">
                            <IconButton onClick={() => backgroundInputRef.current?.click()}>
                                <WallpaperIcon />
                            </IconButton>
                        </Tooltip>
                        {network.backgroundImage && (
                            <Tooltip title="Background Settings">
                                <IconButton onClick={() => setShowBackgroundSettings(true)}>
                                    <SettingsIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </ButtonGroup>

                    <ButtonGroup variant="contained" aria-label="Edit tools">
                        <Tooltip title="Delete Selected">
                            <span>
                                <IconButton onClick={onDelete} disabled={!selectedId}>
                                    <DeleteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Undo">
                            <span>
                                <IconButton onClick={onUndo} disabled={!canUndo}>
                                    <UndoIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Redo">
                            <span>
                                <IconButton onClick={onRedo} disabled={!canRedo}>
                                    <RedoIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    <ButtonGroup variant="contained" aria-label="Rotation tools">
                        <Tooltip title="Rotate 90° CW">
                            <span>
                                <IconButton onClick={handleRotateCW} disabled={!selectedId || selectedType !== "node"}>
                                    <RotateRightIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Rotate 90° CCW">
                            <span>
                                <IconButton onClick={handleRotateCCW} disabled={!selectedId || selectedType !== "node"}>
                                    <RotateLeftIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Swap Left-Right">
                            <span>
                                <IconButton
                                    onClick={handleSwapLeftRight}
                                    disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 0}
                                >
                                    <SwapHorizIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Swap Up-Down">
                            <span>
                                <IconButton
                                    onClick={handleSwapUpDown}
                                    disabled={!selectedId || selectedType !== "node" || (network.nodes.find(n => n.id === selectedId)?.rotation ?? 0) % 180 !== 90}
                                >
                                    <SwapVertIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    <ButtonGroup variant="contained" aria-label="View tools">
                        <Tooltip title="Snap to Grid">
                            <ToggleButton
                                value="snap"
                                selected={snapToGrid}
                                onChange={() => setSnapToGrid(!snapToGrid)}
                                sx={{ width: 40, height: 40, border: 'none' }}
                            >
                                <GridIcon />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Show Grid">
                            <ToggleButton
                                value="grid"
                                selected={showGrid}
                                onChange={() => setShowGrid(!showGrid)}
                                sx={{ width: 40, height: 40, border: 'none' }}
                            >
                                <GridOnIcon />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Pan Mode">
                            <ToggleButton
                                value="pan"
                                selected={panModeEnabled}
                                onChange={() => {
                                    if (panModeEnabled) {
                                        setPanModeEnabled(false);
                                    } else {
                                        setPanModeEnabled(true);
                                        if (isAddingNode) {
                                            setIsAddingNode(false);
                                        }
                                    }
                                }}
                                sx={{ width: 40, height: 40, border: 'none' }}
                            >
                                <PanToolIcon />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Add Node">
                            <ToggleButton
                                value="add"
                                selected={isAddingNode}
                                onChange={() => {
                                    if (isAddingNode) {
                                        setIsAddingNode(false);
                                    } else {
                                        setIsAddingNode(true);
                                        if (isConnectingMode && onToggleConnectingMode) {
                                            onToggleConnectingMode();
                                        }
                                        if (panModeEnabled) {
                                            setPanModeEnabled(false);
                                        }
                                    }
                                }}
                                sx={{ width: 40, height: 40, border: 'none' }}
                            >
                                <AddIcon />
                            </ToggleButton>
                        </Tooltip>
                        {onToggleConnectingMode && (
                            <Tooltip title="Connecting Mode">
                                <ToggleButton
                                    value="connect"
                                    selected={isConnectingMode}
                                    onChange={() => {
                                        if (onToggleConnectingMode) {
                                            onToggleConnectingMode();
                                            if (!isConnectingMode && isAddingNode) {
                                                setIsAddingNode(false);
                                            }
                                        }
                                    }}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <CableIcon />
                                </ToggleButton>
                            </Tooltip>
                        )}
                        {onToggleAnimation && (
                            <Tooltip title="Flow Animation">
                                <ToggleButton
                                    value="animation"
                                    selected={isAnimationEnabled}
                                    onChange={onToggleAnimation}
                                    sx={{ width: 40, height: 40, border: 'none' }}
                                >
                                    <DirectionsRunIcon />
                                </ToggleButton>
                            </Tooltip>
                        )}
                        <ViewSettingsDialog
                            open={viewSettingsDialogOpen}
                            onClose={() => setViewSettingsDialogOpen(false)}
                            settings={viewSettings}
                            onSettingsChange={setViewSettings}
                        />
                        <Tooltip title="View Settings">
                            <IconButton onClick={() => setViewSettingsDialogOpen(true)} sx={{ width: 40, height: 40 }}>
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Toggle Dark Mode">
                            <IconButton onClick={toggleColorMode} sx={{ width: 40, height: 40 }}>
                                <DarkModeIcon />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>
                </Stack>

                <Box sx={{ flexGrow: 1 }} />

                {onToggleSnapshot && (
                    <Tooltip title="Network Snapshot">
                        <IconButton onClick={onToggleSnapshot}>
                            <VisibilityIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        </>
    );
}
