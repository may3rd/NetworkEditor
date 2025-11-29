import { Box, useTheme } from "@mui/material";
import { ReactNode } from "react";

type Props = {
    children: ReactNode;
};

export function IOSContainer({ children }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{
            backgroundColor: isDark ? "#000000" : "#f2f2f7",
            minHeight: "100%",
            width: "100%",
            position: "relative",
            overflowX: "hidden",
            borderRadius: "24px",
        }}>
            {children}
        </Box>
    );
}
