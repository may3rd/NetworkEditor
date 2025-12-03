"use client";

import { useState, useEffect, useLayoutEffect, ReactNode, useRef, RefObject } from "react";
import { Paper, Box } from "@mui/material";
import { NetworkState } from "@/lib/types";
import { glassPanelSx } from "@/lib/glassStyles";
import { IOSNavBar } from "./ios/IOSNavBar";
import { IOSPipeProperties } from "./properties/IOSPipeProperties";
import { IOSNodeProperties } from "./properties/IOSNodeProperties";

import { useNetworkStore } from "@/store/useNetworkStore";

export type Navigator = {
  push: (title: string, component: (network: NetworkState, navigator: Navigator, containerRef: RefObject<HTMLDivElement | null>, setTitleOpacity: (o: number) => void, footerNode: HTMLDivElement | null) => ReactNode, backLabel?: string, rightAction?: ReactNode) => void;
  pop: () => void;
};

export function PropertiesPanel() {
  const {
    network,
    selection: selectedElement,
    updateNode: onUpdateNode,
    updatePipe: onUpdatePipe,
    selectElement,
    viewSettings,
    setNetwork: onNetworkChange,
  } = useNetworkStore();

  const onClose = () => selectElement(null, null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [footerNode, setFooterNode] = useState<HTMLDivElement | null>(null);
  const [titleOpacity, setTitleOpacity] = useState(1);

  const [stack, setStack] = useState<{
    id: string;
    title: string;
    backLabel?: string;
    rightAction?: ReactNode;
    render: (network: NetworkState, navigator: Navigator, containerRef: RefObject<HTMLDivElement | null>, setTitleOpacity: (o: number) => void, footerNode: HTMLDivElement | null) => ReactNode;
    scrollPos?: number;
  }[]>([]);

  const prevStackLengthRef = useRef(0);

  // Handle scroll restoration
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (stack.length > prevStackLengthRef.current) {
      // Pushed: Reset scroll to top
      container.scrollTop = 0;
    } else if (stack.length < prevStackLengthRef.current) {
      // Popped: Restore scroll position
      const activePage = stack[stack.length - 1];
      if (activePage && activePage.scrollPos !== undefined) {
        container.scrollTop = activePage.scrollPos;
      }
    }

    prevStackLengthRef.current = stack.length;
  }, [stack]);

  const push = (title: string, render: (network: NetworkState, navigator: Navigator, containerRef: RefObject<HTMLDivElement | null>, setTitleOpacity: (o: number) => void, footerNode: HTMLDivElement | null) => ReactNode, backLabel?: string, rightAction?: ReactNode) => {
    setStack(prev => {
      const newStack = [...prev];
      // Save scroll position of current top page
      if (newStack.length > 0 && containerRef.current) {
        newStack[newStack.length - 1] = {
          ...newStack[newStack.length - 1],
          scrollPos: containerRef.current.scrollTop
        };
      }
      return [...newStack, { id: title, title, render, backLabel, rightAction }];
    });
    setTitleOpacity(1); // Reset opacity on push
  };

  const pop = () => {
    setStack(prev => prev.slice(0, -1));
    setTitleOpacity(1); // Reset opacity on pop
  };

  const navigator: Navigator = { push, pop };

  // Reset stack on selection change
  useEffect(() => {
    if (!selectedElement) {
      setStack([]);
      return;
    }

    const rootRender = (net: NetworkState, nav: Navigator, ref: RefObject<HTMLDivElement | null>, setOpacity: (o: number) => void, footer: HTMLDivElement | null) => {
      if (selectedElement.type === "node") {
        const node = net.nodes.find((n) => n.id === selectedElement.id);
        if (!node) return null;
        return <IOSNodeProperties node={node} network={net} onUpdateNode={onUpdateNode} navigator={nav} onNetworkChange={onNetworkChange} footerNode={footer} />;
      } else {
        const pipe = net.pipes.find((p) => p.id === selectedElement.id);
        if (!pipe) return null;
        const startNode = net.nodes.find((n) => n.id === pipe.startNodeId);
        const endNode = net.nodes.find((n) => n.id === pipe.endNodeId);
        return <IOSPipeProperties
          pipe={pipe}
          startNode={startNode}
          endNode={endNode}
          onUpdatePipe={onUpdatePipe}
          onUpdateNode={onUpdateNode}
          navigator={nav}
          viewSettings={viewSettings}
          containerRef={ref}
          setTitleOpacity={setOpacity}
          footerNode={footer}
        />;
      }
    };

    setStack([{
      id: 'root',
      title: selectedElement.type === 'node' ? 'Node Properties' : (
        // For root pipe properties, we use the pipe type as title but hide it initially
        // It will fade in on scroll. We need to find the pipe to get the type.
        (() => {
          const pipe = network.pipes.find(p => p.id === selectedElement.id);
          const type = pipe?.pipeSectionType || "Pipeline";
          return type.charAt(0).toUpperCase() + type.slice(1);
        })()
      ),
      render: rootRender
    }]);

    // Initial opacity for root page
    if (selectedElement.type === 'pipe') {
      setTitleOpacity(0);
    } else {
      setTitleOpacity(1);
    }

  }, [selectedElement?.id, selectedElement?.type]);

  if (!selectedElement || stack.length === 0) {
    return null;
  }

  const activePage = stack[stack.length - 1];
  // eslint-disable-next-line
  const activeComponent = activePage.render(network, navigator, containerRef, setTitleOpacity, footerNode);

  return (
    <Paper
      elevation={0}
      sx={{
        ...glassPanelSx,
        backgroundColor: "transparent",
        border: "none",
        width: 340,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        zIndex: 1100, // Above canvas
        position: "relative", // Ensure absolute children are relative to this
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          ...glassPanelSx,
          height: "100%",
          width: "100%",
          position: "relative",
          overflowX: "hidden",
          overflowY: "auto",
          borderRadius: "24px",
          border: "none",
        }}
      >
        <IOSNavBar
          title={activePage.title}
          onBack={stack.length > 1 ? pop : undefined}
          onClose={stack.length === 1 ? onClose : undefined}
          backLabel={activePage.backLabel}
          rightAction={activePage.rightAction}
          titleOpacity={titleOpacity}
        />
        {activeComponent}
      </Box>


      <Box
        ref={setFooterNode}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 0,
          overflow: "visible",
          zIndex: 1200,
          pointerEvents: "none", // Allow clicks to pass through empty areas
        }}
      />
    </Paper>
  );
}
