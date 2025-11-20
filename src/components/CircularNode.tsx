// components/CircularNode.tsx

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

type NodeData = {
  label: string;
  isSelected: boolean;
};

function CircularNode({ data }: { data: NodeData }) {
  const { isSelected } = data;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 1 }} />

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
        {data.label}
      </div>
    </>
  );
}

export default memo(CircularNode);