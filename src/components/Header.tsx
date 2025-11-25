"use client";

import { Button, Flex, Heading, Stack, Text, Box, ButtonGroup } from "@chakra-ui/react";

type Props = {
  onSolve: () => void;
  onReset: () => void;
  onClearNetwork: () => void;
  onExportPng: () => void;
  onLoadNetwork: () => void;
  onSaveNetwork: () => void;
  isSolving: boolean;
  lastSolvedAt: string | null;
};

export function Header({ onSolve, onReset, onClearNetwork, onExportPng, onLoadNetwork, onSaveNetwork, isSolving, lastSolvedAt }: Props) {
  return (
    <Flex
      direction="column"
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={6}
      gap={4}
      justify="center"
    >
      <Flex align="center" gap={4} w="100%" wrap={{ base: "wrap", md: "nowrap" }}>
        <Stack gap={1} flex="1 1 auto">
          <Heading size="lg">Pipeline Network Builder</Heading>
          <Text color="gray.600">
            Sketch networks, edit properties, then run the mock hydraulic solver.
          </Text>
        </Stack>

        <Flex ml={{ base: 0, md: "auto" }} align="flex-start" gap={4} wrap={{ base: "wrap", md: "nowrap" }} justify="flex-end">
          <ButtonGroup variant="outline" size="sm" marginRight={"8"}>
            <Button onClick={onClearNetwork} background={"red.400"} color="white" _hover={{ background: "red.500" }}>
              Clear network
            </Button>
            <Button onClick={onReset} marginRight={"4"} background={"orange"}>Load default</Button>
            <Button onClick={() => window.print?.()}>Print</Button>
            <Button onClick={onExportPng}>Export PNG</Button>
            <Button onClick={onLoadNetwork}>Load .nhf</Button>
            <Button onClick={onSaveNetwork}>Save .nhf</Button>
          </ButtonGroup>

          <Stack align={{ base: "stretch", md: "flex-end" }}>
            <Button
              size="sm"
              background={"#239BA7"}
              color="white"
              _hover={{ background: "#1d7b85" }}
              onClick={onSolve}
              isLoading={isSolving}
              loadingText="Solving..."
            >
              Run hydraulic calculation
            </Button>
            <Box textAlign="center" minH="1.2em">
              {lastSolvedAt && (
                <Text fontSize="xs" color="gray.500">
                  Last solved: {lastSolvedAt}
                </Text>
              )}
            </Box>
          </Stack>
        </Flex>
      </Flex>
    </Flex>
  );
}
