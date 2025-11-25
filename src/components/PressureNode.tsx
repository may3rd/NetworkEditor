// components/PressureNode.tsx

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

type NodeData = {
    label: string;
    isSelected: boolean;
    showPressures: boolean;
    pressure?: number;
    pressureUnit?: string;
};

function PressureNode({ data }: { data: NodeData }) {
    const { isSelected, showPressures, pressure, pressureUnit } = data;

    return (
        <>
            <Handle type="target" position={Position.Left} style={{ opacity: 1 }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 1 }} />

            {/* Main circle – only background color changes when selected */}
            <div
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: isSelected ? '#f59e0b' : '#3b82f6',   // amber when selected
                    border: '1px solid #1e40af',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',        // constant subtle shadow
                    transition: 'background 0.2s ease',              // smooth color transition only
                }}
            />

            {/* Label – optional: slightly darker text when selected for contrast */}
            <div
                style={{
                    marginTop: 8,
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 9,
                    color: isSelected ? '#92400e' : 'inherit',       // darker amber text if you want
                    pointerEvents: 'none',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                }}
            >
                {showPressures && pressure !== undefined ? `${data.label} (${pressure.toFixed(1)} ${pressureUnit})` : data.label}
            </div>
        </>
    );
}

export default memo(PressureNode);
