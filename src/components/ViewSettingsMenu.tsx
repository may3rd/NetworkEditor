import { useState, type MouseEvent } from "react";
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Checkbox,
    IconButton,
    Tooltip,
    Divider,
} from "@mui/material";
import {
    Speed as SpeedIcon,
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { type ViewSettings } from "@/lib/types";

type Props = {
    settings: ViewSettings;
    onSettingsChange: (newSettings: ViewSettings) => void;
};

export default function ViewSettingsMenu({ settings, onSettingsChange }: Props) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [nodeMenuAnchor, setNodeMenuAnchor] = useState<null | HTMLElement>(null);
    const [pipeMenuAnchor, setPipeMenuAnchor] = useState<null | HTMLElement>(null);

    const open = Boolean(anchorEl);
    const nodeMenuOpen = Boolean(nodeMenuAnchor);
    const pipeMenuOpen = Boolean(pipeMenuAnchor);

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setNodeMenuAnchor(null);
        setPipeMenuAnchor(null);
    };

    const handleNodeMenuOpen = (event: MouseEvent<HTMLElement>) => {
        setNodeMenuAnchor(event.currentTarget);
        setPipeMenuAnchor(null);
    };

    const handlePipeMenuOpen = (event: MouseEvent<HTMLElement>) => {
        setPipeMenuAnchor(event.currentTarget);
        setNodeMenuAnchor(null);
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
        <>
            <Tooltip title="View Settings">
                <IconButton
                    size="small"
                    onClick={handleClick}
                    color={open ? "primary" : "default"}
                    sx={{ padding: 0, margin: 0 }}
                >
                    <SpeedIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Main Menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                sx={{ padding: 0, margin: 0, fontSize: '0.8125rem' }}
            >
                <MenuItem onClick={handleNodeMenuOpen} dense>
                    <ListItemText>Node</ListItemText>
                    <ChevronRightIcon fontSize="small" />
                </MenuItem>
                <MenuItem onClick={handlePipeMenuOpen} dense>
                    <ListItemText>Pipe</ListItemText>
                    <ChevronRightIcon fontSize="small" />
                </MenuItem>
            </Menu>

            {/* Node Submenu */}
            <Menu
                anchorEl={nodeMenuAnchor}
                open={nodeMenuOpen}
                onClose={() => setNodeMenuAnchor(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                sx={{ padding: 0, fontSize: '0.8125rem' }}
            >
                <MenuItem onClick={() => toggleNodeSetting("name")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.node.name} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>Name</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => toggleNodeSetting("pressure")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.node.pressure} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>Pressure</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => toggleNodeSetting("temperature")} dense>
                    <ListItemIcon>
                        <Checkbox
                            checked={settings.node.temperature}
                            size="small"
                            disableRipple
                        />
                    </ListItemIcon>
                    <ListItemText>Temperature</ListItemText>
                </MenuItem>
            </Menu>

            {/* Pipe Submenu */}
            <Menu
                anchorEl={pipeMenuAnchor}
                open={pipeMenuOpen}
                onClose={() => setPipeMenuAnchor(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                sx={{ padding: 0, fontSize: '0.8125rem' }}
            >
                <MenuItem onClick={() => togglePipeSetting("name")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.pipe.name} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>Name</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => togglePipeSetting("length")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.pipe.length} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>Pipe length</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => togglePipeSetting("deltaP")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.pipe.deltaP} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>ΔP</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => togglePipeSetting("velocity")} dense>
                    <ListItemIcon>
                        <Checkbox checked={settings.pipe.velocity} size="small" disableRipple />
                    </ListItemIcon>
                    <ListItemText>Velocity</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => togglePipeSetting("dPPer100m")} dense>
                    <ListItemIcon>
                        <Checkbox
                            checked={settings.pipe.dPPer100m}
                            size="small"
                            disableRipple
                        />
                    </ListItemIcon>
                    <ListItemText>dP/100m</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
