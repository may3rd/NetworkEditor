export type SelectedElement =
  | { type: "node"; id: string }
  | { type: "pipe"; id: string }
  | null;

export type Quantity = {
  value: number;
  unit: string;
};

export type Coordinate = {
  x: number;
  y: number;
};

export type NodeProps = {
  id: string;
  label: string;
  position: Coordinate;
  pressure?: number;
  pressureUnit?: string;
  temperature?: number;
  temperatureUnit?: string;
  fluid: Fluid,
};

// Pressure Drop Caculation Results
// All pressure drop values are in Pa.
export type PressureDropCalculationResults = {
  pipeLengthK?: number,
  fittingK?: number,
  userK?: number,
  pipingFittingSafetyFactor?: number,
  totalK?: number,
  reynoldsNumber?: number,
  frictionalFactor?: number,
  flowScheme?: string,
  pipeAndFittingPressureDrop?: number,
  elevationPressureDrop?: number,
  controlValvePressureDrop?: number,
  orificePressureDrop?: number,
  userSpecifiedPressureDrop?: number,
  totalSegmentPressureDrop?: number,
  normalizedPressureDrop?: number,
  gasFlowCriticalPressure?: number,
}

export type NodePatch = Partial<NodeProps> | ((node: NodeProps) => Partial<NodeProps>);

export type PipeProps = {
  id: string;
  startNodeId: string;
  endNodeId: string;
  pipeNPD?: number,
  pipeSchedule?: string,
  diameter?: number;
  diameterUnit?: string;
  diameterInputMode?: "nps" | "diameter";
  pipeDiameter?: number,
  pipeDiameterUnit?: string,
  inletDiameter?: number,
  inletDiameterUnit?: string,
  outletDiameter?: number,
  outletDiameterUnit?: string,
  roughness?: number;
  roughnessUnit?: string;
  length?: number;
  lengthUnit?: string;
  elevation?: number;
  elevationUnit?: string;
  flowAndFittingLoss?: number;
  headLoss?: number;
  fittingType?: string,
  fittings?: FittingType[];
  pipeLengthK?: number,
  fittingK?: number,
  userK?: number,
  pipingFittingSafetyFactor?: number,
  totalK?: number,
  erosionalConstant?: number,
  machNumber?: number,
  direction?: string,
  boundaryPressure?: number,
  boundaryPressureUnit?: string,
  designMassFlowRate?: number,
  designMassFlowRateUnit?: string,
  equivalentLength?: number,
  fluid?: Fluid;
  massFlowRate?: number;
  massFlowRateUnit?: string;
  designMargin?: number,
  controlValve?: ControlValve;
  orifice?: Orifice;
  pressureDropCalculationResults?: PressureDropCalculationResults;
};

// Fluid propertis
export type Fluid = {
  id: string,
  phase: string,
  viscosity?: number,
  viscosityUnit?: string,
  density?: number,
  densityUnit?: string,
  molecularWeight?: number,
  zFactor?: number,
  specificHeatRatio?: number,
  standardFlowRate?: number,
  vaporPressure?: number,
  criticalPressure?: number,
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
      position: { x: 150, y: 220 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 120,
      temperatureUnit: 'C',
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n2",
      label: "B1",
      position: { x: 300, y: 120 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 120,
      temperatureUnit: 'C',
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n3",
      label: "B2",
      position: { x: 450, y: 220 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 120,
      temperatureUnit: 'C',
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
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
      direction: "forward",
      boundaryPressure: 101.08,
      boundaryPressureUnit: "kPag",
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "p2",
      startNodeId: "n1",
      endNodeId: "n3",
      length: 240,
      lengthUnit: "m",
      diameter: 150,
      roughness: 0.0457,
      direction: "forward",
      boundaryPressure: 101.08,
      boundaryPressureUnit: "kPag",
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "p3",
      startNodeId: "n2",
      endNodeId: "n3",
      length: 180,
      lengthUnit: "m",
      diameter: 125,
      roughness: 0.0457,
      direction: "forward",
      boundaryPressure: 101.08,
      boundaryPressureUnit: "kPag",
      fluid: {
        id: "water",
        phase: "liquid",
        viscosity: 1.0,
        viscosityUnit: "cP",
        density: 1000,
        densityUnit: "kg/m3",
      }
    },
  ],
};

export const createInitialNetwork = (): NetworkState => {
  const nodes = baseNetwork.nodes.map(node => ({
    ...node,
    position: { ...node.position },
  }));

  const findNode = (id: string) => nodes.find(node => node.id === id);

  const pipes = baseNetwork.pipes.map(pipe => {
    const direction = pipe.direction ?? "forward";
    const boundaryNode = direction === "forward" ? findNode(pipe.startNodeId) : findNode(pipe.endNodeId);

    return {
      ...pipe,
      direction,
      boundaryPressure: boundaryNode?.pressure,
      boundaryPressureUnit: boundaryNode?.pressureUnit,
    };
  });

  return { nodes, pipes };
};

export const copyFluidFromNodeToPipe = (node: NodeProps, pipe: PipeProps) => {
  pipe.fluid = { ...node.fluid };
};

export const copyFluidFromPipeToNode = (pipe: PipeProps, node: NodeProps) => {
  if (!pipe.fluid) return;
  node.fluid = { ...pipe.fluid };
}
