import { memo, useRef, useId } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';
import { useTheme } from '@mui/material';

type ColumnPatternProps = {
    columnWidth?: number;
    color: string;
};

function ColumnPattern({ color, columnWidth = 350 }: ColumnPatternProps) {
    return <rect width={columnWidth} height={'100%'} fill={color} />;
}

export type CustomBackgroundProps = {
    width?: number;
    color?: string;
    gap?: number;
    className?: string;
};

const selector = (s: ReactFlowState) => s.transform;

function CustomBackground({ width = 200, color, gap = 20, className = '' }: CustomBackgroundProps) {
    const ref = useRef<SVGSVGElement>(null);
    const theme = useTheme();
    const patternId = useId();

    const transform = useStore(selector);
    const scaledGap: number = gap * transform[2];
    const columnWidth: number = width * transform[2];

    // Default color to theme background if not provided
    const fillColor = color || "background.paper";

    return (
        <svg
            className={`react-flow__background ${className}`}
            ref={ref}
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                zIndex: -1,
            }}
        >
            <pattern
                id={patternId}
                x={transform[0] % scaledGap}
                y={transform[1] % scaledGap}
                width={scaledGap}
                height={scaledGap}
                patternUnits="userSpaceOnUse"
            >
                <ColumnPattern color={fillColor} columnWidth={columnWidth} />
            </pattern>
            <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
    );
}

export default memo(CustomBackground);
