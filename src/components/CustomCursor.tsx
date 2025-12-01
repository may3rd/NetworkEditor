import React, { useEffect, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Box, useTheme } from '@mui/material';

type CustomCursorProps = {
    isAddingNode: boolean;
    nodeSize: number;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

export function CustomCursor({ isAddingNode, nodeSize, containerRef }: CustomCursorProps) {
    const theme = useTheme();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const zoom = useStore((state: any) => state.transform[2]);

    useEffect(() => {
        if (!isAddingNode) return;

        const handleMouseMove = (event: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPosition({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isAddingNode, containerRef]);

    if (!isAddingNode) return null;

    const scaledSize = nodeSize * zoom;
    const radius = scaledSize / 2;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 5,
                transform: `translate(${position.x - radius}px, ${position.y - radius}px)`,
            }}
        >
            <svg width={scaledSize} height={scaledSize} viewBox={`0 0 ${scaledSize} ${scaledSize}`}>
                <circle
                    cx={radius}
                    cy={radius}
                    r={radius - 1} // Subtract 1 for stroke width
                    fill={theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.5)'}
                    stroke={theme.palette.mode === 'dark' ? '#94a3b8' : '#475569'}
                    strokeWidth={2}
                />
            </svg>
        </Box>
    );
}
