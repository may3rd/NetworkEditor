import { NetworkState } from "./types";

export type BackendStatePoint = {
  pressure: number | null;
  temperature: number | null;
  density: number | null;
  velocity: number | null;
  remarks: string | null;
};

export type BackendPressureDrop = {
  total: number;
  per_100m: number;
  fitting_breakdown: Array<{
    type: string;
    count: number;
    k_each: number;
    k_total: number;
  }>;
};

export type BackendSectionResult = {
  id: string;
  description?: string | null;
  schedule: string;
  pipe_NPD: number;
  length_m: number;
  calculation: {
    pressure_drop: BackendPressureDrop;
    summary: {
      inlet: BackendStatePoint;
      outlet: BackendStatePoint;
    };
    flow: {
      volumetric_actual: number;
    };
  };
};

export type BackendNetworkResult = {
  network: {
    name: string;
    description: string;
    boundary_pressure_kpa: number;
  };
  sections: BackendSectionResult[];
  node_pressures: Record<string, number>;
};

const MOCK_BACKEND_RESULT: BackendNetworkResult = {
  network: {
    name: "sample_network",
    description: "Phenol Test",
    boundary_pressure_kpa: 101.008,
  },
  node_pressures: {
    n1: 101.008,
    n2: 279.513,
    n3: 296.03,
  },
  sections: [
    {
      id: "1",
      description: "Line 1",
      schedule: "40",
      pipe_NPD: 8,
      length_m: 37.599,
      calculation: {
        flow: { volumetric_actual: 115.539 },
        pressure_drop: {
          total: -178.5052392819831,
          per_100m: 7.249219973714446,
          fitting_breakdown: [
            {
              type: "elbow_90",
              count: 9,
              k_each: 0.22619438224751157,
              k_total: 2.035749440227604,
            },
            { type: "tee_elbow", count: 1, k_each: 0.4512511051438049, k_total: 0.4512511051438049 },
            {
              type: "pipe_entrance_normal",
              count: 1,
              k_each: 0.5002275318702436,
              k_total: 0.5002275318702436,
            },
          ],
        },
        summary: {
          inlet: {
            pressure: 101.008,
            temperature: 103.42,
            density: 783.4,
            velocity: 1.0935828477488336,
            remarks: "OK",
          },
          outlet: {
            pressure: 279.5132392819831,
            temperature: 103.42,
            density: 783.4,
            velocity: 1.0935828477488336,
            remarks: "OK",
          },
        },
      },
    },
    {
      id: "2",
      description: "Reducer",
      schedule: "40",
      pipe_NPD: 8,
      length_m: 8.639,
      calculation: {
        flow: { volumetric_actual: 115.539 },
        pressure_drop: {
          total: -16.516777344657456,
          per_100m: 35.2908628802239,
          fitting_breakdown: [
            {
              type: "elbow_90",
              count: 3,
              k_each: 0.22624855650233147,
              k_total: 0.6787456695069944,
            },
            { type: "tee_elbow", count: 1, k_each: 0.45130527939862486, k_total: 0.45130527939862486 },
            {
              type: "block_valve_full_line_size",
              count: 1,
              k_each: 0.11297529905041098,
              k_total: 0.11297529905041098,
            },
            {
              type: "outlet_swage",
              count: 1,
              k_each: 5.247304995054465,
              k_total: 5.247304995054465,
            },
          ],
        },
        summary: {
          inlet: {
            pressure: 279.5132392819831,
            temperature: 103.42,
            density: 783.4,
            velocity: 1.043874536487523,
            remarks: "OK",
          },
          outlet: {
            pressure: 296.0300166266406,
            temperature: 103.42,
            density: 783.4,
            velocity: 1.043874536487523,
            remarks: "OK",
          },
        },
      },
    },
    {
      id: "41",
      description: "Drop leg",
      schedule: "40",
      pipe_NPD: 4,
      length_m: 0.708,
      calculation: {
        flow: { volumetric_actual: 115.539 },
        pressure_drop: {
          total: -0.4725,
          per_100m: 66.78,
          fitting_breakdown: [],
        },
        summary: {
          inlet: {
            pressure: 296.03,
            temperature: 103.42,
            density: 783.4,
            velocity: 3.0,
            remarks: "OK",
          },
          outlet: {
            pressure: 296.5,
            temperature: 103.42,
            density: 783.4,
            velocity: 3.0,
            remarks: "OK",
          },
        },
      },
    },
  ],
};

const pipeSectionLookup: Record<string, string> = {
  p1: "1",
  p2: "2",
  p3: "41",
};

export type MockHydraulicResponse = {
  network: NetworkState;
  backendResult: BackendNetworkResult;
};

export function runBackendMock(network: NetworkState): MockHydraulicResponse {
  const nodes = network.nodes.map((node) => ({
    ...node,
    pressure:
      MOCK_BACKEND_RESULT.node_pressures[node.id] ??
      node.pressure ??
      MOCK_BACKEND_RESULT.network.boundary_pressure_kpa,
  }));

  const pipes = network.pipes.map((pipe) => {
    const section = MOCK_BACKEND_RESULT.sections.find(
      (entry) => entry.id === pipe.id || entry.id === pipeSectionLookup[pipe.id]
    );

    const flow = section?.calculation.flow.volumetric_actual ?? pipe.flow ?? 0;
    const headLoss = section ? Math.abs(section.calculation.pressure_drop.total) : pipe.headLoss ?? 0;

    return {
      ...pipe,
      flow,
      headLoss,
    };
  });

  return {
    network: { nodes, pipes },
    backendResult: MOCK_BACKEND_RESULT,
  };
}
