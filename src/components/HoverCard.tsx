import { Paper, Typography, Stack, Box, Divider } from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HoverCardProps = {
    title: string;
    subtitle?: string;
    rows: Array<{ label: string; value: string | number | ReactNode }>;
    x: number;
    y: number;
};

export function HoverCard({ title, subtitle, rows, x, y }: HoverCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x, opacity: 0 });

    useEffect(() => {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 16; // Padding from screen edge

            let top = y - rect.height - 10; // Default: above cursor
            let left = x - rect.width / 2; // Default: centered on cursor

            // Check top overflow
            if (top < padding) {
                top = y + 20; // Flip to below cursor
            }

            // Check bottom overflow (if flipped)
            if (top + rect.height > viewportHeight - padding) {
                // If it doesn't fit below either, try to fit it where it has more space
                if (y > viewportHeight / 2) {
                    top = y - rect.height - 10; // Force above if cursor is in lower half
                    // Clamp to top edge if needed (though it might cover cursor)
                    top = Math.max(padding, top);
                } else {
                    top = Math.min(viewportHeight - rect.height - padding, top);
                }
            }

            // Check left overflow
            if (left < padding) {
                left = padding;
            }

            // Check right overflow
            if (left + rect.width > viewportWidth - padding) {
                left = viewportWidth - rect.width - padding;
            }

            setPosition({ top, left, opacity: 1 });
        }
    }, [x, y]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <Paper
            ref={cardRef}
            elevation={4}
            sx={{
                position: "fixed", // Fixed relative to viewport
                top: position.top,
                left: position.left,
                opacity: position.opacity,
                zIndex: 9999, // Always on top
                minWidth: 200,
                p: 2,
                borderRadius: 2,
                backdropFilter: "blur(12px)",
                backgroundColor: "rgba(15, 23, 42, 0.9)", // Slightly more opaque for readability
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                pointerEvents: "none",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
                transition: "opacity 0.1s ease-out",
            }}
        >
            <Stack spacing={1}>
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#38bdf8" }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
                <Stack spacing={0.5}>
                    {rows.map((row, index) => (
                        <Stack key={index} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                            <Typography variant="caption" sx={{ color: "#cbd5e1" }}>
                                {row.label}
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ color: "white" }}>
                                {row.value}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Stack>
        </Paper>,
        document.body
    );
}
