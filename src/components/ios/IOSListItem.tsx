import { Box, Typography, useTheme, Stack } from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { ReactNode } from "react";

type Props = {
    label: string;
    value?: ReactNode;
    onClick?: () => void;
    control?: ReactNode;
    chevron?: boolean;
    last?: boolean;
    icon?: ReactNode;
};

export function IOSListItem({ label, value, onClick, control, chevron, last, icon }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            onClick={onClick}
            sx={{
                pl: 2,
                pr: 1,
                cursor: onClick ? "pointer" : "default",
                "&:active": onClick ? {
                    backgroundColor: isDark ? "#3a3a3c" : "#e5e5ea",
                } : undefined,
                transition: "background-color 0.2s",
                alignItems: "center",
            }}
        >
            {icon && (
                <Box sx={{ mr: 2, display: "flex", alignItems: "center", color: theme.palette.primary.main }}>
                    {icon}
                </Box>
            )}
            <Box sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
                position: "relative",
                "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: 0,
                    left: "0px", // Adjust this to make it shorter from the left
                    right: "8px", // Adjust this to make it shorter from the right
                    height: "1px",
                    backgroundColor: isDark ? "#38383a" : "#c6c6c8",
                    display: last ? "none" : "block",
                },
            }}>
                <Typography sx={{ fontSize: "14px", color: isDark ? "#ffffff" : "#000000" }}>
                    {label}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                    {value && (
                        <Typography sx={{ fontSize: "14px", color: isDark ? "#8e8e93" : "#8e8e93" }}>
                            {value}
                        </Typography>
                    )}
                    {control}
                    {chevron && (
                        <ChevronRight sx={{ color: "#c7c7cc", fontSize: "20px" }} />
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
