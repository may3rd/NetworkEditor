import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    TextField,
    Switch,
    Typography,
    Box
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ViewSettings } from "@/lib/types";
import { IOSListGroup } from "./ios/IOSListGroup";
import { IOSListItem } from "./ios/IOSListItem";
import { glassDialogSx } from "@/lib/glassStyles";
import { useState } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    settings: ViewSettings;
    onSettingsChange: (newSettings: ViewSettings) => void;
};

export default function ViewSettingsDialog({ open, onClose, settings, onSettingsChange }: Props) {
    const [currentView, setCurrentView] = useState<"main" | "unitSystem">("main");

    const handleUnitChange = (value: ViewSettings["unitSystem"]) => {
        onSettingsChange({
            ...settings,
            unitSystem: value,
        });
    };

    const toggleNodeSetting = (key: keyof ViewSettings["node"]) => {
        onSettingsChange({
            ...settings,
            node: {
                ...settings.node,
                [key]: !settings.node[key],
            },
        });
    };

    const togglePipeSetting = (key: keyof Omit<ViewSettings["pipe"], "decimals">) => {
        onSettingsChange({
            ...settings,
            pipe: {
                ...settings.pipe,
                [key]: !settings.pipe[key],
            },
        });
    };

    const handleNodeDecimalChange = (key: keyof ViewSettings["node"]["decimals"], value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
            onSettingsChange({
                ...settings,
                node: {
                    ...settings.node,
                    decimals: {
                        ...settings.node.decimals,
                        [key]: numValue,
                    },
                },
            });
        }
    };

    const handlePipeDecimalChange = (key: keyof ViewSettings["pipe"]["decimals"], value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
            onSettingsChange({
                ...settings,
                pipe: {
                    ...settings.pipe,
                    decimals: {
                        ...settings.pipe.decimals,
                        [key]: numValue,
                    },
                },
            });
        }
    };

    const DecimalStepper = ({ value, onChange }: { value: number | undefined, onChange: (val: string) => void }) => {
        const decimals = value ?? 2;
        const formatExample = (0).toFixed(decimals);

        const handleIncrement = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (decimals < 10) onChange((decimals + 1).toString());
        };

        const handleDecrement = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (decimals > 0) onChange((decimals - 1).toString());
        };

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                    size="small"
                    onClick={handleIncrement}
                    sx={{
                        width: 24,
                        height: 24,
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                        },
                    }}
                >
                    <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography sx={{ minWidth: 40, textAlign: 'center', fontSize: '14px', fontFamily: 'monospace' }}>
                    {formatExample}
                </Typography>
                <IconButton
                    size="small"
                    onClick={handleDecrement}
                    sx={{
                        width: 24,
                        height: 24,
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                        },
                    }}
                >
                    <RemoveIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>
        );
    };

    const getUnitLabel = (system: ViewSettings["unitSystem"]) => {
        switch (system) {
            case "metric": return "kPag";
            case "fieldSI": return "Barg";
            case "metric_kgcm2": return "kg/cm2g";
            case "imperial": return "psig";
            default: return "kPag";
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: glassDialogSx
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {currentView === "unitSystem" ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            onClick={() => setCurrentView("main")}
                            sx={{ mr: 1, color: (theme) => theme.palette.primary.main }}
                            size="small"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            Unit System
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            View Settings
                        </Typography>
                    </Box>
                )}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                        },
                    }}
                    size="small"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderTop: 'none', borderBottom: 'none', p: 0 }}>
                <Box sx={{ pt: 2 }}>
                    {currentView === "main" ? (
                        <>
                            <IOSListGroup>
                                <IOSListItem
                                    label="Unit Display"
                                    value={getUnitLabel(settings.unitSystem)}
                                    onClick={() => setCurrentView("unitSystem")}
                                    chevron
                                    last
                                />
                            </IOSListGroup>

                            <IOSListGroup header="Node Labels" headerAlign="center">
                                <IOSListItem
                                    label="Name"
                                    control={<Switch checked={settings.node.name} onChange={() => toggleNodeSetting("name")} />}
                                />
                                <IOSListItem
                                    label="Pressure"
                                    value={<DecimalStepper value={settings.node.decimals?.pressure} onChange={(v) => handleNodeDecimalChange("pressure", v)} />}
                                    control={<Switch checked={settings.node.pressure} onChange={() => toggleNodeSetting("pressure")} />}
                                />
                                <IOSListItem
                                    label="Temperature"
                                    value={<DecimalStepper value={settings.node.decimals?.temperature} onChange={(v) => handleNodeDecimalChange("temperature", v)} />}
                                    control={<Switch checked={settings.node.temperature} onChange={() => toggleNodeSetting("temperature")} />}
                                />
                                <IOSListItem
                                    label="Hover Card"
                                    control={<Switch checked={settings.node.hoverCard} onChange={() => toggleNodeSetting("hoverCard")} />}
                                    last
                                />
                            </IOSListGroup>

                            <IOSListGroup header="Pipe Labels" headerAlign="center">
                                <IOSListItem
                                    label="Name"
                                    control={<Switch checked={settings.pipe.name} onChange={() => togglePipeSetting("name")} />}
                                />
                                <IOSListItem
                                    label="Mass Flow Rate"
                                    value={<DecimalStepper value={settings.pipe.decimals?.massFlowRate} onChange={(v) => handlePipeDecimalChange("massFlowRate", v)} />}
                                    control={<Switch checked={settings.pipe.massFlowRate} onChange={() => togglePipeSetting("massFlowRate")} />}
                                />
                                <IOSListItem
                                    label="Length"
                                    value={<DecimalStepper value={settings.pipe.decimals?.length} onChange={(v) => handlePipeDecimalChange("length", v)} />}
                                    control={<Switch checked={settings.pipe.length} onChange={() => togglePipeSetting("length")} />}
                                />
                                <IOSListItem
                                    label="Velocity"
                                    value={<DecimalStepper value={settings.pipe.decimals?.velocity} onChange={(v) => handlePipeDecimalChange("velocity", v)} />}
                                    control={<Switch checked={settings.pipe.velocity} onChange={() => togglePipeSetting("velocity")} />}
                                />
                                <IOSListItem
                                    label="Pressure Drop (ΔP)"
                                    value={<DecimalStepper value={settings.pipe.decimals?.deltaP} onChange={(v) => handlePipeDecimalChange("deltaP", v)} />}
                                    control={<Switch checked={settings.pipe.deltaP} onChange={() => togglePipeSetting("deltaP")} />}
                                />
                                <IOSListItem
                                    label="dP/100m"
                                    value={<DecimalStepper value={settings.pipe.decimals?.dPPer100m} onChange={(v) => handlePipeDecimalChange("dPPer100m", v)} />}
                                    control={<Switch checked={settings.pipe.dPPer100m} onChange={() => togglePipeSetting("dPPer100m")} />}
                                    last
                                />
                            </IOSListGroup>
                        </>
                    ) : (
                        <IOSListGroup>
                            <IOSListItem
                                label="kPag"
                                value={settings.unitSystem === "metric" ? <CheckIcon color="primary" /> : ""}
                                onClick={() => handleUnitChange("metric")}
                            />
                            <IOSListItem
                                label="Barg"
                                value={settings.unitSystem === "fieldSI" ? <CheckIcon color="primary" /> : ""}
                                onClick={() => handleUnitChange("fieldSI")}
                            />
                            <IOSListItem
                                label="kg/cm2g"
                                value={settings.unitSystem === "metric_kgcm2" ? <CheckIcon color="primary" /> : ""}
                                onClick={() => handleUnitChange("metric_kgcm2")}
                            />
                            <IOSListItem
                                label="psig"
                                value={settings.unitSystem === "imperial" ? <CheckIcon color="primary" /> : ""}
                                onClick={() => handleUnitChange("imperial")}
                                last
                            />
                        </IOSListGroup>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
