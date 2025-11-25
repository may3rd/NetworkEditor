"use client";

import { Print, Image, FileOpen, Save } from "@mui/icons-material";
import { Button, Box, Typography, Stack, ButtonGroup, Paper } from "@mui/material";

type Props = {
  onReset: () => void;
  onClearNetwork: () => void;
  onExportPng: () => void;
  onLoadNetwork: () => void;
  onSaveNetwork: () => void;
};

export function Header({ onReset, onClearNetwork, onExportPng, onLoadNetwork, onSaveNetwork }: Props) {
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
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%", flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Stack gap={0.5} flex="1 1 auto">
          <Typography variant="h5" component="h1" fontWeight="bold">Pipeline Network Builder</Typography>
          <Typography color="text.secondary">
            Sketch networks, edit properties, then run the mock hydraulic solver.
          </Typography>
        </Stack>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ButtonGroup variant="contained" sx={{ mr: 2 }}>
            <Button
              onClick={onClearNetwork}
              color="error"
            >
              Clear network
            </Button>
            <Button
              onClick={onReset}
              color="warning"
            >
              Load default
            </Button>
          </ButtonGroup>

          <ButtonGroup variant="contained">
            <Button onClick={() => window.print?.()} startIcon={<Print />}>Print</Button>
            <Button onClick={onExportPng} startIcon={<Image />}>Export PNG</Button>
            <Button onClick={onLoadNetwork} startIcon={<FileOpen />}>Load</Button>
            <Button onClick={onSaveNetwork} startIcon={<Save />}>Save</Button>
          </ButtonGroup>
        </Box>
      </Box>
    </Paper>
  );
}
