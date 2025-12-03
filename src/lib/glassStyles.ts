import { Theme } from "@mui/material";

export const glassInputSx = {
    "& .MuiOutlinedInput-root": {
        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
        backdropFilter: "blur(4px)",
        transition: "all 0.2s",
        borderRadius: 2, // Match global radius
        "& fieldset": {
            borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        "&:hover fieldset": {
            borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
        },
        "&.Mui-focused fieldset": {
            borderColor: (theme: Theme) => theme.palette.primary.main,
            borderWidth: 1,
        },
    },
};

export const glassSelectSx = {
    ...glassInputSx,
    "& .MuiSelect-select": {
        // Ensure text is readable
    }
};

export const glassRadioSx = {
    border: "1px solid",
    borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2, // Match global radius
    px: 2,
    pb: 1,
    pt: 0.5,
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: "blur(4px)",
    transition: "all 0.2s",
    "&:hover": {
        borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
    },
};

export const glassDialogSx = {
    borderRadius: "16px",
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(10px)",
    boxShadow: (theme: Theme) => theme.palette.mode === 'dark' ? "-10px 0 40px rgba(0,0,0,0.7)" : "-10px 0 40px rgba(0,0,0,0.2)",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
};

export const glassPanelSx = {
    borderRadius: "26px",
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.7)" : "rgba(225, 225, 225, 0.7)",
    backdropFilter: "blur(10px)",
    boxShadow: (theme: Theme) => theme.palette.mode === 'dark' ? "-10px 0 40px rgba(0,0,0,0.7)" : "-10px 0 40px rgba(0,0,0,0.2)",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
};

export const glassToolBarButtonGroupSx = {
    borderRadius: "14px",
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(10px)",
    // boxShadow: (theme: Theme) => theme.palette.mode === 'dark' ? "-10px 0 40px rgba(0,0,0,0.7)" : "-10px 0 40px rgba(0,0,0,0.2)",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
};

export const glassNodeSx = {
    backdropFilter: "blur(4px)",
    // Background color will be handled dynamically in the component
};

export const glassLabelSx = {
    backdropFilter: "blur(4px)",
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
};

export const glassListGroupSx = {
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff',
    backdropFilter: "blur(4px)",
    borderRadius: "16px",
    overflow: "hidden",
};
