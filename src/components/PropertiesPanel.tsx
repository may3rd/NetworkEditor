"use client";

import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { NetworkState, NodeProps, PipeProps, SelectedElement } from "@/lib/types";

type Props = {
  network: NetworkState;
  selected: SelectedElement;
  onUpdateNode: (id: string, patch: Partial<NodeProps>) => void;
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

  return (
    <Stack
      w="320px"
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      spacing={4}
    >
      <Heading size="md">Properties</Heading>

      {node && (
        <Stack spacing={3}>
          <Text fontWeight="semibold">{node.label}</Text>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Label
            </Text>
            <Input
              value={node.label}
              onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
            />
          </Stack>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Elevation (m)
            </Text>
            <Input
              type="number"
              value={node.elevation ?? ""}
              onChange={(event) =>
                onUpdateNode(node.id, { elevation: Number(event.target.value) })
              }
            />
          </Stack>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Demand (L/s)
            </Text>
            <Input
              type="number"
              value={node.demand ?? ""}
              onChange={(event) =>
                onUpdateNode(node.id, { demand: Number(event.target.value) })
              }
            />
          </Stack>
        </Stack>
      )}

      {pipe && (
        <Stack spacing={3}>
          <Text fontWeight="semibold">Pipe {pipe.id}</Text>
          <Text fontSize="sm" color="gray.500">
            {pipe.startNodeId} → {pipe.endNodeId}
          </Text>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Length (m)
            </Text>
            <Input
              type="number"
              value={pipe.length}
              onChange={(event) =>
                onUpdatePipe(pipe.id, { length: Number(event.target.value) })
              }
            />
          </Stack>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Diameter (mm)
            </Text>
            <Input
              type="number"
              value={pipe.diameter}
              onChange={(event) =>
                onUpdatePipe(pipe.id, { diameter: Number(event.target.value) })
              }
            />
          </Stack>

          <Stack spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Roughness
            </Text>
            <Input
              type="number"
              value={pipe.roughness}
              onChange={(event) =>
                onUpdatePipe(pipe.id, { roughness: Number(event.target.value) })
              }
            />
          </Stack>
        </Stack>
      )}

      {!node && !pipe && (
        <Box color="gray.500" fontSize="sm">
          Select a junction or pipe to edit its values.
        </Box>
      )}

      <Button onClick={onReset} variant="outline">
        Reset to starter network
      </Button>
    </Stack>
  );
}
