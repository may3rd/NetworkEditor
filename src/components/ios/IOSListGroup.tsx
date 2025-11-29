import { Box, Typography, useTheme } from "@mui/material";
import { ReactNode } from "react";

type Props = {
    children: ReactNode;
    header?: string;
    footer?: string;
};

export function IOSListGroup({ children, header, footer }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{ mb: 3, ml: 2, mr: 2 }}>
            {header && (
                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        pl: 2,
                        pb: 1,
                        color: isDark ? "#8e8e93" : "#6e6e73",
                        textTransform: "uppercase",
                        fontSize: "11px",
                    }}
                >
                    {header}
                </Typography>
            )}
            <Box sx={{
                backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                borderRadius: "10px",
                overflow: "hidden",
            }}>
                {children}
            </Box>
            {footer && (
                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        pl: 2,
                        pt: 1,
                        color: isDark ? "#8e8e93" : "#6e6e73",
                        fontSize: "11px",
                    }}
                >
                    {footer}
                </Typography>
            )}
        </Box>
    );
}
