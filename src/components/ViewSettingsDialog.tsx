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

    const togglePipeSetting = (key: keyof ViewSettings["pipe"]) => {
        onSettingsChange({
            ...settings,
            pipe: {
                ...settings.pipe,
                [key]: !settings.pipe[key],
            },
        });
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
                                <Stack>
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.node.name} onChange={() => toggleNodeSetting("name")} />}
                                        label="Name"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.node.pressure} onChange={() => toggleNodeSetting("pressure")} />}
                                        label="Pressure"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.node.temperature} onChange={() => toggleNodeSetting("temperature")} />}
                                        label="Temperature"
                                    />
                                </Stack>
                            </Box>
                            <Box flex={1}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Pipe Labels
                                </Typography>
                                <Stack>
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.name} onChange={() => togglePipeSetting("name")} />}
                                        label="Name"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.length} onChange={() => togglePipeSetting("length")} />}
                                        label="Length"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.deltaP} onChange={() => togglePipeSetting("deltaP")} />}
                                        label="Pressure Drop (ΔP)"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.velocity} onChange={() => togglePipeSetting("velocity")} />}
                                        label="Velocity"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={settings.pipe.dPPer100m} onChange={() => togglePipeSetting("dPPer100m")} />}
                                        label="dP/100m"
                                    />
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
