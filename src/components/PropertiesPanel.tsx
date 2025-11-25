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
  Checkbox,
  Heading,
  IconButton,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
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
    <Stack
      w="320px"
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      gap={4}
    >
      <Heading size="md">Properties</Heading>

      {node && (
        <Stack gap={3}>
          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Label
            </Text>
            <Input
              value={node.label}
              onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
            />
          </Stack>

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Conditions
            </Text>

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
              size="sm"
              onClick={() => {
                // Find connected pipes and update node with outlet state
                // Prioritize pipes where node is the target (endNode) first, then source (startNode)
                const connectedPipes = network.pipes.filter(pipe =>
                  pipe.startNodeId === node.id || pipe.endNodeId === node.id
                );

                const targetPipes = connectedPipes.filter(pipe => pipe.endNodeId === node.id);
                const sourcePipes = connectedPipes.filter(pipe => pipe.startNodeId === node.id);
                const prioritizedPipes = [...targetPipes, ...sourcePipes];

                for (const pipe of prioritizedPipes) {
                  const pipeState =
                    pipe.startNodeId === node.id
                      ? pipe.resultSummary?.inletState
                      : pipe.endNodeId === node.id
                        ? pipe.resultSummary?.outletState
                        : undefined;

                  if (!pipeState || pipeState.pressure === undefined) {
                    continue;
                  }

                  const updates: Partial<NodeProps> = {
                    pressure: convertUnit(pipeState.pressure, 'Pa', node.pressureUnit ?? 'kPag'),
                    pressureUnit: node.pressureUnit ?? 'kPag',
                  };

                  if (pipeState.temprature !== undefined) {
                    updates.temperature = convertUnit(
                      pipeState.temprature,
                      'K',
                      node.temperatureUnit ?? 'C'
                    );
                    updates.temperatureUnit = node.temperatureUnit ?? 'C';
                  }

                  onUpdateNode(node.id, updates);
                  break;
                }
              }}
            >
              Update from Connected Pipe
            </Button>
          </Stack>

          <Stack gap={1}>
            <Stack gap={1}>
              <Text fontSize="sm" color="gray.500">
                Fluid ID
              </Text>
              <Input
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

            <Text fontSize="sm" color="gray.500">
              Fluid Phase
            </Text>
            <RadioGroup
              value={nodeFluidPhase}
              onChange={(value) =>
                onUpdateNode(node.id, current => ({
                  fluid: {
                    ...(current.fluid ?? {}),
                    phase: value as "liquid" | "gas",
                  },
                }))
              }
            >
              <Stack direction="row">
                <Radio value="liquid">Liquid</Radio>
                <Radio value="gas">Gas</Radio>
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
              <Stack gap={2}>
                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    Gas Molecular Weight
                  </Text>
                  <Input
                    type="number"
                    step="any"
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

                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    Z Factor
                  </Text>
                  <Input
                    type="number"
                    step="any"
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

                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    Specific Heat Ratio
                  </Text>
                  <Input
                    type="number"
                    step="any"
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
        <Stack gap={3}>
          <Text fontWeight="semibold">Pipe Section</Text>
          <Text fontSize="sm" color="gray.500">
            {startNode?.label ?? "Unknown"} → {endNode?.label ?? "Unknown"}
          </Text>

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Calculation Direction
            </Text>
            <RadioGroup
              value={pipe.direction ?? "forward"}
              onChange={(value) => {
                const nextDirection = value as "forward" | "backward";
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
                <Radio value="forward">Forward</Radio>
                <Radio value="backward">Backward</Radio>
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

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Design Margin (%)
            </Text>
            <Input
              type="number"
              step="any"
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

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Pipe Section Type
            </Text>
            <Select
              value={pipe.pipeSectionType ?? "pipeline"}
              onChange={(event) => onUpdatePipe(pipe.id, { pipeSectionType: event.target.value as "pipeline" | "control valve" | "orifice" })}
            >
              <option value="pipeline">Pipeline</option>
              <option value="control valve">Control Valve</option>
              <option value="orifice">Orifice</option>
            </Select>
          </Stack>


          {pipeFluidPhase === "gas" && (
            <Stack gap={1}>
              <Text fontSize="sm" color="gray.500">
                Gas Flow Model
              </Text>
              <Select
                value={pipe.gasFlowModel ?? "adiabatic"}
                onChange={(event) =>
                  onUpdatePipe(pipe.id, {
                    gasFlowModel: event.target.value as "adiabatic" | "isothermal",
                  })
                }
              >
                <option value="adiabatic">Adiabatic</option>
                <option value="isothermal">Isothermal</option>
              </Select>
            </Stack>
          )}

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Diameter Input
            </Text>
            <RadioGroup
              value={pipeDiameterInputMode}
              onChange={(value) =>
                onUpdatePipe(pipe.id, { diameterInputMode: value as "nps" | "diameter" })
              }
            >
              <Stack direction="row">
                <Radio value="nps">NPS</Radio>
                <Radio value="diameter">Diameter</Radio>
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
            <Stack gap={2}>
              <Stack gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Nominal Pipe Size (NPS)
                </Text>
                <Select
                  placeholder="Select NPS"
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
                    <option key={`${pipeScheduleValue}-${entry.nps}`} value={entry.nps}>
                      {entry.nps}
                    </option>
                  ))}
                </Select>
              </Stack>
              <Stack gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Pipe Schedule
                </Text>
                <Select
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
                    <option key={schedule} value={schedule}>
                      {schedule}
                    </option>
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

          <Stack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Erosional Constant
            </Text>
            <Input
              type="number"
              step="any"
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

              <Stack gap={3}>
                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    Fitting Type
                  </Text>
                  <Select
                    value={pipe.fittingType ?? "LR"}
                    onChange={(event) => onUpdatePipe(pipe.id, { fittingType: event.target.value })}
                    w="full"
                  >
                    {FITTING_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Stack>

                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    Safety Factor
                  </Text>
                  <Input
                    type="number"
                    step="any"
                    value={pipe.pipingFittingSafetyFactor ?? 1}
                    onChange={(event) => {
                      const value = event.target.value === "" ? undefined : Number(event.target.value);
                      onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: value });
                    }}
                  />
                </Stack>

                <Stack gap={2}>
                  <Stack direction="row" justify="space-between" align="center">
                    <Text fontSize="sm" color="gray.500">
                      Fittings
                    </Text>
                    <Stack direction="row" gap={2}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={handleResetFittings}
                        isDisabled={pipeFittings.length === 0}
                      >
                        Reset
                      </Button>
                      <Button size="xs" onClick={handleAddFitting}>
                        Add
                      </Button>
                    </Stack>
                  </Stack>

                  {pipeFittings.length === 0 ? (
                    <Text fontSize="sm" color="gray.400">
                      No fittings added.
                    </Text>
                  ) : (
                    <Stack gap={2}>
                      {pipeFittings.map((fitting, index) => {
                        const isSwage =
                          fitting.type === "inlet_swage" || fitting.type === "outlet_swage";
                        return (
                          <Stack
                            key={`${fitting.type}-${index}`}
                            direction="row"
                            gap={2}
                            align="flex-end"
                          >
                            <Stack flex="1" gap={1}>
                              <Text fontSize="sm" color="gray.500">
                                Type
                              </Text>
                              <Select
                                value={fitting.type}
                                isDisabled={isSwage}
                                onChange={(event) =>
                                  handleFittingFieldChange(index, {
                                    type: event.target.value,
                                    k_each: 0,
                                    k_total: 0,
                                  })
                                }
                                w="full"
                              >
                                {PIPE_FITTING_OPTIONS.filter(
                                  (option) => !option.autoOnly || option.value === fitting.type
                                ).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Select>
                            </Stack>
                            <Stack w="80px" gap={1}>
                              <Text fontSize="sm" color="gray.500">
                                Count
                              </Text>
                              <NumberInput
                                min={0}
                                step={1}
                                isDisabled={isSwage}
                                value={fitting.count ?? 0}
                                onChange={(_, valueNumber) => {
                                  if (!Number.isFinite(valueNumber)) {
                                    return;
                                  }
                                  const normalized = Math.max(0, Math.floor(valueNumber));
                                  handleFittingFieldChange(index, {
                                    count: normalized,
                                    k_total: normalized * (fitting.k_each ?? 0),
                                  });
                                }}
                              >
                                <NumberInputField />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                            </Stack>
                            <IconButton
                              aria-label="Remove fitting"
                              icon={<CloseIcon />}
                              size="sm"
                              variant="ghost"
                              isDisabled={isSwage}
                              onClick={() => handleRemoveFitting(index)}
                            />
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
                <Stack gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    User K
                  </Text>
                  <Input
                    type="number"
                    step="any"
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
              <Text fontSize="sm" color="gray.500">
                Control Valve Calculation Mode
              </Text>
              <RadioGroup
                value={pipe.controlValve?.calculation_note || "cv_to_dp"}
                onChange={(value) => {
                  onUpdatePipe(pipe.id, {
                    controlValve: {
                      id: pipe.controlValve?.id || pipe.id,
                      tag: pipe.controlValve?.tag || pipe.id,
                      ...pipe.controlValve,
                      calculation_note: value,
                    },
                  });
                }}
              >
                <Stack direction="row">
                  <Radio value="cv_to_dp">{controlValveInputRadioLabel}</Radio>
                  <Radio value="dp_to_cv">{controlValveOutputRadioLabel}</Radio>
                </Stack>
              </RadioGroup>

              {isGasPipe && (
                <>
                  <Stack gap={1}>
                    <Text fontSize="sm" color="gray.500">
                      Gas Valve Constant (C1)
                    </Text>
                    <Input
                      type="number"
                      step="any"
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
                  <Stack gap={1}>
                    <Text fontSize="sm" color="gray.500">
                      Pressure Drop Ratio (xT)
                    </Text>
                    <Input
                      type="number"
                      step="any"
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
                  <Stack gap={1}>
                    <Text fontSize="sm" color="gray.500">
                      {controlValveCoefficientLabel}
                    </Text>
                    <Input
                      type="number"
                      step="any"
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
                  <Stack gap={1}>
                    <Text fontSize="sm" color="gray.500">
                      Calculated Pressure Drop
                    </Text>
                    <Stack direction="row" gap={2}>
                      <Input
                        type="number"
                        step="any"
                        value={controlValvePressureDropDisplayValue}
                        readOnly
                      />
                      <Select
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
                          <option key={unitOption} value={unitOption}>
                            {unitOption}
                          </option>
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
                  <Stack gap={1}>
                    <Text fontSize="sm" color="gray.500">
                      {controlValveCalculatedCoefficientLabel}
                    </Text>
                    <Input
                      type="number"
                      step="any"
                      value={controlValveCalculatedCoefficientValue}
                      readOnly
                    />
                  </Stack>
                </>
              )}
            </>
          )}

          {pipe?.pipeSectionType === "orifice" && (
            <>
              <Stack gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Beta Ratio (β = d / D)
                </Text>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="1"
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

              <Stack gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Calculated Pressure Drop
                </Text>
                <Stack direction="row" gap={2}>
                  <Input
                    type="number"
                    step="any"
                    value={orificePressureDropDisplayValue}
                    readOnly
                  />
                  <Select
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
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </Select>
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      )}

      {!node && !pipe && (
        <Box color="gray.500" fontSize="sm">
          Select a node or pipe to view or edit its values.
        </Box>
      )}
    </Stack>
  );
}
