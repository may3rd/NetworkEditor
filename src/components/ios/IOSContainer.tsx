import { glassPanelSx } from "@/lib/glassStyles";
import { Box, useTheme } from "@mui/material";
import { ReactNode, forwardRef } from "react";

type Props = {
    children: ReactNode;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
};

export const IOSContainer = forwardRef<HTMLDivElement, Props>(({ children, onScroll }, ref) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            ref={ref}
            onScroll={onScroll}
            sx={{
                ...glassPanelSx,
                height: "100%",
                width: "100%",
                position: "relative",
                overflowX: "hidden",
                overflowY: "auto",
                borderRadius: "24px",
            }}
        >
            {children}
        </Box>
    );
});

IOSContainer.displayName = "IOSContainer";
