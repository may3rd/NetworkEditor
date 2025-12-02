import { memo } from "react";
import { NodeProps } from "@xyflow/react";

type BackgroundNodeData = {
    url: string;
    width: number;
    height: number;
    opacity?: number;
};

function BackgroundNode({ data }: NodeProps<any>) {
    const { url, width, height, opacity = 1 } = data as BackgroundNodeData;

    return (
        <div
            style={{
                width,
                height,
                opacity,
                backgroundImage: `url(${url})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                pointerEvents: "none", // Ensure it doesn't interfere with interactions
            }}
        />
    );
}

export default memo(BackgroundNode);
