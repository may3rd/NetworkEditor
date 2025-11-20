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
};

export type PipeProps = {
  id: string;
  startNodeId: string;
  endNodeId: string;
  length: number;
  diameter: number;
  roughness: number;
  flow?: number;
  headloss?: number;
};

export type NetworkState = {
  nodes: NodeProps[];
  pipes: PipeProps[];
};

const baseNetwork: NetworkState = {
  nodes: [
    {
      id: "n1",
      label: "Source",
      elevation: 30,
      demand: 0,
      position: { x: 150, y: 220 },
    },
    {
      id: "n2",
      label: "J1",
      elevation: 15,
      demand: 6,
      position: { x: 420, y: 180 },
    },
    {
      id: "n3",
      label: "J2",
      elevation: 10,
      demand: 4,
      position: { x: 420, y: 320 },
    },
  ],
  pipes: [
    {
      id: "p1",
      startNodeId: "n1",
      endNodeId: "n2",
      length: 250,
      diameter: 150,
      roughness: 0.0457,
    },
    {
      id: "p2",
      startNodeId: "n1",
      endNodeId: "n3",
      length: 240,
      diameter: 150,
      roughness: 0.0457,
    },
    {
      id: "p3",
      startNodeId: "n2",
      endNodeId: "n3",
      length: 180,
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
