export type SelectedElement =
  | { type: "node"; id: string }
  | { type: "pipe"; id: string }
  | null;

export type Coordinate = {
  x: number;
  y: number;
};

export type NodeProps = {
  id: string;
  label: string;
  position: Coordinate;
  elevation?: number;
  demand?: number;
  pressure?: number;
  fluid?: Fluid;
  controlValve?: ControlValve;
  orifice?: Orifice;
};

export type PipeProps = {
  id: string;
  startNodeId: string;
  endNodeId: string;
  diameter?: number;
  pipeDiameter?: number,
  inlteDiameter?: number,
  outletDiameter?: number,
  roughness?: number;
  length?: number;
  lengthUnit?: string;
  elevation?: number;
  flow?: number;
  headloss?: number;
  fluid?: Fluid;
  fittingType?: string,
  fittings?: FittingType[];
  pipeLengthK?: number,
  fittingK?: number,
  userK?: number,
  pipingFittingSafetyFactor?: number,
  totalK?: number,
  pipeNPD?: number,
  designMargin?: number,
  erosionalConstant?: number,
  machNumber?: number,
  boundaryPressure?: number,
  designMassFlowRate?: number,
  equivalentLength?: number,
};

// Fluid propertis
export type Fluid = {
  id: string,
  phase: string,
  viscosity: number,
  density: number,
  molecularWeight: number,
  zFactor: number,
  specificHeatRatio: number,
  standardFlowRate: number,
  vaporPressure: number,
  criticalPressure: number,
}

// Hydraulic Loss Components
export type ControlValve = {
  id: string,
  tag: string,
  cv?: number,
  cg?: number,
  pressure_drop?: number,
  C1?: number,
  FL?: number,
  Fd?: number,
  xT?: number,
  inlet_diameter?: number,
  outlet_diameter?: number,
  valve_diameter?: number,
  calculation_note?: string,
  adjustable?: boolean,
}

export type Orifice = {
  id: string,
  tag?: string,
  d_over_D_ratio?: number,
  pressure_drop?: number,
  pipe_diameter?: number,
  orifice_diameter?: number,
  meter_type?: string,
  taps?: string,
  tap_position?: string,
  discharge_coefficient?: number,
  expansibility?: number,
  calculation_note?: string,
}

export type FittingType = {
  type: string;
  count: number;
  k_each: number;
  k_total: number;
}

export type NetworkState = {
  nodes: NodeProps[];
  pipes: PipeProps[];
};

const baseNetwork: NetworkState = {
  nodes: [
    {
      id: "n1",
      label: "A",
      elevation: 30,
      demand: 0,
      position: { x: 150, y: 220 },
    },
    {
      id: "n2",
      label: "B1",
      elevation: 15,
      demand: 6,
      position: { x: 300, y: 120 },
    },
    {
      id: "n3",
      label: "B2",
      elevation: 10,
      demand: 4,
      position: { x: 450, y: 220 },
    },
  ],
  pipes: [
    {
      id: "p1",
      startNodeId: "n1",
      endNodeId: "n2",
      length: 250,
      lengthUnit: "m",
      diameter: 150,
      roughness: 0.0457,
    },
    {
      id: "p2",
      startNodeId: "n1",
      endNodeId: "n3",
      length: 240,
      lengthUnit: "m",
      diameter: 150,
      roughness: 0.0457,
    },
    {
      id: "p3",
      startNodeId: "n2",
      endNodeId: "n3",
      length: 180,
      lengthUnit: "m",
      diameter: 125,
      roughness: 0.0457,
    },
  ],
};

export const createInitialNetwork = (): NetworkState => ({
  nodes: baseNetwork.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  })),
  pipes: baseNetwork.pipes.map((pipe) => ({ ...pipe })),
});
