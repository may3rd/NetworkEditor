import { Box, Typography, IconButton, useTheme, Stack } from "@mui/material";
import { ArrowBackIosNew, Close } from "@mui/icons-material";
import { ReactNode } from "react";

type Props = {
    title: string;
    onBack?: () => void;
    onClose?: () => void;
    backLabel?: string;
    rightAction?: ReactNode;
};

export function IOSNavBar({ title, onBack, onClose, backLabel = "Back", rightAction }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backgroundColor: isDark ? "#000000" : "#f2f2f7",
            backdropFilter: "none",
            borderBottom: "none",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pl: 2,
            pr: 1,
            pt: 2,
        }}>
            <Box sx={{ width: "80px", display: "flex", alignItems: "center" }}>
                {(onBack || onClose) && (
                    <IconButton
                        onClick={onBack || onClose}
                        size="small"
                        sx={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#ffffff",
                            color: isDark ? "#ffffff" : "#000000",
                            "&:hover": {
                                backgroundColor: isDark ? "rgba(255, 255, 255, 0.2)" : "#ffffff",
                            },
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            p: 0,
                        }}
                    >
                        {onBack ? (
                            <ArrowBackIosNew sx={{ fontSize: "18px", ml: "-2px" }} />
                        ) : (
                            <Close sx={{ fontSize: "20px" }} />
                        )}
                    </IconButton>
                )}
            </Box>

            <Typography sx={{
                fontSize: "14px",
                fontWeight: 600,
                color: isDark ? "#ffffff" : "#000000",
                textAlign: "center",
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
            }}>
                {title}
            </Typography>

            <Box sx={{ width: "80px", display: "flex", justifyContent: "flex-end", mr: 3 }}>
                {rightAction}
            </Box>
        </Box>
    );
}
