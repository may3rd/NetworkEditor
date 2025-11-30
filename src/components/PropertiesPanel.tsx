"use client";

import { useState, useEffect, ReactNode } from "react";
import { Paper, Box, Typography } from "@mui/material";
import { NetworkState, NodePatch, PipePatch, ViewSettings } from "@/lib/types";
import { IOSContainer } from "./ios/IOSContainer";
import { IOSNavBar } from "./ios/IOSNavBar";
import { IOSPipeProperties } from "./properties/IOSPipeProperties";
import { IOSNodeProperties } from "./properties/IOSNodeProperties";

type Props = {
  network: NetworkState;
  selectedElement: { type: "node" | "pipe"; id: string } | null;
  onUpdateNode: (id: string, patch: NodePatch) => void;
  onUpdatePipe: (id: string, patch: PipePatch) => void;
  onClose: () => void;
  viewSettings: ViewSettings;
};

export type Navigator = {
  push: (title: string, component: (network: NetworkState, navigator: Navigator) => ReactNode, backLabel?: string, rightAction?: ReactNode) => void;
  pop: () => void;
};

export function PropertiesPanel({
  network,
  selectedElement,
  onUpdateNode,
  onUpdatePipe,
  onClose,
  viewSettings,
}: Props) {
  const [stack, setStack] = useState<{
    id: string;
    title: string;
    backLabel?: string;
    rightAction?: ReactNode;
    render: (network: NetworkState, navigator: Navigator) => ReactNode;
  }[]>([]);

  const push = (title: string, render: (network: NetworkState, navigator: Navigator) => ReactNode, backLabel?: string, rightAction?: ReactNode) => {
    setStack(prev => [...prev, { id: title, title, render, backLabel, rightAction }]);
  };

  const pop = () => {
    setStack(prev => prev.slice(0, -1));
  };

  const navigator: Navigator = { push, pop };

  // Reset stack on selection change
  useEffect(() => {
    if (!selectedElement) {
      setStack([]);
      return;
    }

    const rootRender = (net: NetworkState, nav: Navigator) => {
      if (selectedElement.type === "node") {
        const node = net.nodes.find((n) => n.id === selectedElement.id);
        if (!node) return null;
        return <IOSNodeProperties node={node} network={net} onUpdateNode={onUpdateNode} navigator={nav} />;
      } else {
        const pipe = net.pipes.find((p) => p.id === selectedElement.id);
        if (!pipe) return null;
        const startNode = net.nodes.find((n) => n.id === pipe.startNodeId);
        const endNode = net.nodes.find((n) => n.id === pipe.endNodeId);
        return <IOSPipeProperties pipe={pipe} startNode={startNode} endNode={endNode} onUpdatePipe={onUpdatePipe} navigator={nav} viewSettings={viewSettings} />;
      }
    };

    setStack([{
      id: 'root',
      title: selectedElement.type === 'node' ? 'Node Properties' : 'Pipe Properties',
      render: rootRender
    }]);

  }, [selectedElement?.id, selectedElement?.type]);

  if (!selectedElement || stack.length === 0) {
    return null;
  }

  const activePage = stack[stack.length - 1];
  const activeComponent = activePage.render(network, navigator);

  return (
    <Paper
      elevation={0}
      sx={{
        width: 340,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid",
        borderColor: "divider",
        borderRadius: "24px",
        zIndex: 1100, // Above canvas
      }}
    >
      <IOSContainer>
        <IOSNavBar
          title={activePage.title}
          onBack={stack.length > 1 ? pop : undefined}
          onClose={stack.length === 1 ? onClose : undefined}
          backLabel={activePage.backLabel}
          rightAction={activePage.rightAction}
        />
        {activeComponent}
      </IOSContainer>
    </Paper>
  );
}
