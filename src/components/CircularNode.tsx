// components/CircularNode.tsx

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

type NodeData = {
  label: string;
  isSelected: boolean;  // ← new
};

function CircularNode({ data }: { data: NodeData }) {
  const { isSelected } = data;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0.5 }} />

      {/* Outer glow ring when selected */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: -8, // extends 8px beyond the 20×20 circle
            borderRadius: '50%',
            border: '3px solid #f59e0b',
            boxShadow: '0 0 16px 4px rgba(251, 191, 36, 0.6)',
            pointerEvents: 'none',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Main circle */}
      <div
        style={{
          position: 'relative',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: isSelected ? '#f59e0b' : '#3b82f6', // amber when selected, blue otherwise
          border: '2px solid #1e40af',
          boxShadow: isSelected
            ? '0 6px 20px rgba(251, 191, 36, 0.5)'
            : '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
        }}
      />

      {/* Label */}
      <div
        style={{
          marginTop: 8,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 9,
          color: isSelected ? '#d97706' : 'inherit',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {data.label}
      </div>

      {/* Optional subtle pulse animation for the glow ring */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 16px 4px rgba(251, 191, 36, 0.6);
          }
          50% {
            box-shadow: 0 0 24px 8px rgba(251, 191, 36, 0.8);
          }
          100% {
            box-shadow: 0 0 16px 4px rgba(251, 191, 36, 0.6);
          }
        }
      `}</style>
    </>
  );
}

export default memo(CircularNode);