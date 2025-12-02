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
    textColor?: string;
    secondary?: ReactNode;
};

export function IOSListItem({ label, value, onClick, control, chevron, last, icon, textColor, secondary }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            onClick={onClick}
            sx={{
                pl: 2,
                pr: chevron ? 1 : 0.5,
                cursor: onClick ? "pointer" : "default",
                "&:active": onClick ? {
                    backgroundColor: isDark ? "#3a3a3c" : "#e5e5ea",
                } : undefined,
                "&:hover": onClick ? {
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
                } : undefined,
                transition: "background-color 0.2s",
                display: "flex",
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
                    backgroundColor: isDark ? "#38383a" : "#E5E5EA",
                    display: last ? "none" : "block",
                },
            }}>
                <Box>
                    <Typography sx={{ fontSize: "14px", color: textColor ? textColor : (isDark ? "#ffffff" : "#000000") }}>
                        {label}
                    </Typography>
                    {secondary && (
                        <Typography sx={{ fontSize: "12px", color: isDark ? "#8e8e93" : "#8e8e93" }}>
                            {secondary}
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" alignItems="center" spacing={1}>
                    {chevron && (
                        typeof value === 'string' || typeof value === 'number' ? (
                            <Typography sx={{ fontSize: "14px", color: isDark ? "#8e8e93" : "#8e8e93" }}>
                                {value}
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                {value}
                            </Box>
                        )
                    )}
                    {!chevron && value && (
                        typeof value === 'string' || typeof value === 'number' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', height: '20px', pr: 2 }}>
                                <Typography sx={{ fontSize: "14px", color: isDark ? "#8e8e93" : "#8e8e93" }}>
                                    {value}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                {value}
                            </Box>
                        )
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
