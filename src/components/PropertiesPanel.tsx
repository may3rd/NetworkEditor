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
import { FittingType, NetworkState, NodeProps, NodePatch, PipeProps, SelectedElement } from "@/lib/types";

const FITTING_TYPE_OPTIONS = ["SCRD", "LR", "SR"] as const;

type Props = {
  network: NetworkState;
  selected: SelectedElement;
  onUpdateNode: (id: string, patch: NodePatch) => void;
  onUpdatePipe: (id: string, patch: Partial<PipeProps>) => void;
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
              unit={node.temperatureUnit ?? "°C"}
              units={QUANTITY_UNIT_OPTIONS.temperature}
              unitFamily="temperature"
              onValueChange={(newValue) => onUpdateNode(node.id, { temperature: newValue })}
              onUnitChange={(newUnit) => onUpdateNode(node.id, { temperatureUnit: newUnit })}
            />

            <QuantityInput
              label="Pressure"
              value={node.pressure ?? ""}
              unit={node.pressureUnit ?? "kPag"}
              units={QUANTITY_UNIT_OPTIONS.pressure}
              unitFamily="pressure"
              onValueChange={(newValue) => onUpdateNode(node.id, { pressure: newValue })}
              onUnitChange={(newUnit) => onUpdateNode(node.id, { pressureUnit: newUnit })}
            />
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
                  {pipeFittings.map((fitting, index) => (
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
                          onChange={(event) =>
                            handleFittingFieldChange(index, {
                              type: event.target.value,
                              k_each: 0,
                              k_total: 0,
                            })
                          }
                          w="full"
                        >
                          {PIPE_FITTING_OPTIONS.map((option) => (
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
                        onClick={() => handleRemoveFitting(index)}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>

        </Stack>
      )}

      {!node && !pipe && (
        <Box color="gray.500" fontSize="sm">
          Select a node or pipe to view or edit its values.
        </Box>
      )}

      <Button onClick={onReset} variant="outline">
        Reset to starter network
      </Button>
    </Stack>
  );
}
