"use client";

import { Grid, Typography, Paper } from "@mui/material";
import { useMemo } from "react";
import { NetworkState } from "@/lib/types";

type Props = {
  network: NetworkState;
  lastSolvedAt?: string | null;
};

export function SummaryPanel({ network, lastSolvedAt }: Props) {
  const stats = useMemo(() => {
    const nodeCount = network.nodes.length;
    const pipeCount = network.pipes.length;
    const avgPressure =
      nodeCount > 0
        ? network.nodes.reduce((sum, node) => sum + (node.pressure ?? 0), 0) / nodeCount
        : 0;

    return {
      nodes: nodeCount,
      pipes: pipeCount,
      avgPressure: avgPressure ? avgPressure.toFixed(2) : "0.00",
    };
  }, [network]);

  return (
    <Grid container spacing={2} columns={{ xs: 1, sm: 4 }}>
      <Grid size={{ xs: 1 }}>
        <SummaryCard label="Nodes" value={stats.nodes} />
      </Grid>
      <Grid size={{ xs: 1 }}>
        <SummaryCard label="Pipes" value={stats.pipes} />
      </Grid>
      <Grid size={{ xs: 1 }}>
        <SummaryCard label="Total demand" value="-- kg/h" />
      </Grid>
      {/* <SummaryCard label="Total demand" value={`${stats.totalDemand} L/s`} /> */}
      <Grid size={{ xs: 1 }}>
        <SummaryCard
          label="Avg pressure"
          //value={`${stats.avgPressure} kPa`}
          value="-- kPa"
          helper={lastSolvedAt ? `Last solve: ${lastSolvedAt}` : undefined}
        />
      </Grid>
    </Grid>
  );
}

type CardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

function SummaryCard({ label, value, helper }: CardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 2,
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
      {helper && (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      )}
    </Paper>
  );
}
