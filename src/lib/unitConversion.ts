export type UnitFamily =
  | "length"
  | "pressure"
  | "temperature"
  | "massFlowrate"
  | "volumeFlowrate"
  | "smallLength"
  | "smallPressure"
  | "viscosity";

type UnitDefinition = {
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
};

type UnitRegistry = Record<UnitFamily, Record<string, UnitDefinition>>;

const identityUnit: UnitDefinition = {
  toBase: (value: number) => value,
  fromBase: (value: number) => value,
};

const registry: UnitRegistry = {
  length: {
    m: identityUnit,
    mm: {
      toBase: (v: number) => v * 1000,
      fromBase: (v: number) => v / 1000,
    },
    cm: {
      toBase: (v: number) => v * 100,
      fromBase: (v: number) => v / 100,
    },
    km: {
      toBase: (v: number) => v * 1000,
      fromBase: (v: number) => v / 1000,
    },
    ft: {
      toBase: (v: number) => v * 0.3048,
      fromBase: (v: number) => v / 0.3048,
    },
  },
  pressure: {
    pa: identityUnit,
  },
  temperature: {
    k: identityUnit,
    c: {
      toBase: (v: number) => v + 273.15,
      fromBase: (v: number) => v - 273.15,
    },
    f: {
      toBase: (v: number) => ((v - 32) * 5) / 9 + 273.15,
      fromBase: (v: number) => ((v - 273.15) * 9) / 5 + 32,
    },
    r: {
      toBase: (v: number) => (v * 5) / 9,
      fromBase: (v: number) => (v * 9) / 5,
    },
  },
  massFlowrate: {
    kg_s: identityUnit,
  },
  volumeFlowrate: {
    m3_s: identityUnit,
  },
  smallLength: {
    mm: identityUnit,
  },
  smallPressure: {
    kpa: identityUnit,
  },
  viscosity: {
    cp: identityUnit,
  },
};

export function convertUnit({
  value,
  fromUnit,
  toUnit,
  family = "length",
}: {
  value: number;
  fromUnit: string;
  toUnit: string;
  family?: UnitFamily;
}): number {
  const familyRegistry = registry[family];
  if (!familyRegistry) return value;

  const from = familyRegistry[fromUnit];
  const to = familyRegistry[toUnit];

  if (!from || !to) return value;

  const baseValue = from.toBase(value);
  return to.fromBase(baseValue);
}

export function registerUnits(family: UnitFamily, units: Record<string, UnitDefinition>) {
  registry[family] = {
    ...registry[family],
    ...units,
  };
}
