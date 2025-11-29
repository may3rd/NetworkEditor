"use client";

import { useRef, useState } from "react";
import { NodeProperties } from "./properties/NodeProperties";
import { PipeProperties } from "./properties/PipeProperties";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { NetworkState, NodePatch, PipePatch, SelectedElement } from "@/lib/types";

type Props = {
  network: NetworkState;
  selected: SelectedElement;
  onUpdateNode: (id: string, patch: NodePatch) => void;
  onUpdatePipe: (id: string, patch: PipePatch) => void;
  onReset: () => void;
  onClose?: () => void;
};

export function PropertiesPanel({
  network,
  selected,
  onReset,
  onUpdateNode,
  onUpdatePipe,
  onClose,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 10);
    }
  };

  const node =
    selected?.type === "node"
      ? network.nodes.find((n) => n.id === selected.id)
      : undefined;
  const pipe =
    selected?.type === "pipe"
      ? network.pipes.find((p) => p.id === selected.id)
      : undefined;

  return (
    <Paper
      elevation={0}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderLeft: "1px solid",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderRight: "none",
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        p: 0, // Remove padding from Paper to allow sticky header to sit flush
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(20px) saturate(180%)",
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
          : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      }}
    >
      <Box sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        bgcolor: "transparent", // Let the parent glass show through, or apply its own if sticky needs it
        backdropFilter: "blur(20px) saturate(180%)", // Re-apply blur for sticky content behind it
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
        borderBottom: isScrolled ? "1px solid" : "none",
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        px: 2,
        py: 2,
        transition: "all 0.2s",
        ...(isScrolled && {
          py: 1,
          boxShadow: 1,
        })
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            {node || pipe ? (
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: isScrolled ? "1rem" : "1.25rem", transition: "font-size 0.2s" }}>
                  {node ? "Node" : "Pipe"} Properties
                </Typography>
                {isScrolled && pipe && (
                  <Typography variant="body2" color="text.secondary">
                    - {pipe.pipeSectionType === "control valve" ? "Control Valve" : pipe.pipeSectionType === "orifice" ? "Orifice" : "Pipeline"}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Box>
                <Typography variant="h6" fontWeight="bold">No Node or Pipe Selected</Typography>
                {!isScrolled && <Typography>Select a node or pipe to view or edit its values.</Typography>}
              </Box>
            )}
          </Box>
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Box>

      <Box sx={{ px: 2, pb: 2, pt: 1, display: "flex", flexDirection: "column", gap: 1 }}>

        {node && (
          <NodeProperties
            node={node}
            network={network}
            onUpdateNode={onUpdateNode}
          />
        )}

        {pipe && (
          <PipeProperties
            pipe={pipe}
            network={network}
            onUpdatePipe={onUpdatePipe}
          />
        )}
      </Box>
    </Paper>
  );
}
