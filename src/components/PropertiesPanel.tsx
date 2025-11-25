"use client";

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
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { FittingType, NetworkState, NodeProps, NodePatch, PipeProps, PipePatch, SelectedElement } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

const PIPE_SECTION_TYPE = ["pipeline", "control valve", "orifice"] as const;
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
    ? "Input Cg, Calculate Pressure Drop"
    : "Input Cv, Calculate Pressure Drop";
  const controlValveOutputRadioLabel = isGasPipe
    ? "Input Pressure Drop, Calculate Cg"
    : "Input Pressure Drop, Calculate Cv";
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

  return (
    <Paper
      elevation={0}
      sx={{
        width: "320px",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h6">Properties</Typography>

      {node && (
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="text.secondary">
              Label
            </Typography>
            <TextField
              size="small"
              value={node.label}
              onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Conditions
            </Typography>

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
            />

            <Button
              size="small"
              variant="contained"
              onClick={() => {
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
              }}
            >
              Update from Connected Pipe
            </Button>
          </Stack>

          <Stack spacing={1}>
            <Stack spacing={1}>
              <Typography color="text.secondary">
                Fluid ID
              </Typography>
              <TextField
                size="small"
                value={node.fluid?.id ?? ""}
                onChange={(event) =>
                  onUpdateNode(node.id, (current) => ({
                    fluid: {
                      ...(current.fluid ?? {}),
                      id: event.target.value,
                    },
                  }))
                }
              />
            </Stack>

            <Typography color="text.secondary">
              Fluid Phase
            </Typography>
            <RadioGroup
              value={nodeFluidPhase}
              onChange={(event) =>
                onUpdateNode(node.id, current => ({
                  fluid: {
                    ...(current.fluid ?? {}),
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
                      ...(current.fluid ?? {}),
                      density: newValue,
                    },
                  }))
                }
                onUnitChange={(newUnit) =>
                  onUpdateNode(node.id, (current) => ({
                    fluid: {
                      ...(current.fluid ?? {}),
                      densityUnit: newUnit,
                    },
                  }))
                }
              />
            )}
            {nodeFluidPhase === "gas" && (
              <Stack spacing={2}>
                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    Gas Molecular Weight
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any" }}
                    value={node.fluid?.molecularWeight ?? ""}
                    onChange={(event) => {
                      const value =
                        event.target.value === "" ? undefined : Number(event.target.value);
                      onUpdateNode(node.id, (current) => ({
                        fluid: {
                          ...(current.fluid ?? {}),
                          molecularWeight: value,
                        },
                      }));
                    }}
                  />
                </Stack>

                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    Z Factor
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any" }}
                    value={node.fluid?.zFactor ?? ""}
                    onChange={(event) => {
                      const value =
                        event.target.value === "" ? undefined : Number(event.target.value);
                      onUpdateNode(node.id, (current) => ({
                        fluid: {
                          ...(current.fluid ?? {}),
                          zFactor: value,
                        },
                      }));
                    }}
                  />
                </Stack>

                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    Specific Heat Ratio
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any" }}
                    value={node.fluid?.specificHeatRatio ?? ""}
                    onChange={(event) => {
                      const value =
                        event.target.value === "" ? undefined : Number(event.target.value);
                      onUpdateNode(node.id, (current) => ({
                        fluid: {
                          ...(current.fluid ?? {}),
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
                    ...(current.fluid ?? {}),
                    viscosity: newValue,
                  },
                }))
              }
              onUnitChange={(newUnit) =>
                onUpdateNode(node.id, current => ({
                  fluid: {
                    ...(current.fluid ?? {}),
                    viscosityUnit: newUnit,
                  },
                }))
              }
            />

          </Stack>

        </Stack>
      )}

      {pipe && (
        <Stack spacing={3}>
          <Typography fontWeight="bold">Pipe Section</Typography>
          <Typography color="text.secondary">
            {startNode?.label ?? "Unknown"} → {endNode?.label ?? "Unknown"}
          </Typography>

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Label
            </Typography>
            <TextField
              size="small"
              value={pipe.label ?? ""}
              onChange={(e) => onUpdatePipe(pipe.id, { label: e.target.value })}
              placeholder="Enter label"
              fullWidth
            />
          </Stack>

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Description
            </Typography>
            <TextField
              size="small"
              value={pipe.description ?? ""}
              onChange={(e) => onUpdatePipe(pipe.id, { description: e.target.value })}
              placeholder="Enter description"
              fullWidth
            />
          </Stack>

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Calculation Direction
            </Typography>
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
                });
              }}
            >
              <Stack direction="row">
                <FormControlLabel value="forward" control={<Radio size="small" />} label="Forward" />
                <FormControlLabel value="backward" control={<Radio size="small" />} label="Backward" />
              </Stack>
            </RadioGroup>
          </Stack>

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
          />

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Design Margin (%)
            </Typography>
            <TextField
              size="small"
              type="number"
              inputProps={{ step: "any" }}
              value={pipe.designMargin ?? ""}
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

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Pipe Section Type
            </Typography>
            <Select
              size="small"
              value={pipe.pipeSectionType ?? "pipeline"}
              onChange={(event) => onUpdatePipe(pipe.id, { pipeSectionType: event.target.value as "pipeline" | "control valve" | "orifice" })}
            >
              <MenuItem value="pipeline">Pipeline</MenuItem>
              <MenuItem value="control valve">Control Valve</MenuItem>
              <MenuItem value="orifice">Orifice</MenuItem>
            </Select>
          </Stack>


          {pipeFluidPhase === "gas" && (
            <Stack spacing={1}>
              <Typography color="text.secondary">
                Gas Flow Model
              </Typography>
              <Select
                size="small"
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
            </Stack>
          )}

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Diameter Input
            </Typography>
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
          </Stack>

          {pipeDiameterInputMode === "diameter" ? (
            <QuantityInput
              label="Diameter"
              value={pipe.diameter ?? ""}
              unit={pipe.diameterUnit ?? "mm"}
              units={QUANTITY_UNIT_OPTIONS.lengthSmall}
              unitFamily="diameter"
              onValueChange={(newValue) => onUpdatePipe(pipe.id, { diameter: newValue })}
              onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { diameterUnit: newUnit })}
            />
          ) : (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  Nominal Pipe Size (NPS)
                </Typography>
                <Select
                  size="small"
                  displayEmpty
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
                  <MenuItem value="" disabled>Select NPS</MenuItem>
                  {scheduleEntries.map((entry) => (
                    <MenuItem key={`${pipeScheduleValue}-${entry.nps}`} value={entry.nps}>
                      {entry.nps}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  Pipe Schedule
                </Typography>
                <Select
                  size="small"
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
              </Stack>
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
          />

          <QuantityInput
            label="Outlet Diameter"
            value={pipe.outletDiameter ?? ""}
            unit={pipe.outletDiameterUnit ?? pipe.diameterUnit ?? "mm"}
            units={QUANTITY_UNIT_OPTIONS.lengthSmall}
            unitFamily="diameter"
            onValueChange={(newValue) => onUpdatePipe(pipe.id, { outletDiameter: newValue })}
            onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { outletDiameterUnit: newUnit })}
          />

          <Stack spacing={1}>
            <Typography color="text.secondary">
              Erosional Constant
            </Typography>
            <TextField
              size="small"
              type="number"
              inputProps={{ step: "any" }}
              value={pipe.erosionalConstant ?? 100}
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
              />

              <QuantityInput
                label="Length"
                value={pipe.length ?? ""}
                unit={pipe.lengthUnit ?? "m"}
                units={QUANTITY_UNIT_OPTIONS.length}
                unitFamily="length"
                onValueChange={(newValue) => onUpdatePipe(pipe.id, { length: newValue })}
                onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { lengthUnit: newUnit })}
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
                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    Fitting Type
                  </Typography>
                  <Select
                    size="small"
                    value={pipe.fittingType ?? "LR"}
                    onChange={(event) => onUpdatePipe(pipe.id, { fittingType: event.target.value })}
                    fullWidth
                  >
                    {FITTING_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    Safety Factor
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any" }}
                    value={pipe.pipingFittingSafetyFactor ?? 1}
                    onChange={(event) => {
                      const value = event.target.value === "" ? undefined : Number(event.target.value);
                      onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: value });
                    }}
                  />
                </Stack>

                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">
                      Fittings
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Button
                        size="small"
                        onClick={handleResetFittings}
                        disabled={pipeFittings.length === 0}
                      >
                        Reset
                      </Button>
                      <Button size="small" onClick={handleAddFitting}>
                        Add
                      </Button>
                    </Stack>
                  </Stack>

                  {pipeFittings.length === 0 ? (
                    <Typography color="text.secondary">
                      No fittings added.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {pipeFittings.map((fitting, index) => {
                        const isSwage =
                          fitting.type === "inlet_swage" || fitting.type === "outlet_swage";
                        return (
                          <Stack
                            key={`${fitting.type}-${index}`}
                            direction="row"
                            spacing={2}
                            alignItems="flex-end"
                          >
                            <Stack flex="1" spacing={1}>
                              <Typography color="text.secondary">
                                Type
                              </Typography>
                              <Select
                                size="small"
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
                            </Stack>
                            <Stack width="80px" spacing={1}>
                              <Typography color="text.secondary">
                                Count
                              </Typography>
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 1 }}
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
                            </Stack>
                            <IconButton
                              aria-label="Remove fitting"
                              size="small"
                              disabled={isSwage}
                              onClick={() => handleRemoveFitting(index)}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
                <Stack spacing={1}>
                  <Typography color="text.secondary">
                    User K
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any" }}
                    value={pipe.userK ?? ""}
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
              />
            </>
          )}

          {pipe?.pipeSectionType === "control valve" && (
            <>
              <Typography color="text.secondary">
                Control Valve Calculation Mode
              </Typography>
              <RadioGroup
                value={pipe.controlValve?.calculation_note || "cv_to_dp"}
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

              {isGasPipe && (
                <>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      Gas Valve Constant (C1)
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ step: "any" }}
                      value={pipe.controlValve?.C1 ?? ""}
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
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      Pressure Drop Ratio (xT)
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ step: "any" }}
                      value={pipe.controlValve?.xT ?? ""}
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
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      {controlValveCoefficientLabel}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ step: "any" }}
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
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      Calculated Pressure Drop
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ step: "any", readOnly: true }}
                        value={controlValvePressureDropDisplayValue}
                      />
                      <Select
                        size="small"
                        value={controlValvePressureDropUnit}
                        onChange={(event) => {
                          const nextUnit = event.target.value;
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
                                : convertUnit(pressureDropPa, "Pa", nextUnit);
                            return {
                              controlValve: {
                                ...currentValve,
                                pressureDrop: converted,
                                pressureDropUnit: nextUnit,
                              },
                            };
                          });
                        }}
                      >
                        {QUANTITY_UNIT_OPTIONS.pressureDrop.map((unitOption) => (
                          <MenuItem key={unitOption} value={unitOption}>
                            {unitOption}
                          </MenuItem>
                        ))}
                      </Select>
                    </Stack>
                  </Stack>
                </>
              )}

              {pipe.controlValve?.calculation_note === "dp_to_cv" && (
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
                  <Stack spacing={1}>
                    <Typography color="text.secondary">
                      {controlValveCalculatedCoefficientLabel}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ step: "any", readOnly: true }}
                      value={controlValveCalculatedCoefficientValue}
                    />
                  </Stack>
                </>
              )}
            </>
          )}

          {pipe?.pipeSectionType === "orifice" && (
            <>
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  Beta Ratio (β = d / D)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ step: "any", min: 0, max: 1 }}
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
              </Stack>

              <Stack spacing={1}>
                <Typography color="text.secondary">
                  Calculated Pressure Drop
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "any", readOnly: true }}
                    value={orificePressureDropDisplayValue}
                  />
                  <Select
                    size="small"
                    value={orificePressureDropUnit}
                    onChange={(event) => {
                      const nextUnit = event.target.value;
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
                            : convertUnit(pressureDropPa, "Pa", nextUnit);
                        return {
                          orifice: {
                            ...currentOrifice,
                            pressureDrop: converted,
                            pressureDropUnit: nextUnit,
                          },
                        };
                      });
                    }}
                  >
                    {QUANTITY_UNIT_OPTIONS.pressureDrop.map((unitOption) => (
                      <MenuItem key={unitOption} value={unitOption}>
                        {unitOption}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      )}

      {!node && !pipe && (
        <Typography color="text.secondary">
          Select a node or pipe to view or edit its values.
        </Typography>
      )}
    </Paper>
  );
}
