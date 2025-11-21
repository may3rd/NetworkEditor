export const lengthUnits = {
  m: {
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  km: {
    toBase: (v: number) => v * 1000,
    fromBase: (v: number) => v / 1000,
  },
  ft: {
    toBase: (v: number) => v * 0.3048,
    fromBase: (v: number) => v / 0.3048,
  },
};