"use client";

import { NetworkState } from "./types";
import { BackendNetworkResult } from "./backendMockData";

export type HydraulicCalculationResponse = {
  network: NetworkState;
  backendResult: BackendNetworkResult;
};

export async function runHydraulicCalculation(
  network: NetworkState
): Promise<HydraulicCalculationResponse> {
  const response = await fetch("/api/hydraulics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(network),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to calculate hydraulics");
  }

  return response.json();
}
