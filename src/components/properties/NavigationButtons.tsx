import { IconButton, IconButtonProps, Theme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

const glassButtonSx = {
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
    color: (theme: Theme) => theme.palette.text.primary,
    width: 48,
    height: 48,
    borderRadius: "50%",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    '&:hover': {
        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)",
        transform: "scale(1.1)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    },
    '&:active': {
        transform: "scale(0.95)",
    },
    '&.Mui-disabled': {
        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? "rgba(30, 41, 59, 0.3)" : "rgba(255, 255, 255, 0.3)",
        color: (theme: Theme) => theme.palette.text.disabled,
        boxShadow: "none",
        pointerEvents: "none",
    }
};

export const BackButtonPanel = (props: IconButtonProps) => {
    return (
        <IconButton sx={{ ...glassButtonSx, ...props.sx }} {...props}>
            <ChevronLeft />
        </IconButton>
    );
};

export const ForwardButtonPanel = (props: IconButtonProps) => {
    return (
        <IconButton sx={{ ...glassButtonSx, ...props.sx }} {...props}>
            <ChevronRight />
        </IconButton>
    );
};
