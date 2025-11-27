import { MarkerType, type Edge } from "@xyflow/react";
import { type Theme } from "@mui/material";
import { type PipeProps } from "@/lib/types";

interface GetPipeEdgeParams {
    pipe: PipeProps;
    index: number;
    selectedId: string | null;
    selectedType: "node" | "pipe" | null;
    showPressures: boolean;
    theme: Theme;
    forceLightMode?: boolean;
}

export const getPipeEdge = ({
    pipe,
    index,
    selectedId,
    selectedType,
    showPressures,
    theme,
    forceLightMode = false,
}: GetPipeEdgeParams): Edge => {
    const isSelectedPipe = selectedType === "pipe" && selectedId === pipe.id;
    const labelLines: string[] = [];

    // Line 1: Name + Type
    let line1 = pipe.name || `P${index + 1}`;
    if (!pipe.name) {
        line1 = `P${index + 1}`;
    }
    if (pipe.pipeSectionType === "control valve") {
        line1 += ": CV";
    } else if (pipe.pipeSectionType === "orifice") {
        line1 += ": RO";
    }
    labelLines.push(line1);

    // Line 2: Length / Dimensions
    if (pipe.pipeSectionType !== "control valve" && pipe.pipeSectionType !== "orifice") {
        const roundedLength =
            typeof pipe.length === "number"
                ? pipe.length.toFixed(2)
                : Number(pipe.length ?? 0).toFixed(2);
        labelLines.push(`${roundedLength} ${pipe.lengthUnit ?? ""}`.trim());
    }

    // Line 3: Pressure Drop
    if (
        showPressures &&
        pipe.pressureDropCalculationResults?.totalSegmentPressureDrop !== undefined
    ) {
        const deltaP =
            pipe.pressureDropCalculationResults.totalSegmentPressureDrop / 1000; // Pa to kPa
        labelLines.push(`ΔP: ${deltaP.toFixed(2)} kPa`);
    }

    const labelTextColor = forceLightMode
        ? "rgba(0, 0, 0, 0.6)"
        : theme.palette.text.secondary;
    const labelBgColor = forceLightMode
        ? "#ffffff"
        : theme.palette.background.paper;
    const labelBorderColor = isSelectedPipe ? "#f59e0b" : "#cbd5f5";

    return {
        id: pipe.id,
        source: pipe.startNodeId,
        target: pipe.endNodeId,
        type: "pipe", // Use custom edge type
        data: {
            labelLines,
            labelBgColor: isSelectedPipe ? "#fffbeb" : labelBgColor,
            labelTextColor: isSelectedPipe ? "#92400e" : labelTextColor,
            labelBorderColor,
            isSelected: isSelectedPipe,
        },
        style: {
            strokeWidth: isSelectedPipe ? 2 : 1,
            stroke: isSelectedPipe ? "#f59e0b" : "#94a3b8",
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelectedPipe ? "#f59e0b" : "#94a3b8",
        },
    };
};
