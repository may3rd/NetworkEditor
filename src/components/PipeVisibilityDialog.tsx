import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Paper,
    Typography,
    Stack,
    IconButton,
    Divider,
    Box,
} from "@mui/material";
import {
    KeyboardArrowRight as ArrowRightIcon,
    KeyboardArrowLeft as ArrowLeftIcon,
    KeyboardArrowUp as ArrowUpIcon,
    KeyboardArrowDown as ArrowDownIcon,
    DragIndicator as DragIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import { PipeProps } from "@/lib/types";

type Props = {
    open: boolean;
    onClose: () => void;
    allPipes: PipeProps[];
    visiblePipeIds: string[];
    onSave: (newVisiblePipeIds: string[]) => void;
};

function not(a: PipeProps[], b: PipeProps[]) {
    return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a: PipeProps[], b: PipeProps[]) {
    return a.filter((value) => b.indexOf(value) !== -1);
}

export function PipeVisibilityDialog({ open, onClose, allPipes, visiblePipeIds, onSave }: Props) {
    const [checked, setChecked] = useState<PipeProps[]>([]);
    const [left, setLeft] = useState<PipeProps[]>([]);
    const [right, setRight] = useState<PipeProps[]>([]);

    useEffect(() => {
        if (open) {
            const visible = visiblePipeIds
                .map(id => allPipes.find(p => p.id === id))
                .filter((p): p is PipeProps => !!p);

            const hidden = allPipes.filter(p => !visiblePipeIds.includes(p.id));

            setRight(visible);
            setLeft(hidden);
            setChecked([]);
        }
    }, [open, allPipes, visiblePipeIds]);

    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);

    const handleToggle = (value: PipeProps) => () => {
        const currentIndex = checked.indexOf(value);
        const newChecked = [...checked];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        setChecked(newChecked);
    };

    const handleAllRight = () => {
        setRight(right.concat(left));
        setLeft([]);
    };

    const handleCheckedRight = () => {
        setRight(right.concat(leftChecked));
        setLeft(not(left, leftChecked));
        setChecked(not(checked, leftChecked));
    };

    const handleCheckedLeft = () => {
        setLeft(left.concat(rightChecked));
        setRight(not(right, rightChecked));
        setChecked(not(checked, rightChecked));
    };

    const handleAllLeft = () => {
        setLeft(left.concat(right));
        setRight([]);
    };

    const handleMoveUp = () => {
        if (rightChecked.length !== 1) return;
        const item = rightChecked[0];
        const index = right.indexOf(item);
        if (index > 0) {
            const newRight = [...right];
            [newRight[index - 1], newRight[index]] = [newRight[index], newRight[index - 1]];
            setRight(newRight);
        }
    };

    const handleMoveDown = () => {
        if (rightChecked.length !== 1) return;
        const item = rightChecked[0];
        const index = right.indexOf(item);
        if (index < right.length - 1) {
            const newRight = [...right];
            [newRight[index], newRight[index + 1]] = [newRight[index + 1], newRight[index]];
            setRight(newRight);
        }
    };

    const handleSave = () => {
        onSave(right.map(p => p.id));
        onClose();
    };

    const customList = (title: string, items: PipeProps[]) => (
        <Paper sx={{ width: 250, height: 400, overflow: 'auto', border: '1px solid rgba(0,0,0,0.12)' }} elevation={0}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.12)', bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                    {title} ({items.length})
                </Typography>
            </Box>
            <List dense component="div" role="list">
                {items.map((value) => {
                    const labelId = `transfer-list-item-${value.id}-label`;

                    return (
                        <ListItem
                            key={value.id}
                            disablePadding
                        >
                            <ListItemButton role="listitem" onClick={handleToggle(value)}>
                                <ListItemIcon>
                                    <Checkbox
                                        checked={checked.indexOf(value) !== -1}
                                        tabIndex={-1}
                                        disableRipple
                                        inputProps={{
                                            'aria-labelledby': labelId,
                                        }}
                                        size="small"
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    id={labelId}
                                    primary={value.name || value.id}
                                    secondary={value.description}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                    secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
                <ListItem />
            </List>
        </Paper>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" component="div" fontWeight="bold">
                    Pipe Visibility & Order
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Select pipes to display and arrange their order in the table.
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                    {customList('Hidden Pipes', left)}

                    <Stack spacing={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleAllRight}
                            disabled={left.length === 0}
                            aria-label="move all right"
                        >
                            ≫
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleCheckedRight}
                            disabled={leftChecked.length === 0}
                            aria-label="move selected right"
                        >
                            &gt;
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleCheckedLeft}
                            disabled={rightChecked.length === 0}
                            aria-label="move selected left"
                        >
                            &lt;
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleAllLeft}
                            disabled={right.length === 0}
                            aria-label="move all left"
                        >
                            ≪
                        </Button>
                    </Stack>

                    {customList('Displayed Pipes', right)}

                    <Stack spacing={1}>
                        <IconButton
                            onClick={handleMoveUp}
                            disabled={rightChecked.length !== 1 || right.indexOf(rightChecked[0]) === 0}
                            size="small"
                            color="primary"
                        >
                            <ArrowUpIcon />
                        </IconButton>
                        <IconButton
                            onClick={handleMoveDown}
                            disabled={rightChecked.length !== 1 || right.indexOf(rightChecked[0]) === right.length - 1}
                            size="small"
                            color="primary"
                        >
                            <ArrowDownIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" disableElevation>
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}
