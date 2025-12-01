"use client";

import { useState } from "react";
import {
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Button,
} from "@mui/material";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { NetworkState, PipeProps } from "@/lib/types";
import { PipeVisibilityDialog } from "./PipeVisibilityDialog";
import { GenericTable } from "./GenericTable";
import { getPipeSummaryRows } from "./summary/tableConfig";

type Props = {
    network: NetworkState;
    isSnapshot?: boolean;
    onNetworkChange?: (updatedNetwork: NetworkState) => void;
};

export function SummaryTable({ network, isSnapshot = false, onNetworkChange }: Props) {
    const [unitSystem, setUnitSystem] = useState<"metric" | "imperial" | "fieldSI" | "metric_kgcm2">("metric");
    const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);

    // Use visiblePipeIds from network state, fallback to all pipes if undefined or empty (initially)
    const visiblePipeIds = network.visiblePipeIds && network.visiblePipeIds.length > 0
        ? network.visiblePipeIds
        : network.pipes.map(p => p.id);

    // Filter and sort pipes based on visiblePipeIds
    const orderedPipes = visiblePipeIds
        .map(id => network.pipes.find(p => p.id === id))
        .filter((p): p is PipeProps => !!p);

    // If no pipes are selected (e.g. initial load before state update), fallback to all pipes
    const pipesToDisplay = orderedPipes.length > 0 ? orderedPipes : network.pipes;

    const rows = getPipeSummaryRows(network, unitSystem);

    const headerActions = (
        <>
            <ToggleButtonGroup
                color="primary"
                value={unitSystem}
                exclusive
                onChange={(event, value) => {
                    if (value) setUnitSystem(value);
                }}
                size="small"
                aria-label="Unit System"
            >
                <Tooltip title="Metric with kPa">
                    <ToggleButton value="metric">kPa</ToggleButton>
                </Tooltip>
                <Tooltip title="Metric with bar">
                    <ToggleButton value="fieldSI">bar</ToggleButton>
                </Tooltip>
                <Tooltip title="Metric with kg/cm²">
                    <ToggleButton value="metric_kgcm2">kg/cm²</ToggleButton>
                </Tooltip>
                <Tooltip title="Imperial with psi">
                    <ToggleButton value="imperial">psi</ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>
            {!isSnapshot && (
                <Button
                    variant="outlined"
                    onClick={() => {
                        localStorage.setItem("networkSnapshot", JSON.stringify(network));
                        window.open("/summary", "_blank");
                    }}
                    startIcon={<OpenInNewIcon />}
                    size="small"
                >
                    Open Snapshot
                </Button>
            )}
        </>
    );

    return (
        <>
            <GenericTable
                data={pipesToDisplay}
                rowConfigs={rows}
                keyExtractor={(pipe) => pipe.id}
                labelExtractor={(pipe, index) => pipe.name || `Pipe ${index + 1}`}
                title="SINGLE PHASE FLOW PRESSURE DROP"
                headerActions={headerActions}
                isSnapshot={isSnapshot}
                onColumnSettingsClick={() => setVisibilityDialogOpen(true)}
            />

            <PipeVisibilityDialog
                open={visibilityDialogOpen}
                onClose={() => setVisibilityDialogOpen(false)}
                allPipes={network.pipes}
                visiblePipeIds={visiblePipeIds}
                onSave={(newVisiblePipeIds) => {
                    if (onNetworkChange) {
                        onNetworkChange({
                            ...network,
                            visiblePipeIds: newVisiblePipeIds
                        });
                    }
                }}
            />
        </>
    );
}
