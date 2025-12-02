import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    Divider,
    Stack
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { glassDialogSx } from "@/lib/glassStyles";
import { ProjectDetails } from "@/lib/types";
import { useState, useEffect } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    initialDetails?: ProjectDetails;
    onSave: (details: ProjectDetails) => void;
};

const defaultDetails: ProjectDetails = {
    projectNo: "",
    projectName: "",
    clientName: "",
    calculationNo: "",
    title: "",
    revisions: [
        { rev: "", by: "", date: "", checked: "", checkedDate: "", approved: "", approvedDate: "" },
        { rev: "", by: "", date: "", checked: "", checkedDate: "", approved: "", approvedDate: "" },
        { rev: "", by: "", date: "", checked: "", checkedDate: "", approved: "", approvedDate: "" },
    ],
    pageNumber: "",
    totalPages: "",
};

export function ProjectDetailsDialog({ open, onClose, initialDetails, onSave }: Props) {
    const [details, setDetails] = useState<ProjectDetails>(defaultDetails);

    useEffect(() => {
        if (open) {
            setDetails(initialDetails || defaultDetails);
        }
    }, [open, initialDetails]);

    const handleChange = (field: keyof ProjectDetails, value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleRevisionChange = (index: number, field: keyof ProjectDetails["revisions"][0], value: string) => {
        const newRevisions = [...details.revisions];
        newRevisions[index] = { ...newRevisions[index], [field]: value };
        setDetails(prev => ({ ...prev, revisions: newRevisions }));
    };

    const handleSave = () => {
        onSave(details);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: glassDialogSx
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Project Details
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Project No"
                            fullWidth
                            size="small"
                            value={details.projectNo}
                            onChange={(e) => handleChange("projectNo", e.target.value)}
                        />
                        <TextField
                            label="Calculation No"
                            fullWidth
                            size="small"
                            value={details.calculationNo}
                            onChange={(e) => handleChange("calculationNo", e.target.value)}
                        />
                    </Stack>
                    <TextField
                        label="Project Name"
                        fullWidth
                        size="small"
                        value={details.projectName}
                        onChange={(e) => handleChange("projectName", e.target.value)}
                    />
                    <TextField
                        label="Client Name"
                        fullWidth
                        size="small"
                        value={details.clientName}
                        onChange={(e) => handleChange("clientName", e.target.value)}
                    />
                    <TextField
                        label="Title"
                        fullWidth
                        size="small"
                        value={details.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Page Number"
                            fullWidth
                            size="small"
                            value={details.pageNumber}
                            onChange={(e) => handleChange("pageNumber", e.target.value)}
                            placeholder="e.g. 1"
                        />
                        <TextField
                            label="Total Pages"
                            fullWidth
                            size="small"
                            value={details.totalPages}
                            onChange={(e) => handleChange("totalPages", e.target.value)}
                            placeholder="e.g. 10"
                        />
                    </Stack>

                    <Box>
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Revisions</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {details.revisions.map((rev, index) => (
                            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1 }}>
                                <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>Revision Block {index + 1} (Bottom to Top)</Typography>
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={2}>
                                        <TextField
                                            label="Rev"
                                            size="small"
                                            sx={{ width: '20%' }}
                                            value={rev.rev}
                                            onChange={(e) => handleRevisionChange(index, "rev", e.target.value)}
                                        />
                                        <TextField
                                            label="By"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.by}
                                            onChange={(e) => handleRevisionChange(index, "by", e.target.value)}
                                        />
                                        <TextField
                                            label="Date"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.date}
                                            onChange={(e) => handleRevisionChange(index, "date", e.target.value)}
                                        />
                                    </Stack>
                                    <Stack direction="row" spacing={2}>
                                        <Box sx={{ width: '20%' }} />
                                        <TextField
                                            label="Checked"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.checked}
                                            onChange={(e) => handleRevisionChange(index, "checked", e.target.value)}
                                        />
                                        <TextField
                                            label="Date"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.checkedDate}
                                            onChange={(e) => handleRevisionChange(index, "checkedDate", e.target.value)}
                                        />
                                    </Stack>
                                    <Stack direction="row" spacing={2}>
                                        <Box sx={{ width: '20%' }} />
                                        <TextField
                                            label="Approved"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.approved}
                                            onChange={(e) => handleRevisionChange(index, "approved", e.target.value)}
                                        />
                                        <TextField
                                            label="Date"
                                            size="small"
                                            sx={{ width: '40%' }}
                                            value={rev.approvedDate}
                                            onChange={(e) => handleRevisionChange(index, "approvedDate", e.target.value)}
                                        />
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">Save</Button>
            </DialogActions>
        </Dialog>
    );
}
