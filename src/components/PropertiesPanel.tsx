"use client";

import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "./QuantityInput";
import {
  PIPE_SCHEDULES,
  getScheduleEntries,
  nearest_pipe_diameter,
  normalizeSchedule,
  type PipeSchedule,
} from "./PipeDimension";
import { Box, Button, Heading, Input, Radio, RadioGroup, Select, Stack, Text } from "@chakra-ui/react";
import { NetworkState, NodeProps, NodePatch, PipeProps, SelectedElement } from "@/lib/types";

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

          // TODO: input for pipe fittings, includes
          // Fitting Type: ["SCRD", "LR", "SR"] - default "LR"
          // Fittings List - Add / Reset.
          // Each fitting contians Type, Count, and delete button (icon). Type is dropdown list, count is integer input.
          // fitting type is [elbow_45,elbow_90,u_bend,stub_in_elbow,tee_elbow,tee_through,block_valve_full_line_size,block_valve_reduced_trim_0.9d,block_valve_reduced_trim_0.8d,globe_valve,diaphragm_valve,butterfly_valve,check_valve_swing,lift_check_valve,tilting_check_valve,pipe_entrance_normal,pipe_entrance_raise,pipe_exit]
          // keep the fitting type list in PipeDimension.tsx, use elbow_90, elbow_45, ... when render network but in drop down list shown is 'Elbow 45' or 'Elbow 90', ...

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
