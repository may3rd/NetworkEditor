import { Theme } from "@mui/material";

export const glassInputSx = {
    "& .MuiOutlinedInput-root": {
        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
        backdropFilter: "blur(4px)",
        transition: "all 0.2s",
        "& fieldset": {
            borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        },
        "&:hover fieldset": {
            borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)',
        },
        "&.Mui-focused fieldset": {
            borderColor: (theme: Theme) => theme.palette.primary.main,
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
    borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1,
    px: 2,
    pb: 1,
    pt: 0.5,
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    backdropFilter: "blur(4px)",
    transition: "all 0.2s",
    "&:hover": {
        borderColor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)',
    },
};
