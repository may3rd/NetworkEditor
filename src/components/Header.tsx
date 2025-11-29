"use client";

import { Image, FileOpen, Save } from "@mui/icons-material";
import { Button, Box, Typography, Stack, ButtonGroup, Paper, Tooltip } from "@mui/material";

type Props = {
  onReset: () => void;
  onExportPng: () => void;
  onLoadNetwork: () => void;
  onSaveNetwork: () => void;
};

export function Header({
  onReset,
  onExportPng,
  onLoadNetwork,
  onSaveNetwork,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 3,
        gap: 2,
        justifyContent: "center",
        backdropFilter: "blur(12px)",
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%", flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Stack gap={0.5} flex="1 1 auto">
          <Typography variant="h5" component="h1" fontWeight="bold">Pipeline Network Builder</Typography>
          <Typography color="text.secondary">
            Sketch networks, edit properties, then print summary table and export network as PNG.
          </Typography>
        </Stack>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ButtonGroup variant="outlined" sx={{ mr: 2 }}>
            <Tooltip title="Load example network">
              <Button onClick={onReset} color="warning">
                Example
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* <ButtonGroup variant="outlined">
            <Tooltip title="Export network as PNG">
                <Button onClick={onExportPng} startIcon={<Image />}>
                    Export
                </Button>
            </Tooltip>
            <Tooltip title="Load network from file">
                <Button onClick={onLoadNetwork} startIcon={<FileOpen />}>
                    Load
                </Button>
            </Tooltip>
            <Tooltip title="Save network to file">
                <Button onClick={onSaveNetwork} startIcon={<Save />}>
                    Save
                </Button>
          </ButtonGroup> */}
        </Box>
      </Box>
    </Paper >
  );
}
