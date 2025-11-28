import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Checkbox,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Grid,
    Typography,
    Box,
    IconButton,
    Divider,
    Stack,
    TextField,
    InputAdornment,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { ViewSettings } from "@/lib/types";

type Props = {
    open: boolean;
    onClose: () => void;
    settings: ViewSettings;
    onSettingsChange: (newSettings: ViewSettings) => void;
};

export default function ViewSettingsDialog({ open, onClose, settings, onSettingsChange }: Props) {
    const handleUnitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({
            ...settings,
            unitSystem: event.target.value as ViewSettings["unitSystem"],
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                View Settings
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Unit System Section */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Unit System
                        </Typography>
                        <FormControl component="fieldset">
                            <RadioGroup
                                row
                                aria-label="unit-system"
                                name="unit-system"
                                value={settings.unitSystem}
                                onChange={handleUnitChange}
                            >
                                <FormControlLabel value="metric" control={<Radio />} label="kPag" />
                                <FormControlLabel value="fieldSI" control={<Radio />} label="Barg" />
                                <FormControlLabel value="metric_kgcm2" control={<Radio />} label="kg/cm2g" />
                                <FormControlLabel value="imperial" control={<Radio />} label="psig" />
                            </RadioGroup>
                        </FormControl>
                    </Box>

                    <Divider />

                    {/* Labels Section */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Labels
                        </Typography>
                        <Stack direction="row" spacing={4}>
                            <Box flex={1}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Node Labels
                                </Typography>
                                <Stack spacing={1}>
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.node.name} onChange={() => toggleNodeSetting("name")} />}
                                        label="Name"
                                    />
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.node.pressure} onChange={() => toggleNodeSetting("pressure")} />}
                                            label="Pressure"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.node.decimals?.pressure ?? 2}
                                            onChange={(e) => handleNodeDecimalChange("pressure", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.node.temperature} onChange={() => toggleNodeSetting("temperature")} />}
                                            label="Temperature"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.node.decimals?.temperature ?? 2}
                                            onChange={(e) => handleNodeDecimalChange("temperature", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                </Stack>
                            </Box>
                            <Box flex={1}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Pipe Labels
                                </Typography>
                                <Stack spacing={1}>
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.name} onChange={() => togglePipeSetting("name")} />}
                                        label="Name"
                                    />
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.pipe.massFlowRate} onChange={() => togglePipeSetting("massFlowRate")} />}
                                            label="Mass Flow Rate"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.pipe.decimals?.massFlowRate ?? 2}
                                            onChange={(e) => handlePipeDecimalChange("massFlowRate", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.pipe.length} onChange={() => togglePipeSetting("length")} />}
                                            label="Length"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.pipe.decimals?.length ?? 2}
                                            onChange={(e) => handlePipeDecimalChange("length", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.pipe.velocity} onChange={() => togglePipeSetting("velocity")} />}
                                            label="Velocity"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.pipe.decimals?.velocity ?? 2}
                                            onChange={(e) => handlePipeDecimalChange("velocity", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.pipe.deltaP} onChange={() => togglePipeSetting("deltaP")} />}
                                            label="Pressure Drop (ΔP)"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.pipe.decimals?.deltaP ?? 2}
                                            onChange={(e) => handlePipeDecimalChange("deltaP", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FormControlLabel
                                            control={<Checkbox checked={settings.pipe.dPPer100m} onChange={() => togglePipeSetting("dPPer100m")} />}
                                            label="dP/100m"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={settings.pipe.decimals?.dPPer100m ?? 2}
                                            onChange={(e) => handlePipeDecimalChange("dPPer100m", e.target.value)}
                                            sx={{ width: 60 }}
                                            slotProps={{ htmlInput: { min: 0, max: 10, style: { padding: '4px 8px' } } }}
                                        />
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
