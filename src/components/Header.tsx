"use client";

import { Assignment } from "@mui/icons-material";
import { Button, Box, Typography, Stack, ButtonGroup, Paper, Tooltip } from "@mui/material";
import { useState } from "react";
import { NetworkState, ProjectDetails } from "@/lib/types";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";

type Props = {
  network: NetworkState;
  onNetworkChange: (updatedNetwork: NetworkState) => void;
  onReset: () => void;
  onImportExcel: () => void;
};

export function Header({
  network,
  onNetworkChange,
  onReset,
  onImportExcel,
}: Props) {
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);

  const handleSaveProjectDetails = (details: ProjectDetails) => {
    onNetworkChange({
      ...network,
      projectDetails: details
    });
  };

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
          <Typography variant="h5" component="h1" fontWeight="bold"><i>E-PT Suite</i> - Pipeline Network Builder</Typography>
          <Typography color="text.secondary">
            Sketch networks, edit properties, print summary table and export network as PNG.
          </Typography>
        </Stack>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ButtonGroup variant="outlined" sx={{ mr: 2 }}>
            <Tooltip title="Load example network">
              <Button onClick={onReset} color="warning">
                Load Example
              </Button>
            </Tooltip>
            <Tooltip title="Edit Project Details">
              <Button onClick={() => setProjectDetailsOpen(true)} startIcon={<Assignment />}>
                Project Details
              </Button>
            </Tooltip>
            <Tooltip title="Import network from Excel">
              <Button onClick={onImportExcel} color="success">
                Import Excel
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Box>

      <ProjectDetailsDialog
        open={projectDetailsOpen}
        onClose={() => setProjectDetailsOpen(false)}
        initialDetails={network.projectDetails}
        onSave={handleSaveProjectDetails}
      />
    </Paper >
  );
}
