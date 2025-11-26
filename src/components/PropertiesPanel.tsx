"use client";

import { useRef, useState } from "react";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "./QuantityInput";
import {
  PIPE_FITTING_OPTIONS,
  PIPE_SCHEDULES,
  getScheduleEntries,
  nearest_pipe_diameter,
  normalizeSchedule,
  type PipeSchedule,
} from "./PipeDimension";
import {
  Box,
  Button,
  Typography,
  IconButton,
  TextField,
  Radio,
  RadioGroup,
  Select,
  Stack,
  MenuItem,
  FormControlLabel,
  Paper,
  InputLabel,
  FormHelperText,
  FormControl,
  FormLabel,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { FittingType, NetworkState, NodeProps, NodePatch, PipeProps, PipePatch, SelectedElement } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

const FITTING_TYPE_OPTIONS = ["SCRD", "LR", "SR"] as const;

type Props = {
  network: NetworkState;
  selected: SelectedElement;
  onUpdateNode: (id: string, patch: NodePatch) => void;
  onUpdatePipe: (id: string, patch: PipePatch) => void;
  onReset: () => void;
};

export function PropertiesPanel({
  network,
  selected,
  onReset,
  onUpdateNode,
  onUpdatePipe,
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

  const startNode = pipe ? network.nodes.find((n) => n.id === pipe.startNodeId) : undefined;
  const endNode = pipe ? network.nodes.find((n) => n.id === pipe.endNodeId) : undefined;
  const nodeFluidPhase = node?.fluid?.phase ?? "liquid";
  const pipeFluidPhase = pipe?.fluid?.phase ?? startNode?.fluid?.phase ?? "liquid";
  const normalizedPipeFluidPhase =
    typeof pipeFluidPhase === "string" ? pipeFluidPhase.toLowerCase() : undefined;
  const isGasPipe = normalizedPipeFluidPhase === "gas";
  const pipeDiameterInputMode: "nps" | "diameter" = pipe
    ? pipe.diameterInputMode ??
    (pipe.pipeNPD !== undefined || pipe.pipeSchedule ? "nps" : "diameter")
    : "diameter";
  const pipeScheduleValue: PipeSchedule | undefined = pipe
    ? normalizeSchedule(pipe.pipeSchedule ?? "STD") ?? "STD"
    : undefined;
  const scheduleEntries = pipeScheduleValue ? getScheduleEntries(pipeScheduleValue) : [];
  const npsSelectValue =
    pipe &&
      pipe.pipeNPD !== undefined &&
      scheduleEntries.some((entry) => entry.nps === pipe.pipeNPD)
      ? String(pipe.pipeNPD)
      : "";
  const pipeFittings = pipe?.fittings ?? [];
  const defaultFittingOption = PIPE_FITTING_OPTIONS[0]?.value ?? "elbow_45";
  const controlValvePressureDropUnit = pipe?.controlValve?.pressureDropUnit ?? "kPa";
  const controlValveCalculatedPressureDropPa =
    pipe?.pressureDropCalculationResults?.controlValvePressureDrop ??
    (pipe?.controlValve?.pressureDrop !== undefined
      ? convertUnit(
        pipe.controlValve.pressureDrop,
        pipe.controlValve.pressureDropUnit ?? "kPa",
        "Pa"
      )
      : undefined);
  const controlValvePressureDropDisplayValue =
    controlValveCalculatedPressureDropPa === undefined
      ? ""
      : convertUnit(controlValveCalculatedPressureDropPa, "Pa", controlValvePressureDropUnit);
  const controlValveCoefficientLabel = isGasPipe ? "Cg (Gas Flow Coefficient)" : "Cv (Flow Coefficient)";
  const controlValveCoefficientValue = isGasPipe
    ? pipe?.controlValve?.cg ?? ""
    : pipe?.controlValve?.cv ?? "";
  const controlValveCalculatedCoefficientLabel = isGasPipe ? "Calculated Cg" : "Calculated Cv";
  const controlValveCalculatedCoefficientValue = isGasPipe
    ? pipe?.controlValve?.cg ?? ""
    : pipe?.controlValve?.cv ?? "";
  const controlValveInputRadioLabel = isGasPipe
    ? "Input Cg"
    : "Input Cv";
  const controlValveOutputRadioLabel = isGasPipe
    ? "Input Pressure Drop"
    : "Input Pressure Drop";
  const orificePressureDropUnit = pipe?.orifice?.pressureDropUnit ?? "kPa";
  const orificeCalculatedPressureDropPa =
    pipe?.pressureDropCalculationResults?.orificePressureDrop ??
    (pipe?.orifice?.pressureDrop !== undefined
      ? convertUnit(pipe.orifice.pressureDrop, pipe.orifice.pressureDropUnit ?? "kPa", "Pa")
      : undefined);
  const orificePressureDropDisplayValue =
    orificeCalculatedPressureDropPa === undefined
      ? ""
      : convertUnit(orificeCalculatedPressureDropPa, "Pa", orificePressureDropUnit);

  const updatePipeFittings = (nextFittings: FittingType[]) => {
    if (!pipe) return;
    onUpdatePipe(pipe.id, { fittings: nextFittings });
  };

  const handleFittingFieldChange = (index: number, update: Partial<FittingType>) => {
    if (!pipe) return;
    updatePipeFittings(
      pipeFittings.map((fitting, idx) => (idx === index ? { ...fitting, ...update } : fitting))
    );
  };

  const handleAddFitting = () => {
    if (!pipe) return;
    updatePipeFittings([
      ...pipeFittings,
      {
        type: defaultFittingOption,
        count: 1,
        k_each: 0,
        k_total: 0,
      },
    ]);
  };

  const handleRemoveFitting = (index: number) => {
    if (!pipe) return;
    updatePipeFittings(pipeFittings.filter((_, idx) => idx !== index));
  };

  const handleResetFittings = () => {
    if (!pipe || pipeFittings.length === 0) return;
    updatePipeFittings([]);
  };

  const deriveDiameterFromNps = (npsValue?: number, scheduleValue?: PipeSchedule) => {
    if (npsValue === undefined || scheduleValue === undefined) {
      return undefined;
    }
    return nearest_pipe_diameter(npsValue, scheduleValue) ?? undefined;
  };

  const computeDesignMassFlowRate = (
    massFlowRateValue?: number,
    marginPercent?: number
  ): number | undefined => {
    if (typeof massFlowRateValue !== "number" || !Number.isFinite(massFlowRateValue)) {
      return undefined;
    }
    const normalizedMargin =
      typeof marginPercent === "number" && Number.isFinite(marginPercent) ? marginPercent : 0;
    return massFlowRateValue * (1 + normalizedMargin / 100);
  };

  const handleAutoFluid = () => {
    if (!node) return;
    const connectedPipes = network.pipes.filter(
      (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id,
    );

    const targetPipes = connectedPipes.filter((pipe) => pipe.endNodeId === node.id);
    const sourcePipes = connectedPipes.filter((pipe) => pipe.startNodeId === node.id);
    const normalizeDirection = (pipe: PipeProps) =>
      pipe.direction === "backward" ? "backward" : "forward";
    const inboundTargetPipes = targetPipes.filter(
      (pipe) => normalizeDirection(pipe) === "forward",
    );
    const inboundSourcePipes = sourcePipes.filter(
      (pipe) => normalizeDirection(pipe) === "backward",
    );

    const inboundPipes = [...inboundTargetPipes, ...inboundSourcePipes];

    // Prioritize inbound pipes, otherwise fallback to any connected pipe (e.g. for source nodes)
    let pipeToCopyFrom = inboundPipes[0];
    if (!pipeToCopyFrom && connectedPipes.length > 0) {
      pipeToCopyFrom = connectedPipes[0];
    }

    if (pipeToCopyFrom && pipeToCopyFrom.fluid) {
      onUpdateNode(node.id, { fluid: { ...pipeToCopyFrom.fluid } });
    } else {
      alert("No fluid properties found in connected pipes.");
    }
  };

  const handleUpdateFromPipe = (node: NodeProps) => {
    const connectedPipes = network.pipes.filter(
      (pipe) => pipe.startNodeId === node.id || pipe.endNodeId === node.id,
    );

    const targetPipes = connectedPipes.filter((pipe) => pipe.endNodeId === node.id);
    const sourcePipes = connectedPipes.filter((pipe) => pipe.startNodeId === node.id);
    const normalizeDirection = (pipe: PipeProps) =>
      pipe.direction === "backward" ? "backward" : "forward";
    const inboundTargetPipes = targetPipes.filter(
      (pipe) => normalizeDirection(pipe) === "forward",
    );
    const inboundSourcePipes = sourcePipes.filter(
      (pipe) => normalizeDirection(pipe) === "backward",
    );

    type PipeState = NonNullable<NonNullable<PipeProps["resultSummary"]>["inletState"]>;

    const findLowestState = (
      pipes: PipeProps[],
      selector: (pipe: PipeProps) => PipeState | undefined,
    ): PipeState | undefined => {
      let lowest: { pressure: number; state: PipeState } | null = null;
      for (const pipe of pipes) {
        const state = selector(pipe);
        if (!state || typeof state.pressure !== "number") {
          continue;
        }
        if (!lowest || state.pressure < lowest.pressure) {
          lowest = { pressure: state.pressure, state };
        }
      }
      return lowest?.state;
    };

    const updateFromState = (pipeState?: PipeState) => {
      if (!pipeState) {
        return false;
      }
      const updates: Partial<NodeProps> = {};
      if (typeof pipeState.pressure === "number") {
        updates.pressure = convertUnit(
          pipeState.pressure,
          "Pa",
          node.pressureUnit ?? "kPag",
        );
        updates.pressureUnit = node.pressureUnit ?? "kPag";
      }
      if (typeof pipeState.temprature === "number") {
        updates.temperature = convertUnit(
          pipeState.temprature,
          "K",
          node.temperatureUnit ?? "C",
        );
        updates.temperatureUnit = node.temperatureUnit ?? "C";
      }
      if (Object.keys(updates).length === 0) {
        return false;
      }
      onUpdateNode(node.id, updates);
      return true;
    };

    const targetState = findLowestState(inboundTargetPipes, (pipe) => pipe.resultSummary?.outletState);
    if (updateFromState(targetState)) {
      return;
    }
    const sourceState = findLowestState(inboundSourcePipes, (pipe) => pipe.resultSummary?.inletState);
    updateFromState(sourceState);
  };

  const pipeHelperText = () => {
    if (!pipe) {
      return "Unknown";
    }

    if (pipe.pipeSectionType === "pipeline") {
      const length = pipe.length || 0;
      const lengthUnit = pipe.lengthUnit || "m";
      return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (${length.toFixed(2)} ${lengthUnit})`;
    } else if (pipe.pipeSectionType === "control valve") {
      return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (control valve)`;
    } else {
      return `${startNode?.label ?? "Unknown"} → ${endNode?.label ?? "Unknown"} (orifice)`;
    }
  };

  return (
    <Paper
      elevation={0}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 0, // Remove padding from Paper to allow sticky header to sit flush
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        bgcolor: "background.paper",
        borderBottom: isScrolled ? "1px solid" : "none",
        borderColor: "divider",
        px: 2,
        py: 2,
        transition: "all 0.2s",
        ...(isScrolled && {
          py: 1,
          boxShadow: 1,
        })
      }}>
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

      <Box sx={{ px: 2, pb: 2, pt: 1, display: "flex", flexDirection: "column", gap: 1 }}>

        {node && (
          <Stack spacing={2}>
            <Stack spacing={2}>
              <TextField
                label="Label"
                size="small"
                value={node.label}
                onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
              />
            </Stack>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontSize={12}>
                  Conditions
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleUpdateFromPipe(node)}
                >
                  Update from Pipe
                </Button>
              </Stack>
              <QuantityInput
                label="Temperature"
                value={node.temperature ?? ""}
                unit={node.temperatureUnit ?? "C"}
                units={QUANTITY_UNIT_OPTIONS.temperature}
                unitFamily="temperature"
                onValueChange={(newValue) => onUpdateNode(node.id, {
                  temperature: newValue,
                  ...(node.temperatureUnit === undefined && { temperatureUnit: "C" })
                })}
                onUnitChange={(newUnit) => onUpdateNode(node.id, { temperatureUnit: newUnit })}
                decimalPlaces={4}
                min={0}
                minUnit="K"
              />

              <QuantityInput
                label="Pressure"
                value={node.pressure ?? ""}
                unit={node.pressureUnit ?? "kPag"}
                units={QUANTITY_UNIT_OPTIONS.pressure}
                unitFamily="pressure"
                onValueChange={(newValue) => onUpdateNode(node.id, {
                  pressure: newValue,
                  ...(node.pressureUnit === undefined && { pressureUnit: "kPag" })
                })}
                onUnitChange={(newUnit) => onUpdateNode(node.id, { pressureUnit: newUnit })}
                decimalPlaces={4}
                min={0}
                minUnit="Pa"
              />
            </Stack>

            <Stack spacing={2}>
              <Stack spacing={2}>
                <Typography fontSize={12}>
                  Fluid
                </Typography>
                <TextField
                  label="Name"
                  size="small"
                  value={node.fluid?.id ?? ""}
                  onChange={(event) =>
                    onUpdateNode(node.id, (current) => ({
                      fluid: {
                        ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                        id: event.target.value,
                      },
                    }))
                  }
                />
              </Stack>

              <FormControl component="fieldset" fullWidth sx={{
                border: "1px solid",
                borderColor: "rgba(0, 0, 0, 0.23)",
                borderRadius: 1,
                px: 2,
                pb: 1,
                pt: 0.5,
                "&:hover": {
                  borderColor: "text.primary",
                },
              }}>
                <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Fluid Phase</FormLabel>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <RadioGroup
                    value={nodeFluidPhase}
                    onChange={(event) =>
                      onUpdateNode(node.id, current => ({
                        fluid: {
                          ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                          phase: event.target.value as "liquid" | "gas",
                        },
                      }))
                    }
                  >
                    <Stack direction="row">
                      <FormControlLabel value="liquid" control={<Radio size="small" />} label="Liquid" />
                      <FormControlLabel value="gas" control={<Radio size="small" />} label="Gas" />
                    </Stack>
                  </RadioGroup>
                  <Button variant="contained" size="small" onClick={handleAutoFluid}>Auto</Button>
                </Stack>
              </FormControl>

              {nodeFluidPhase !== "gas" && (
                <QuantityInput
                  label="Liquid Density"
                  value={node.fluid?.density ?? ""}
                  unit={node.fluid?.densityUnit ?? "kg/m3"}
                  units={QUANTITY_UNIT_OPTIONS.density}
                  unitFamily="density"
                  onValueChange={(newValue) =>
                    onUpdateNode(node.id, (current) => ({
                      fluid: {
                        ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                        density: newValue,
                      },
                    }))
                  }
                  onUnitChange={(newUnit) =>
                    onUpdateNode(node.id, (current) => ({
                      fluid: {
                        ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                        densityUnit: newUnit,
                      },
                    }))
                  }
                  min={0}
                  minUnit="kg/m3"
                />
              )}
              {nodeFluidPhase === "gas" && (
                <Stack spacing={2}>
                  <Stack spacing={2}>
                    <TextField
                      label="Gas Molecular Weight"
                      size="small"
                      type="number"
                      value={node.fluid?.molecularWeight ?? ""}
                      error={(node.fluid?.molecularWeight ?? 0) < 0}
                      helperText={(node.fluid?.molecularWeight ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                      onChange={(event) => {
                        const value =
                          event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdateNode(node.id, (current) => ({
                          fluid: {
                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                            molecularWeight: value,
                          },
                        }));
                      }}
                    />
                  </Stack>

                  <Stack spacing={2}>
                    <TextField
                      label="Z Factor"
                      size="small"
                      type="number"
                      value={node.fluid?.zFactor ?? ""}
                      error={(node.fluid?.zFactor ?? 0) < 0}
                      helperText={(node.fluid?.zFactor ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                      onChange={(event) => {
                        const value =
                          event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdateNode(node.id, (current) => ({
                          fluid: {
                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                            zFactor: value,
                          },
                        }));
                      }}
                    />
                  </Stack>

                  <Stack spacing={2}>
                    <TextField
                      label="Specific Heat Ratio"
                      size="small"
                      type="number"
                      value={node.fluid?.specificHeatRatio ?? ""}
                      error={(node.fluid?.specificHeatRatio ?? 0) < 0}
                      helperText={(node.fluid?.specificHeatRatio ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                      onChange={(event) => {
                        const value =
                          event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdateNode(node.id, (current) => ({
                          fluid: {
                            ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                            specificHeatRatio: value,
                          },
                        }));
                      }}
                    />
                  </Stack>
                </Stack>
              )}

              <QuantityInput
                label="Viscosity"
                value={node.fluid?.viscosity ?? ""}
                unit={node.fluid?.viscosityUnit ?? "cP"}
                units={QUANTITY_UNIT_OPTIONS.viscosity}
                unitFamily="viscosity"
                onValueChange={(newValue) =>
                  onUpdateNode(node.id, current => ({
                    fluid: {
                      ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                      viscosity: newValue,
                    },
                  }))
                }
                onUnitChange={(newUnit) =>
                  onUpdateNode(node.id, current => ({
                    fluid: {
                      ...(current.fluid ?? { id: "fluid", phase: "liquid" }),
                      viscosityUnit: newUnit,
                    },
                  }))
                }
              />

            </Stack>

          </Stack>
        )}

        {pipe && (
          <Stack spacing={2}>
            <Stack spacing={2}>
              <TextField
                label="Label"
                size="small"
                value={pipe.label ?? ""}
                onChange={(e) => onUpdatePipe(pipe.id, { label: e.target.value })}
                placeholder="Enter label"
                fullWidth
              />

              <TextField
                label="Description"
                size="small"
                value={pipe.description ?? ""}
                onChange={(e) => onUpdatePipe(pipe.id, { description: e.target.value })}
                placeholder="Enter description"
                helperText={pipeHelperText()}
                fullWidth
              />
            </Stack>

            <FormControl size="small" fullWidth>
              <InputLabel>Calculation Type</InputLabel>
              <Select
                label="Calculation Type"
                value={pipe.pipeSectionType ?? "pipeline"}
                onChange={(event) => onUpdatePipe(pipe.id, { pipeSectionType: event.target.value as "pipeline" | "control valve" | "orifice" })}
              >
                <MenuItem value="pipeline">Pipeline</MenuItem>
                <MenuItem value="control valve">Control Valve</MenuItem>
                <MenuItem value="orifice">Orifice</MenuItem>
              </Select>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{
              border: "1px solid",
              borderColor: "rgba(0, 0, 0, 0.23)",
              borderRadius: 1,
              px: 2,
              pb: 1,
              pt: 0.5,
              "&:hover": {
                borderColor: "text.primary",
              },
            }}>
              <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Pressure Drop Direction</FormLabel>
              <RadioGroup
                value={pipe.direction ?? "forward"}
                onChange={(event) => {
                  const nextDirection = event.target.value as "forward" | "backward";
                  const boundaryNode = nextDirection === "forward" ? startNode : endNode;

                  onUpdatePipe(pipe.id, {
                    direction: nextDirection,
                    boundaryPressure: boundaryNode?.pressure,
                    boundaryPressureUnit: boundaryNode?.pressureUnit,
                    boundaryTemperature: boundaryNode?.temperature,
                    boundaryTemperatureUnit: boundaryNode?.temperatureUnit,
                    ...(nextDirection === "backward" && boundaryNode?.fluid
                      ? { fluid: { ...boundaryNode.fluid } }
                      : {}),
                  });
                }}
              >
                <Stack direction="row">
                  <FormControlLabel value="forward" control={<Radio size="small" />} label="Forward" />
                  <FormControlLabel value="backward" control={<Radio size="small" />} label="Backward" />
                </Stack>
              </RadioGroup>
            </FormControl>

            {pipeFluidPhase === "gas" && (
              <FormControl size="small" fullWidth>
                <InputLabel>Gas Flow Type</InputLabel>
                <Select
                  label="Gas Flow Type"
                  value={pipe.gasFlowModel ?? "adiabatic"}
                  onChange={(event) =>
                    onUpdatePipe(pipe.id, {
                      gasFlowModel: event.target.value as "adiabatic" | "isothermal",
                    })
                  }
                >
                  <MenuItem value="adiabatic">Adiabatic</MenuItem>
                  <MenuItem value="isothermal">Isothermal</MenuItem>
                </Select>
              </FormControl>
            )}

            <QuantityInput
              label="Mass Flow Rate"
              value={pipe.massFlowRate ?? ""}
              unit={pipe.massFlowRateUnit ?? "kg/h"}
              units={QUANTITY_UNIT_OPTIONS.massFlowRate}
              unitFamily="massFlowRate"
              onValueChange={(newValue) => {
                const normalizedValue = Number.isFinite(newValue) ? newValue : undefined;
                const designMassFlowRate = computeDesignMassFlowRate(
                  normalizedValue,
                  pipe.designMargin
                );
                onUpdatePipe(pipe.id, {
                  massFlowRate: normalizedValue,
                  designMassFlowRate,
                  designMassFlowRateUnit:
                    designMassFlowRate !== undefined
                      ? pipe.massFlowRateUnit ?? "kg/h"
                      : undefined,
                });
              }}
              onUnitChange={(newUnit) =>
                onUpdatePipe(pipe.id, { massFlowRateUnit: newUnit, designMassFlowRateUnit: newUnit })
              }
              min={0}
            />

            <Stack spacing={2}>
              <TextField
                label="Design Margin (%)"
                size="small"
                type="number"
                value={pipe.designMargin ?? ""}
                error={(pipe.designMargin ?? 0) < 0}
                helperText={(pipe.designMargin ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                onChange={(event) => {
                  const parsedValue =
                    event.target.value === "" ? undefined : Number(event.target.value);
                  const normalizedMargin =
                    typeof parsedValue === "number" && Number.isFinite(parsedValue)
                      ? parsedValue
                      : undefined;
                  const designMassFlowRate = computeDesignMassFlowRate(
                    pipe.massFlowRate,
                    normalizedMargin
                  );
                  onUpdatePipe(pipe.id, {
                    designMargin: normalizedMargin,
                    designMassFlowRate,
                    designMassFlowRateUnit:
                      designMassFlowRate !== undefined
                        ? pipe.massFlowRateUnit ?? "kg/h"
                        : undefined,
                  });
                }}
              />
            </Stack>

            <Stack spacing={2}>
              <QuantityInput
                label={isGasPipe ? "Design Normal Flow Rate" : "Design Volume Flow Rate"}
                value={(() => {
                  const dMassFlow = pipe.designMassFlowRate ?? computeDesignMassFlowRate(pipe.massFlowRate, pipe.designMargin);
                  if (dMassFlow === undefined) return "";

                  const massFlowUnit = pipe.designMassFlowRateUnit ?? pipe.massFlowRateUnit ?? "kg/h";

                  const massFlowKgH = convertUnit(
                    dMassFlow,
                    massFlowUnit,
                    "kg/h"
                  );

                  if (isGasPipe) {
                    const mw = startNode?.fluid?.molecularWeight;
                    if (!mw) return "";
                    // Normal flow in Nm3/h
                    const normalFlowNm3H = (massFlowKgH / mw) * 24.465;

                    const displayUnit = pipe.designFlowRateDisplayUnit ?? "Nm3/h";
                    if (displayUnit === "Nm3/h") return normalFlowNm3H;
                    if (displayUnit === "Nm3/d") return normalFlowNm3H * 24;
                    if (displayUnit === "MSCFD") return normalFlowNm3H * 0.000847552; // 1 Nm3/h = 35.3147 SCFH * 24 / 1e6 = 0.000847552 MSCFD
                    return normalFlowNm3H;
                  } else {
                    const density = startNode?.fluid?.density;
                    if (!density) return "";

                    let densityKgM3 = density;
                    if (startNode?.fluid?.densityUnit && startNode.fluid.densityUnit !== "kg/m3") {
                      densityKgM3 = convertUnit(density, startNode.fluid.densityUnit, "kg/m3");
                    }

                    const volFlowM3H = massFlowKgH / densityKgM3;
                    const displayUnit = pipe.designFlowRateDisplayUnit ?? "m3/h";

                    return convertUnit(volFlowM3H, "m3/h", displayUnit, "volumeFlowRate");
                  }
                })()}
                unit={pipe.designFlowRateDisplayUnit ?? (isGasPipe ? "Nm3/h" : "m3/h")}
                units={isGasPipe ? ["Nm3/h", "Nm3/d", "MSCFD"] : QUANTITY_UNIT_OPTIONS.volumeFlowRate}
                unitFamily={isGasPipe ? undefined : "volumeFlowRate"}
                onValueChange={() => { }} // Read-only derived value
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { designFlowRateDisplayUnit: newUnit })}
                isDisabled={false} // Allow unit selection
                decimalPlaces={3}
                helperText={isGasPipe ? "Standard Conditions: 1 atm, 25°C" : undefined}
                sx={{ input: { color: 'success.main' } }}
                readOnly
                color="success"
                alwaysShowColor
              />
            </Stack>

            <FormControl component="fieldset" fullWidth sx={{
              border: "1px solid",
              borderColor: "rgba(0, 0, 0, 0.23)",
              borderRadius: 1,
              px: 2,
              pb: 1,
              pt: 0.5,
              "&:hover": {
                borderColor: "text.primary",
              },
            }}>
              <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Diameter Input</FormLabel>
              <RadioGroup
                value={pipeDiameterInputMode}
                onChange={(event) =>
                  onUpdatePipe(pipe.id, { diameterInputMode: event.target.value as "nps" | "diameter" })
                }
              >
                <Stack direction="row">
                  <FormControlLabel value="nps" control={<Radio size="small" />} label="NPS" />
                  <FormControlLabel value="diameter" control={<Radio size="small" />} label="Diameter" />
                </Stack>
              </RadioGroup>
            </FormControl>

            {pipeDiameterInputMode === "diameter" ? (
              <QuantityInput
                label="Diameter"
                value={pipe.diameter ?? ""}
                unit={pipe.diameterUnit ?? "mm"}
                units={QUANTITY_UNIT_OPTIONS.lengthSmall}
                unitFamily="diameter"
                onValueChange={(newValue) => onUpdatePipe(pipe.id, { diameter: newValue })}
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { diameterUnit: newUnit })}
                min={0}
              />
            ) : (
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Nominal Pipe Size (NPS)</InputLabel>
                  <Select
                    label="Nominal Pipe Size (NPS)"

                    value={npsSelectValue}
                    onChange={(event) => {
                      const value = event.target.value === "" ? undefined : Number(event.target.value);
                      const derived = deriveDiameterFromNps(value, pipeScheduleValue);
                      onUpdatePipe(pipe.id, {
                        pipeNPD: value,
                        ...(derived !== undefined
                          ? { diameter: derived, diameterUnit: "mm" }
                          : {}),
                      });
                    }}
                  >

                    {scheduleEntries.map((entry) => (
                      <MenuItem key={`${pipeScheduleValue}-${entry.nps}`} value={entry.nps}>
                        {entry.nps}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Pipe Schedule</InputLabel>
                  <Select
                    label="Pipe Schedule"
                    value={pipeScheduleValue ?? "STD"}
                    onChange={(event) => {
                      const scheduleValue = event.target.value as PipeSchedule;
                      const entries = getScheduleEntries(scheduleValue);
                      let npsValue = pipe.pipeNPD;
                      if (npsValue === undefined || !entries.some((entry) => entry.nps === npsValue)) {
                        npsValue = entries[0]?.nps;
                      }
                      const derived = deriveDiameterFromNps(npsValue, scheduleValue);
                      onUpdatePipe(pipe.id, {
                        pipeSchedule: scheduleValue,
                        pipeNPD: npsValue,
                        ...(derived !== undefined
                          ? { diameter: derived, diameterUnit: "mm" }
                          : {}),
                      });
                    }}
                  >
                    {PIPE_SCHEDULES.map((schedule) => (
                      <MenuItem key={schedule} value={schedule}>
                        {schedule}
                      </MenuItem>
                    ))}
                  </Select>
                  {pipe.diameter !== undefined && (
                    <FormHelperText>
                      Calculated Diameter: {pipe.diameter} {pipe.diameterUnit ?? "mm"}
                    </FormHelperText>
                  )}
                </FormControl>
              </Stack>
            )}

            <QuantityInput
              label="Inlet Diameter"
              value={pipe.inletDiameter ?? ""}
              unit={pipe.inletDiameterUnit ?? pipe.diameterUnit ?? "mm"}
              units={QUANTITY_UNIT_OPTIONS.lengthSmall}
              unitFamily="diameter"
              onValueChange={(newValue) => onUpdatePipe(pipe.id, { inletDiameter: newValue })}
              onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { inletDiameterUnit: newUnit })}
              min={0}
            />

            <QuantityInput
              label="Outlet Diameter"
              value={pipe.outletDiameter ?? ""}
              unit={pipe.outletDiameterUnit ?? pipe.diameterUnit ?? "mm"}
              units={QUANTITY_UNIT_OPTIONS.lengthSmall}
              unitFamily="diameter"
              onValueChange={(newValue) => onUpdatePipe(pipe.id, { outletDiameter: newValue })}
              onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { outletDiameterUnit: newUnit })}
              min={0}
            />

            <Stack spacing={2}>
              <TextField
                label="Erosional Constant"
                size="small"
                type="number"
                value={pipe.erosionalConstant ?? 100}
                error={(pipe.erosionalConstant ?? 100) < 0}
                helperText={(pipe.erosionalConstant ?? 100) < 0 ? "Value cannot be less than 0" : undefined}
                onChange={(event) => {
                  const value = event.target.value === "" ? undefined : Number(event.target.value);
                  onUpdatePipe(pipe.id, { erosionalConstant: value });
                }}
              />
            </Stack>

            {pipe?.pipeSectionType === "pipeline" && (
              <>
                <QuantityInput
                  label="Pipe Roughness"
                  value={pipe.roughness ?? ""}
                  unit={pipe.roughnessUnit ?? "mm"}
                  units={["mm", "cm", "m", "ft", "in"]}
                  unitFamily="roughness"
                  onValueChange={(newValue) => onUpdatePipe(pipe.id, { roughness: newValue })}
                  onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { roughnessUnit: newUnit })}
                  min={0}
                />

                <QuantityInput
                  label="Length"
                  value={pipe.length ?? ""}
                  unit={pipe.lengthUnit ?? "m"}
                  units={QUANTITY_UNIT_OPTIONS.length}
                  unitFamily="length"
                  onValueChange={(newValue) => onUpdatePipe(pipe.id, { length: newValue })}
                  onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { lengthUnit: newUnit })}
                  min={0}
                />

                {pipeFluidPhase === "liquid" && (
                  <QuantityInput
                    label="Elevation Change"
                    value={pipe.elevation ?? ""}
                    unit={pipe.elevationUnit ?? "m"}
                    units={QUANTITY_UNIT_OPTIONS.length}
                    unitFamily="length"
                    onValueChange={(newValue) => onUpdatePipe(pipe.id, { elevation: newValue })}
                    onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { elevationUnit: newUnit })}
                  />
                )}

                <Stack spacing={3}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Fitting Type</InputLabel>
                    <Select
                      label="Fitting Type"
                      value={pipe.fittingType ?? "LR"}
                      onChange={(event) => onUpdatePipe(pipe.id, { fittingType: event.target.value })}
                    >
                      {FITTING_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack spacing={2}>
                    <TextField
                      label="Pipe & Fitting Safety Factor (%)"
                      size="small"
                      type="number"
                      value={pipe.pipingFittingSafetyFactor ?? 0}
                      error={(pipe.pipingFittingSafetyFactor ?? 0) < 0}
                      helperText={(pipe.pipingFittingSafetyFactor ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                      onChange={(event) => {
                        const value = event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: value });
                      }}
                    />
                  </Stack>

                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <InputLabel>Fittings</InputLabel>
                      <Stack direction="row" spacing={2}>
                        <Tooltip title="Reset fittings">
                          <IconButton
                            size="small"
                            onClick={handleResetFittings}
                            disabled={pipeFittings.length === 0}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add fitting">
                          <IconButton size="small" onClick={handleAddFitting}>
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {pipeFittings.length === 0 ? (
                      <InputLabel>No fittings added.</InputLabel>
                    ) : (
                      <Stack spacing={2}>
                        {pipeFittings.map((fitting, index) => {
                          const isSwage =
                            fitting.type === "inlet_swage" || fitting.type === "outlet_swage";
                          return (
                            <Stack
                              key={`${fitting.type}-${index}`}
                              direction="row"
                              spacing={1}
                              alignItems="flex-end"
                            >
                              <FormControl sx={{ width: "240px" }} size="small">
                                <InputLabel>Type</InputLabel>
                                <Select
                                  label="Type"
                                  value={fitting.type}
                                  disabled={isSwage}
                                  onChange={(event) =>
                                    handleFittingFieldChange(index, {
                                      type: event.target.value,
                                      k_each: 0,
                                      k_total: 0,
                                    })
                                  }
                                  fullWidth
                                >
                                  {PIPE_FITTING_OPTIONS.filter(
                                    (option) => !option.autoOnly || option.value === fitting.type
                                  ).map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Count"
                                size="small"
                                type="number"
                                sx={{ width: "100px" }}
                                disabled={isSwage}
                                value={fitting.count ?? 0}
                                onChange={(event) => {
                                  const valueNumber = Number(event.target.value);
                                  if (!Number.isFinite(valueNumber)) {
                                    return;
                                  }
                                  const normalized = Math.max(0, Math.floor(valueNumber));
                                  handleFittingFieldChange(index, {
                                    count: normalized,
                                    k_total: normalized * (fitting.k_each ?? 0),
                                  });
                                }}
                              />
                              <Tooltip title="Remove fitting">
                                <IconButton
                                  aria-label="Remove fitting"
                                  size="small"
                                  disabled={isSwage}
                                  onClick={() => handleRemoveFitting(index)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                  <Stack spacing={2}>
                    <TextField
                      label="User K"
                      size="small"
                      type="number"
                      value={pipe.userK ?? ""}
                      error={(pipe.userK ?? 0) < 0}
                      helperText={(pipe.userK ?? 0) < 0 ? "Value cannot be less than 0" : undefined}
                      onChange={(event) => {
                        const value = event.target.value === "" ? undefined : Number(event.target.value);
                        onUpdatePipe(pipe.id, { userK: value });
                      }}
                    />
                  </Stack>
                </Stack>

                <QuantityInput
                  label="User Pressure Loss"
                  value={pipe.userSpecifiedPressureLoss ?? ""}
                  unit={pipe.userSpecifiedPressureLossUnit ?? "kPa"}
                  units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                  unitFamily="pressureDrop"
                  onValueChange={(newValue) =>
                    onUpdatePipe(pipe.id, {
                      userSpecifiedPressureLoss: newValue,
                      userSpecifiedPressureLossUnit: pipe.userSpecifiedPressureLossUnit ?? "kPa",
                    })
                  }
                  onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { userSpecifiedPressureLossUnit: newUnit })}
                  min={0}
                  minUnit="Pa"
                />
              </>
            )}

            {pipe?.pipeSectionType === "control valve" && (
              <>
                <FormControl component="fieldset" fullWidth sx={{
                  border: "1px solid",
                  borderColor: "rgba(0, 0, 0, 0.23)",
                  borderRadius: 1,
                  px: 2,
                  pb: 1,
                  pt: 0.5,
                  "&:hover": {
                    borderColor: "text.primary",
                  },
                }}>
                  <FormLabel component="legend" sx={{ px: 0.5, fontSize: "0.75rem" }}>Control Valve Calculation Mode</FormLabel>
                  <RadioGroup
                    value={pipe.controlValve?.calculation_note || "dp_to_cv"}
                    onChange={(event) => {
                      onUpdatePipe(pipe.id, {
                        controlValve: {
                          id: pipe.controlValve?.id || pipe.id,
                          tag: pipe.controlValve?.tag || pipe.id,
                          ...pipe.controlValve,
                          calculation_note: event.target.value,
                        },
                      });
                    }}
                  >
                    <Stack direction="row">
                      <FormControlLabel value="cv_to_dp" control={<Radio size="small" />} label={controlValveInputRadioLabel} />
                      <FormControlLabel value="dp_to_cv" control={<Radio size="small" />} label={controlValveOutputRadioLabel} />
                    </Stack>
                  </RadioGroup>
                </FormControl>

                {isGasPipe && (
                  <>
                    <Stack spacing={2}>
                      <TextField
                        label="Gas Valve Constant (C1)"
                        size="small"
                        type="number"
                        disabled={true}
                        helperText="Typically 15 to 35"
                        value={
                          typeof pipe.controlValve?.C1 === "number"
                            ? pipe.controlValve.C1.toFixed(4)
                            : ""
                        }
                        onChange={(event) => {
                          const value = event.target.value === "" ? undefined : Number(event.target.value);
                          onUpdatePipe(pipe.id, (currentPipe) => {
                            const currentValve =
                              currentPipe.controlValve ?? {
                                id: currentPipe.id,
                                tag: currentPipe.id,
                              };
                            return {
                              controlValve: {
                                ...currentValve,
                                C1: value,
                              },
                              pressureDropCalculationResults: undefined,
                              resultSummary: undefined,
                            };
                          });
                        }}
                      />
                    </Stack>
                    <Stack spacing={2}>
                      <TextField
                        label="Pressure Drop Ratio (xT)"
                        size="small"
                        type="number"
                        disabled={true}
                        helperText="Typically 0.15 to 0.75"
                        value={
                          typeof pipe.controlValve?.xT === "number"
                            ? pipe.controlValve.xT.toFixed(4)
                            : ""
                        }
                        onChange={(event) => {
                          const value = event.target.value === "" ? undefined : Number(event.target.value);
                          onUpdatePipe(pipe.id, (currentPipe) => {
                            const currentValve =
                              currentPipe.controlValve ?? {
                                id: currentPipe.id,
                                tag: currentPipe.id,
                              };
                            return {
                              controlValve: {
                                ...currentValve,
                                xT: value,
                              },
                              pressureDropCalculationResults: undefined,
                              resultSummary: undefined,
                            };
                          });
                        }}
                      />
                    </Stack>
                  </>
                )}

                {pipe.controlValve?.calculation_note === "cv_to_dp" && (
                  <>
                    <Stack spacing={2}>
                      <TextField
                        label={controlValveCoefficientLabel}
                        size="small"
                        type="number"
                        value={controlValveCoefficientValue}
                        onChange={(event) => {
                          const value = event.target.value === "" ? undefined : Number(event.target.value);
                          onUpdatePipe(pipe.id, (currentPipe) => {
                            const currentValve =
                              currentPipe.controlValve ?? {
                                id: currentPipe.id,
                                tag: currentPipe.id,
                              };
                            const coefficientPatch = isGasPipe
                              ? { cg: value, cv: undefined }
                              : { cv: value, cg: undefined };
                            return {
                              controlValve: {
                                ...currentValve,
                                ...coefficientPatch,
                                pressureDrop: undefined, // Clear the other input
                              },
                              pressureDropCalculationResults: undefined,
                              resultSummary: undefined,
                            };
                          });
                        }}
                      />
                    </Stack>
                    <Stack spacing={2}>
                      <QuantityInput
                        label="Calculated Pressure Drop"
                        value={
                          typeof controlValvePressureDropDisplayValue === "number"
                            ? controlValvePressureDropDisplayValue
                            : ""
                        }
                        unit={controlValvePressureDropUnit}
                        units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                        unitFamily="pressureDrop"
                        onValueChange={() => { }} // Read-only
                        onUnitChange={(newUnit) => {
                          onUpdatePipe(pipe.id, (currentPipe) => {
                            const currentValve =
                              currentPipe.controlValve ?? {
                                id: currentPipe.id,
                                tag: currentPipe.id,
                              };
                            const valveUnit = currentValve.pressureDropUnit ?? "kPa";
                            const pressureDropPa =
                              currentPipe.pressureDropCalculationResults?.controlValvePressureDrop ??
                              (currentValve.pressureDrop !== undefined
                                ? convertUnit(currentValve.pressureDrop, valveUnit, "Pa")
                                : undefined);
                            const converted =
                              pressureDropPa === undefined
                                ? undefined
                                : convertUnit(pressureDropPa, "Pa", newUnit);
                            return {
                              controlValve: {
                                ...currentValve,
                                pressureDrop: converted,
                                pressureDropUnit: newUnit,
                              },
                            };
                          });
                        }}
                        decimalPlaces={3}
                        sx={{ input: { color: 'success.main' } }}
                        readOnly
                        color="success"
                        alwaysShowColor
                      />
                    </Stack>
                  </>
                )}

                {(pipe.controlValve?.calculation_note === "dp_to_cv" || !pipe.controlValve?.calculation_note) && (
                  <>
                    <QuantityInput
                      label="Pressure Drop"
                      value={pipe.controlValve?.pressureDrop ?? ""}
                      unit={controlValvePressureDropUnit}
                      units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                      unitFamily="pressureDrop"
                      onValueChange={(newValue) => {
                        onUpdatePipe(pipe.id, (currentPipe) => {
                          const currentValve =
                            currentPipe.controlValve ?? {
                              id: currentPipe.id,
                              tag: currentPipe.id,
                            };
                          return {
                            controlValve: {
                              ...currentValve,
                              pressureDrop: newValue,
                              pressureDropUnit: currentValve.pressureDropUnit ?? "kPa",
                              ...(isGasPipe ? { cg: undefined } : { cv: undefined }),
                            },
                            pressureDropCalculationResults: undefined,
                            resultSummary: undefined,
                          };
                        });
                      }}
                      onUnitChange={(newUnit) => {
                        onUpdatePipe(pipe.id, (currentPipe) => {
                          const currentValve =
                            currentPipe.controlValve ?? {
                              id: currentPipe.id,
                              tag: currentPipe.id,
                            };
                          return {
                            controlValve: {
                              ...currentValve,
                              pressureDropUnit: newUnit,
                            },
                            pressureDropCalculationResults: undefined,
                            resultSummary: undefined,
                          };
                        });
                      }}
                    />
                    <TextField
                      label={controlValveCalculatedCoefficientLabel}
                      size="small"
                      type="number"
                      sx={{
                        input: { color: 'success.main' },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "success.main" },
                        "& .MuiInputLabel-root": { color: "success.main" },
                      }}
                      value={
                        typeof controlValveCalculatedCoefficientValue === "number"
                          ? controlValveCalculatedCoefficientValue.toFixed(4)
                          : ""
                      }
                      color="success"
                    />
                  </>
                )}
              </>
            )}

            {pipe?.pipeSectionType === "orifice" && (
              <>
                <Stack spacing={2}>
                  <TextField
                    label="Beta Ratio (β = d / D)"
                    size="small"
                    type="number"
                    slotProps={{
                      htmlInput: { step: 0.01, min: 0, max: 1 },
                    }}
                    value={pipe.orifice?.betaRatio ?? ""}
                    onChange={(event) => {
                      const value =
                        event.target.value === "" ? undefined : Number(event.target.value);
                      const normalizedValue =
                        value !== undefined && Number.isFinite(value) ? value : undefined;
                      onUpdatePipe(pipe.id, (currentPipe) => {
                        const currentOrifice =
                          currentPipe.orifice ?? {
                            id: currentPipe.id,
                            tag: currentPipe.id,
                          };
                        return {
                          orifice: {
                            ...currentOrifice,
                            betaRatio: normalizedValue,
                            pressureDrop: undefined,
                          },
                          pressureDropCalculationResults: undefined,
                          resultSummary: undefined,
                        };
                      });
                    }}
                  />
                  <QuantityInput
                    label="Calculated Pressure Drop"
                    value={
                      typeof orificePressureDropDisplayValue === "number"
                        ? orificePressureDropDisplayValue
                        : ""
                    }
                    unit={orificePressureDropUnit}
                    units={QUANTITY_UNIT_OPTIONS.pressureDrop}
                    unitFamily="pressureDrop"
                    sx={{ input: { color: 'success.main' } }}
                    color="success"
                    decimalPlaces={3}
                    alwaysShowColor
                    onValueChange={() => { }} // Read-only
                    onUnitChange={(newUnit) => {
                      onUpdatePipe(pipe.id, (currentPipe) => {
                        const currentOrifice =
                          currentPipe.orifice ?? {
                            id: currentPipe.id,
                            tag: currentPipe.id,
                          };
                        const orificeUnit = currentOrifice.pressureDropUnit ?? "kPa";
                        const pressureDropPa =
                          currentPipe.pressureDropCalculationResults?.orificePressureDrop ??
                          (currentOrifice.pressureDrop !== undefined
                            ? convertUnit(currentOrifice.pressureDrop, orificeUnit, "Pa")
                            : undefined);
                        const converted =
                          pressureDropPa === undefined
                            ? undefined
                            : convertUnit(pressureDropPa, "Pa", newUnit);
                        return {
                          orifice: {
                            ...currentOrifice,
                            pressureDrop: converted,
                            pressureDropUnit: newUnit,
                          },
                        };
                      });
                    }}
                  />
                </Stack>
              </>
            )}
          </Stack>
        )
        }
      </Box>
    </Paper>
  );
}
