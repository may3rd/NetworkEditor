import configureMeasurements from "convert-units";
import pressure from "convert-units/definitions/pressure";
import allMeasures from "convert-units/definitions/all";
import { i } from "framer-motion/client";

export type UnitFamily = string;

const atmInkPa = 101.325;
const UNIT_ALIASES: Record<string, string> = {
  "tonn/day": "ton/day",
  "kg_cm2": "kg/cm2",
};

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
        to_anchor: {
          numerator: 1,
          denominator: 1e3,
        },
        anchor_shift: - 0.0146959487755,
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

const massDensityMeasure = {
  systems: {
    metric: {
      "kg/m3": {
        name: { singular: "Kilogram per cubic meter", plural: "Kilogram per cubic meter" },
        to_anchor: 1,
        },
      "kg/cm3": {
        name: { singular: "Kilogram per cubic centimeter", plural: "Kilogram per cubic centimeter" },
        to_anchor: 1000,
      },
      "g/cm3": {
        name: { singular: "Gram per cubic centimeter", plural: "Gram per cubic centimeter" },
        to_anchor: 1000,
      },
    },
    imperial: {
      "lb/ft3": {
        name: { singular: "Pound per cubic foot", plural: "Pound per cubic foot" },
        to_anchor: 1,
      },
      "lb/in3": {
        name: { singular: "Pound per cubic inch", plural: "Pound per cubic inch" },
        to_anchor: 1728,
      },
    }
  },
  anchors: {
    metric: {
      imperial: {
        ratio: {
          numerator: 1,
          denominator: 16.018463374,
        },
      }
    },
    imperial: {
      metric: {
        ratio: 16.018463374,
      }
    },
  }
};

const massFlowRateMeasure = {
  systems: {
    metric: {
      "kg/s": {
        name: { singular: "Kilogram per second", plural: "Kilogram per second" },
        to_anchor: 1,
      },
      "g/s": {
        name: { singular: "Gram per second", plural: "Gram per second" },
        to_anchor: {
          numerator: 1,
          denominator: 1000,
        },
      },
      "kg/hr": {
        name: { singular: "Kilogram per hour", plural: "Kilogram per hour" },
        to_anchor: {
          numerator: 1,
          denominator: 3600,
        },
        "ton/day": {
          name: { singular: "Ton per day", plural: "Tons per day" },
          to_anchor: {
            numerator: 1000,
            denominator: 86400,
          },
        }
      },
      "kg/h": {
        name: { singular: "Kilogram per hour", plural: "Kilogram per hour" },
        to_anchor: {
          numerator: 1,
          denominator: 3600,
        },
        "ton/day": {
          name: { singular: "Ton per day", plural: "Tons per day" },
          to_anchor: {
            numerator: 1000,
            denominator: 86400,
          },
        }
      },
    },
    imperial: {
      "lb/s": {
        name: { singular: "Pound per second", plural: "Pound per second" },
        to_anchor: 1,
      },
      "lb/min": {
        name: { singular: "Pound per minute", plural: "Pound per minute" },
        to_anchor: {
          numerator: 1,
          denominator: 60,
        },
      },
      "lb/hr": {
        name: { singular: "Pound per hour", plural: "Pound per hour" },
        to_anchor: {
          numerator: 1,
          denominator: 3600,
        },
      },
      "lb/h": {
        name: { singular: "Pound per hour", plural: "Pound per hour" },
        to_anchor: {
          numerator: 1,
          denominator: 3600,
        },
      },
    },
  },
  anchors: {
    metric: {
      imperial: {
        ratio: {
          numerator: 1,
          denominator: 0.45359237,
        },
      }
    },
    imperial: {
      metric: {
        ratio: 0.45359237,
      },
    },
  },
};

const convert = configureMeasurements({
  ...allMeasures,
  pressure: extendedPressure,
  viscosity: viscosityMeasure,
  massDensity: massDensityMeasure,
  massFlowRate: massFlowRateMeasure,
} as any);

export function normalizeUnit(unit?: string | null): string | undefined {
  if (!unit) return unit ?? undefined;
  const trimmed = unit.trim();
  return UNIT_ALIASES[trimmed] ?? trimmed;
}

export function convertUnit(value: number, fromUnit?: string, toUnit?: string, _family?: UnitFamily) {
  try {
    const normalizedFrom = normalizeUnit(fromUnit);
    const normalizedTo = normalizeUnit(toUnit);
    if (!normalizedFrom || !normalizedTo) {
      return value;
    }
    return convert(value).from(normalizedFrom).to(normalizedTo);
  } catch {
    return value;
  }
}
