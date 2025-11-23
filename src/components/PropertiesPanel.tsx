"use client";

import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "./QuantityInput";
import { Box, Button, Heading, Input, Radio, RadioGroup, Stack, Text } from "@chakra-ui/react";
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
            // TODO: add input for Gas Molecular Weight, Z factor, Specific Heat Ratio, hidden if liquid is selected.

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

          <QuantityInput
            label="Length"
            value={pipe.length ?? ""}
            unit={pipe.lengthUnit ?? "m"}
            units={QUANTITY_UNIT_OPTIONS.length}
            unitFamily="length"
            onValueChange={(newValue) => onUpdatePipe(pipe.id, { length: newValue })}
            onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { lengthUnit: newUnit })}
          />

          <QuantityInput
            label="Diameter"
            value={pipe.diameter ?? ""}
            unit={pipe.diameterUnit ?? "mm"}
            units={["mm", "cm", "in"]}
            unitFamily="diameter"
            onValueChange={(newValue) => onUpdatePipe(pipe.id, { diameter: newValue })}
            onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { diameterUnit: newUnit })}
          />

          <QuantityInput
            label="Pipe Roughness"
            value={pipe.roughness ?? ""}
            unit={pipe.roughnessUnit ?? "mm"}
            units={["mm", "cm", "m", "ft", "in"]}
            unitFamily="roughness"
            onValueChange={(newValue) => onUpdatePipe(pipe.id, { roughness: newValue })}
            onUnitChange={(newUnit) => onUpdatePipe(pipe.id, { roughnessUnit: newUnit })}
          />

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
