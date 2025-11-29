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
                backdropFilter: "blur(20px) saturate(180%)",
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: "text.primary",
                pointerEvents: "none",
                boxShadow: (theme) => theme.palette.mode === 'dark'
                    ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                    : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                transition: "opacity 0.1s ease-out",
            }}
        >
            <Stack spacing={1}>
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        {title}
                    </Typography>
                    {/* {subtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )} */}
                </Box>
                <Divider />
                <Stack spacing={0.5}>
                    {rows.map((row, index) => (
                        <Stack key={index} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                            <Typography variant="caption" color="text.secondary">
                                {row.label}
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" color="text.primary">
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
