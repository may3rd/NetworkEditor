"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
    </CacheProvider>
  );
}
