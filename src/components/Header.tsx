"use client";

import { Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";

type Props = {
  onSolve: () => void;
  isSolving: boolean;
};

export function Header({ onSolve, isSolving }: Props) {
  return (
    <Flex
      direction="column"
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={6}
      gap={4}
    >
      <Stack spacing={1}>
        <Heading size="lg">Pipeline Network Builder</Heading>
        <Text color="gray.600">
          Sketch networks, edit properties, then run the mock hydraulic solver.
        </Text>
      </Stack>

      <Flex gap={3} wrap="wrap">
        <Button onClick={onSolve} colorScheme="teal" isLoading={isSolving}>
          {isSolving ? "Solving..." : "Run hydraulic calculation"}
        </Button>
      </Flex>
    </Flex>
  );
}
