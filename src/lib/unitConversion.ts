import configureMeasurements from "convert-units";
import pressure from "convert-units/definitions/pressure";
import allMeasures from "convert-units/definitions/all";

export type UnitFamily = string;

const atmInkPa = 101.325;

const extendedPressure = {
  systems: {
    metric: {
      ...pressure.systems.metric,
      Pag: {
        name: { singular: 'Pascal Gauge', plural: 'Pascals Gauge' },
        to_anchor: {
          numerator: 1,
          denominator: 1e3,
        },
        anchor_shift: - atmInkPa,
      },
      kPag: {
        name: { singular: 'Kilopascal Gauge', plural: 'Kilopascal Gauge' },
        to_anchor: {
          numerator: 1,
          denominator: 1,
        },
        anchor_shift: - atmInkPa,
      },
      barg: {
        name: { singular: 'Bar Gauge', plural: 'Bars Gauge' },
        to_anchor: 100,
        anchor_shift: - atmInkPa,
      },
      ksc: {
        name: { singular: 'Kilogram per square centimeter', plural: 'Kilogram per square centimeter' },
        to_anchor: 98.0665,
      },
      'kg/cm2': {
        name: { singular: 'Kilogram per square centimeter', plural: 'Kilogram per square centimeter' },
        to_anchor: 98.0665,
      },
      kscg: {
        name: { singular: 'Kilogram per cubic centimeter gauge', plural: 'Kilogram per cubic centimeter gauge' },
        to_anchor: 98.0665,
        anchor_shift: - atmInkPa,
      },
      'kg/cm2g': {
        name: { singular: 'Kilogram per cubic centimeter gauge', plural: 'Kilogram per cubic centimeter gauge' },
        to_anchor: 98.0665,
        anchor_shift: - atmInkPa,
      },
      atm: {
        name: { singular: 'Atmospheric', plural: 'Atmospheric' },
        to_anchor: atmInkPa,
      },
      mmH2O: {
        name: { singular: 'Millimeter of Water', plural: 'Millimeter of Water' },
        to_anchor: 9.80665e-3,
      },
    },
    imperial: {
      ...pressure.systems.imperial,
      psig: {
        name: { singular: 'PSI Gauge', plural: 'PSI Gauge' },
        to_anchor: 6894.75729,
        anchor_shift: - atmInkPa,
      },
    },
  },
  anchors: { ...pressure.anchors },
};

const viscosityMeasure = {
  systems: {
    metric: {
      "Pa.s": {
        name: { singular: "Pascal-second", plural: "Pascal-seconds" },
        to_anchor: 1,
      },
      Poise: {
        name: { singular: "Poise", plural: "Poises" },
        to_anchor: 0.1,
      },
      cP: {
        name: { singular: "Centipoise", plural: "Centipoise" },
        to_anchor: 0.001,
      },
    },
  },
};

const convert = configureMeasurements({
  ...allMeasures,
  pressure: extendedPressure,
  viscosity: viscosityMeasure,
} as any);

export function convertUnit(value: number, fromUnit: string, toUnit: string, _family?: UnitFamily) {
  try {
    return convert(value).from(fromUnit).to(toUnit);
  } catch {
    return value;
  }
}
