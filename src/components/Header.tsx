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
      justify="center"
    >
      <Flex align="center" gap={4} w="100%" wrap={{ base: "wrap", md: "nowrap" }}>
        <Stack gap={1} flex="1 1 auto">
          <Heading size="lg">Pipeline Network Builder</Heading>
          <Text color="gray.600">
            Sketch networks, edit properties, then run the mock hydraulic solver.
          </Text>
        </Stack>

        <Button
          ml={{ base: 0, md: "auto" }}
          background={"#239BA7"}
          onClick={onSolve}
          isLoading={isSolving}
        >
          {isSolving ? "Solving..." : "Run hydraulic calculation"}
        </Button>
      </Flex>
    </Flex>
  );
}
