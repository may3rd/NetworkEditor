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
  fluid?: Fluid;
  rotation?: number; // 0, 90, 180, 270
};

export type pipeState = {
  pressure?: number, // State pressure in Pa
  temprature?: number, // State temperature in K
  density?: number, // State fluid density in kg/m3
  machNumber?: number, // State gas mach number in m/s (only gas)
  velocity?: number, // velocity of fluid at pipe diameter in m/s
  erosionalVelocity?: number // Erosional velocity in m/s
  flowMomentum?: number // flow momentum of fluid, rho * v ^2, in Pa
}

export type resultSummary = {
  inletState: pipeState,
  outletState: pipeState,
}

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

export type PipePatch = Partial<PipeProps> | ((pipe: PipeProps) => Partial<PipeProps>);

export type PipeSchedule =
  | "5"
  | "10"
  | "20"
  | "30"
  | "40"
  | "60"
  | "80"
  | "100"
  | "120"
  | "140"
  | "160"
  | "STD"
  | "XS"
  | "XXS"
  | "5S"
  | "10S"
  | "40S"
  | "80S";

export type PipeProps = {
  id: string;
  name?: string;
  description?: string;
  startNodeId: string;
  endNodeId: string;
  pipeSectionType?: "pipeline" | "control valve" | "orifice";
  pipeNPD?: number,
  pipeSchedule?: PipeSchedule,
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
  flow?: number;
  headLoss?: number;
  userSpecifiedPressureLoss?: number;
  userSpecifiedPressureLossUnit?: string;
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
  gasFlowModel?: "adiabatic" | "isothermal",
  boundaryPressure?: number,
  boundaryPressureUnit?: string,
  boundaryTemperature?: number,
  boundaryTemperatureUnit?: string,
  designMassFlowRate?: number,
  designMassFlowRateUnit?: string,
  designFlowRateDisplayUnit?: string,
  equivalentLength?: number,
  fluid?: Fluid;
  massFlowRate?: number;
  massFlowRateUnit?: string;
  designMargin?: number,
  controlValve?: ControlValve;
  orifice?: Orifice;
  pressureDropCalculationResults?: PressureDropCalculationResults;
  resultSummary?: resultSummary,
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
  tag?: string,
  cv?: number,
  cg?: number,
  pressureDrop?: number,
  pressureDropUnit?: string,
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
  // use a sharp-edged plate.
  id: string,
  tag?: string,
  betaRatio?: number, // d over D ratio
  pressureDrop?: number,
  pressureDropUnit?: string,
  dischargeCoefficient?: number,
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
  backgroundImage?: string;
  backgroundImageSize?: { width: number; height: number };
  backgroundImageOpacity?: number;
  backgroundImagePosition?: { x: number; y: number };
  backgroundImageLocked?: boolean;
};

const baseNetwork: NetworkState = {
  nodes: [
    {
      id: "n1",
      label: "A",
      position: { x: 0, y: 0 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 103.42,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n2",
      label: "B1",
      position: { x: 200, y: 0 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 103.42,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n3",
      label: "B2",
      position: { x: 400, y: 0 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 103.42,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n4",
      label: "D",
      position: { x: 600, y: 0 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 103.42,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "n5",
      label: "G1",
      position: { x: 0, y: 150 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 35.0,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
    {
      id: "n6",
      label: "G2",
      position: { x: 200, y: 150 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 35.0,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
    {
      id: "n7",
      label: "G3",
      position: { x: 400, y: 150 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 35.0,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
    {
      id: "n8",
      label: "G4",
      position: { x: 600, y: 150 },
      pressure: 101.08,
      pressureUnit: 'kPag',
      temperature: 35.0,
      temperatureUnit: 'C',
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
  ],
  pipes: [
    {
      id: "1",
      name: "P-001",
      description: "Pipeline 1",
      startNodeId: "n1",
      endNodeId: "n2",
      massFlowRate: 90513.6,
      massFlowRateUnit: "kg/h",
      diameter: 202.74,
      diameterUnit: "mm",
      length: 37.599,
      lengthUnit: "m",
      elevation: -23.59,
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 8,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "2",
      name: "P-002",
      description: "Pipeline 2",
      startNodeId: "n2",
      endNodeId: "n3",
      massFlowRate: 90513.6,
      massFlowRateUnit: "kg/h",
      diameter: 202.74,
      diameterUnit: "mm",
      length: 8.639,
      lengthUnit: "m",
      elevation: -3.208,
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 8,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "3",
      name: "P-003",
      description: "Pipeline 3",
      startNodeId: "n3",
      endNodeId: "n4",
      massFlowRate: 90513.6,
      massFlowRateUnit: "kg/h",
      diameter: 102.26,
      diameterUnit: "mm",
      length: 0.712,
      lengthUnit: "m",
      elevation: -0.712,
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 4,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "liquid",
        viscosity: 0.247,
        viscosityUnit: "cP",
        density: 783.4,
        densityUnit: "kg/m3",
      }
    },
    {
      id: "4",
      name: "P-004",
      description: "Pipeline 4",
      startNodeId: "n5",
      endNodeId: "n6",
      massFlowRate: 1000.0,
      massFlowRateUnit: "kg/h",
      gasFlowModel: "adiabatic",
      diameter: 102.26,
      diameterUnit: "mm",
      length: 1000.0,
      lengthUnit: "m",
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 4,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
    {
      id: "5",
      name: "P-005",
      description: "Pipeline 5",
      startNodeId: "n6",
      endNodeId: "n7",
      massFlowRate: 1000.0,
      massFlowRateUnit: "kg/h",
      gasFlowModel: "isothermal",
      diameter: 102.26,
      diameterUnit: "mm",
      length: 1000.0,
      lengthUnit: "m",
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 4,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
    },
    {
      id: "6",
      name: "P-006",
      description: "Pipeline 6",
      startNodeId: "n7",
      endNodeId: "n8",
      massFlowRate: 1000.0,
      massFlowRateUnit: "kg/h",
      gasFlowModel: "adiabatic",
      direction: "forward",
      diameter: 102.26,
      diameterUnit: "mm",
      length: 1000.0,
      lengthUnit: "m",
      elevationUnit: "m",
      diameterInputMode: "nps",
      pipeNPD: 4,
      pipeSchedule: "40",
      roughness: 0.0457,
      roughnessUnit: "mm",
      erosionalConstant: 100,
      fluid: {
        id: "HC",
        phase: "gas",
        viscosity: 0.012,
        viscosityUnit: "cP",
        molecularWeight: 28,
        zFactor: 0.9,
        specificHeatRatio: 1.3,
      },
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
      boundaryTemperature: boundaryNode?.temperature,
      boundaryTemperatureUnit: boundaryNode?.temperatureUnit,
      pipeSectionType: "pipeline" as const,
    };
  });

  return { nodes, pipes };
};

export const copyFluidFromNodeToPipe = (node: NodeProps, pipe: PipeProps) => {
  pipe.fluid = node.fluid ? { ...node.fluid } : undefined;
};

export const copyFluidFromPipeToNode = (pipe: PipeProps, node: NodeProps) => {
  if (!pipe.fluid) return;
  node.fluid = { ...pipe.fluid };
}

export type ViewSettings = {
  node: {
    name: boolean;
    pressure: boolean;
    temperature: boolean;
  };
  pipe: {
    name: boolean;
    length: boolean;
    deltaP: boolean;
    velocity: boolean;
    dPPer100m: boolean;
  };
};
