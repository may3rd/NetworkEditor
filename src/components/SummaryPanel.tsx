"use client";

import { Grid, GridItem, Heading, Text } from "@chakra-ui/react";
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
    const totalDemand = network.nodes.reduce((sum, node) => sum + (node.demand ?? 0), 0);
    const avgPressure =
      nodeCount > 0
        ? network.nodes.reduce((sum, node) => sum + (node.pressure ?? 0), 0) / nodeCount
        : 0;

    return {
      nodes: nodeCount,
      pipes: pipeCount,
      totalDemand: totalDemand.toFixed(1),
      avgPressure: avgPressure ? avgPressure.toFixed(2) : "0.00",
    };
  }, [network]);

  return (
    <Grid templateColumns={["repeat(1, 1fr)", "repeat(4, 1fr)"]} gap={4}>
      <SummaryCard label="Nodes" value={stats.nodes} />
      <SummaryCard label="Pipes" value={stats.pipes} />
      <SummaryCard label="Total demand" value="-- kg/h" />
      {/* <SummaryCard label="Total demand" value={`${stats.totalDemand} L/s`} /> */}
      <SummaryCard
        label="Avg pressure"
        //value={`${stats.avgPressure} kPa`}
        value="-- kPa"
        helper={lastSolvedAt ? `Last solve: ${lastSolvedAt}` : undefined}
      />
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
    <GridItem
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
    >
      <Heading size="sm" mb={1}>
        {label}
      </Heading>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
      {helper && (
        <Text fontSize="xs" color="gray.500">
          {helper}
        </Text>
      )}
    </GridItem>
  );
}
