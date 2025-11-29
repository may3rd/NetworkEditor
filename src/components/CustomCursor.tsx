import React, { useEffect, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Box, useTheme } from '@mui/material';

type CustomCursorProps = {
    isAddingNode: boolean;
    nodeSize: number;
};

export function CustomCursor({ isAddingNode, nodeSize }: CustomCursorProps) {
    const theme = useTheme();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const zoom = useStore((state: any) => state.transform[2]);

    useEffect(() => {
        if (!isAddingNode) return;

        const handleMouseMove = (event: MouseEvent) => {
            setPosition({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isAddingNode]);

    if (!isAddingNode) return null;

    const scaledSize = nodeSize * zoom;
    const radius = scaledSize / 2;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9999,
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
