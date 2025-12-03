import { PipeProps, Fluid } from "@/lib/types";
import { computeErosionalVelocity } from "@/lib/calculations/utils";

export type CriteriaStatus = 'ok' | 'warning' | 'error';

export interface CriteriaCheckResult {
    status: CriteriaStatus;
    message?: string;
    limit?: number;
    limitType?: 'velocity' | 'pressureDrop' | 'erosional';
}

export interface PipeStatus {
    velocityStatus: CriteriaCheckResult;
    pressureDropStatus: CriteriaCheckResult;
}

// --- Data Structures ---

interface VelocityRange {
    min: number;
    max: number;
}

interface PressureDropRange {
    min?: number;
    max: number;
}

interface CriteriaRule {
    serviceType: string;
    subType?: string; // e.g., "Main header", "Branch lines"
    minDiameter?: number; // in inches
    maxDiameter?: number; // in inches
    velocity?: VelocityRange | number; // Max velocity or range
    pressureDrop?: PressureDropRange | number; // Max pressure drop or range (bar/100m)
    note?: string;
}

// Helper to parse diameter ranges from string descriptions (simplified for now)
// We will define rules explicitly based on the tables.

const LIQUID_CRITERIA: CriteriaRule[] = [
    // Pump suction
    { serviceType: "Pump suction", maxDiameter: 2, velocity: { min: 0.45, max: 0.75 } },
    { serviceType: "Pump suction", minDiameter: 3, maxDiameter: 10, velocity: { min: 0.60, max: 1.20 } },
    { serviceType: "Pump suction", minDiameter: 12, velocity: { min: 0.90, max: 1.85 } },

    // Pump discharge
    { serviceType: "Pump discharge", maxDiameter: 2, velocity: { min: 1.20, max: 2.75 }, pressureDrop: { min: 0.34, max: 0.68 } },
    { serviceType: "Pump discharge", minDiameter: 3, maxDiameter: 10, velocity: { min: 1.50, max: 3.65 }, pressureDrop: { min: 0.34, max: 0.68 } },
    { serviceType: "Pump discharge", minDiameter: 12, velocity: { min: 2.45, max: 4.55 }, pressureDrop: { min: 0.34, max: 0.68 } },

    // General Process Liquid
    { serviceType: "General process liquid", maxDiameter: 1, velocity: { min: 0.8, max: 1.4 }, pressureDrop: 0.56 },
    { serviceType: "General process liquid", minDiameter: 2, maxDiameter: 2, velocity: { min: 1.1, max: 1.9 }, pressureDrop: 0.56 },
    { serviceType: "General process liquid", minDiameter: 3, maxDiameter: 3, velocity: { min: 1.4, max: 2.2 }, pressureDrop: 0.56 },
    { serviceType: "General process liquid", minDiameter: 4, maxDiameter: 4, velocity: { min: 1.7, max: 2.8 }, pressureDrop: 0.56 },
    { serviceType: "General process liquid", minDiameter: 6, maxDiameter: 6, velocity: { min: 2.0, max: 3.1 }, pressureDrop: 0.46 },
    { serviceType: "General process liquid", minDiameter: 8, maxDiameter: 8, velocity: { min: 2.2, max: 3.9 }, pressureDrop: 0.46 },
    { serviceType: "General process liquid", minDiameter: 10, velocity: { min: 3.0, max: 4.6 }, pressureDrop: 0.46 },

    // Drains
    { serviceType: "Drains", maxDiameter: 2, velocity: { min: 0.9, max: 1.2 } },
    { serviceType: "Drains", minDiameter: 3, maxDiameter: 10, velocity: { min: 0.9, max: 1.5 } },

    // Amine
    { serviceType: "Amine", subType: "Carbon steel", velocity: 2 },
    { serviceType: "Amine", subType: "Stainless steel", velocity: 3 },

    // Boiler feed water
    { serviceType: "Boiler feed water", maxDiameter: 2, velocity: { min: 1.20, max: 2.75 } },
    { serviceType: "Boiler feed water", minDiameter: 3, maxDiameter: 10, velocity: { min: 1.50, max: 3.65 } },
    { serviceType: "Boiler feed water", minDiameter: 12, velocity: { min: 2.45, max: 4.25 } },

    // Cooling water
    { serviceType: "Cooling water", subType: "Main header", velocity: 3.7, pressureDrop: { min: 0.23, max: 0.34 } },
    { serviceType: "Cooling water", subType: "Branch lines", velocity: { min: 3.7, max: 4.8 }, pressureDrop: { min: 0.34, max: 0.68 } },

    // Reboiler
    { serviceType: "Reboiler", subType: "Trap-out lines", velocity: { min: 0.30, max: 1.22 }, pressureDrop: 0.035 },
    { serviceType: "Reboiler", subType: "Return lines", velocity: { min: 10.5, max: 13.5 }, pressureDrop: 0.07 },
];

const VAPOR_CRITERIA: CriteriaRule[] = [
    // Saturated Vapor (< 3.45 barg)
    { serviceType: "Saturated Vapor (Low P)", maxDiameter: 2, velocity: { min: 13.5, max: 30.5 } },
    { serviceType: "Saturated Vapor (Low P)", minDiameter: 3, maxDiameter: 6, velocity: { min: 15, max: 36.5 } },
    { serviceType: "Saturated Vapor (Low P)", minDiameter: 8, maxDiameter: 18, velocity: { min: 20, max: 41 } },
    { serviceType: "Saturated Vapor (Low P)", minDiameter: 20, velocity: { min: 24.5, max: 42.5 } },

    // Superheated Vapor (3.45 - 10.34 barg)
    { serviceType: "Superheated Vapor (Med P)", maxDiameter: 2, velocity: { min: 12, max: 24.5 } },
    { serviceType: "Superheated Vapor (Med P)", minDiameter: 3, maxDiameter: 6, velocity: { min: 13.5, max: 36.5 } },
    { serviceType: "Superheated Vapor (Med P)", minDiameter: 8, maxDiameter: 18, velocity: { min: 24.5, max: 64 } },
    { serviceType: "Superheated Vapor (Med P)", minDiameter: 20, velocity: { min: 36.5, max: 67 } },

    // Superheated Vapor (> 10.34 barg)
    { serviceType: "Superheated Vapor (High P)", maxDiameter: 2, velocity: { min: 9, max: 18.5 } },
    { serviceType: "Superheated Vapor (High P)", minDiameter: 3, maxDiameter: 6, velocity: { min: 10.5, max: 27.5 } },
    { serviceType: "Superheated Vapor (High P)", minDiameter: 8, maxDiameter: 18, velocity: { min: 20, max: 49 } },
    { serviceType: "Superheated Vapor (High P)", minDiameter: 20, velocity: { min: 30.5, max: 52 } },
];

// --- Helper Functions ---

function getDiameterInInches(diameterMm: number): number {
    return diameterMm / 25.4;
}

function checkVelocity(value: number, rule: CriteriaRule): CriteriaCheckResult {
    let maxLimit = 0;
    let minLimit = 0;

    if (typeof rule.velocity === 'number') {
        maxLimit = rule.velocity;
    } else if (rule.velocity) {
        maxLimit = rule.velocity.max;
        minLimit = rule.velocity.min;
    }

    if (maxLimit > 0 && value > maxLimit) {
        return { status: 'warning', message: `Velocity exceeds recommended limit of ${maxLimit} m/s`, limit: maxLimit, limitType: 'velocity' };
    }
    if (minLimit > 0 && value < minLimit) {
        return { status: 'warning', message: `Velocity below recommended limit of ${minLimit} m/s`, limit: minLimit, limitType: 'velocity' };
    }
    return { status: 'ok' };
}

function checkPressureDrop(value: number, rule: CriteriaRule): CriteriaCheckResult {
    let maxLimit = 0;
    let minLimit = 0;

    if (typeof rule.pressureDrop === 'number') {
        maxLimit = rule.pressureDrop;
    } else if (rule.pressureDrop) {
        maxLimit = rule.pressureDrop.max;
        minLimit = rule.pressureDrop.min || 0;
    }

    if (maxLimit > 0 && value > maxLimit) {
        return { status: 'warning', message: `Pressure drop exceeds recommended limit of ${maxLimit} bar/100m`, limit: maxLimit, limitType: 'pressureDrop' };
    }
    if (minLimit > 0 && value < minLimit) {
        return { status: 'warning', message: `Pressure drop below recommended limit of ${minLimit} bar/100m`, limit: minLimit, limitType: 'pressureDrop' };
    }
    return { status: 'ok' };
}

export function getPipeStatus(pipe: PipeProps): PipeStatus {
    const result: PipeStatus = {
        velocityStatus: { status: 'ok' },
        pressureDropStatus: { status: 'ok' }
    };

    if (!pipe.serviceType || !pipe.diameter || !pipe.velocity) {
        return result;
    }

    // 1. Check Erosional Velocity (Error)
    const density = pipe.fluid?.density; // Assuming density is available in pipe.fluid or we need to pass it
    const erosionalConstant = pipe.erosionalConstant ?? 100;

    if (density) {
        const erosionalVelocity = computeErosionalVelocity(density, erosionalConstant);
        if (typeof erosionalVelocity === 'number' && pipe.velocity > erosionalVelocity) {
            result.velocityStatus = {
                status: 'error',
                message: `Velocity exceeds erosional limit of ${erosionalVelocity.toFixed(2)} m/s`,
                limit: erosionalVelocity,
                limitType: 'erosional'
            };
            // If error, we can return immediately or continue to check pressure drop?
            // Let's continue to check pressure drop, but velocity status is already error.
        }
    }

    // 2. Find matching rule
    const diameterInches = getDiameterInInches(pipe.diameter);
    let rules = LIQUID_CRITERIA;
    if (pipe.fluid?.phase === 'gas') {
        rules = VAPOR_CRITERIA;
    }

    const rule = rules.find(r => {
        if (r.serviceType !== pipe.serviceType) return false;
        // Check diameter range
        if (r.minDiameter && diameterInches < r.minDiameter) return false;
        if (r.maxDiameter && diameterInches > r.maxDiameter) return false;
        return true;
    });

    if (rule) {
        // Check Velocity Warning (only if not already error)
        if (result.velocityStatus.status !== 'error') {
            const vCheck = checkVelocity(pipe.velocity, rule);
            if (vCheck.status !== 'ok') {
                result.velocityStatus = vCheck;
            }
        }

        // Check Pressure Drop Warning
        // Pressure drop in pipe is usually in Pa or kPa. Table is bar/100m.
        // We need dP/100m.
        if (pipe.pressureDropCalculationResults?.normalizedPressureDrop) {
            // normalizedPressureDrop is typically Pa/m or similar? 
            // Let's assume we calculate bar/100m from total drop / length?
            // Actually `normalizedPressureDrop` in types might be what we need or we compute it.
            // Let's compute: (Total Drop (Pa) / Length (m)) * 100 -> Pa/100m -> / 100000 -> bar/100m

            // Wait, `pressureDropCalculationResults.totalSegmentPressureDrop` is in Pa.
            // `pipe.length` is in m.
            if (pipe.length && pipe.pressureDropCalculationResults.totalSegmentPressureDrop) {
                const paPerM = pipe.pressureDropCalculationResults.totalSegmentPressureDrop / pipe.length;
                const barPer100m = (paPerM * 100) / 100000;

                const pCheck = checkPressureDrop(barPer100m, rule);
                if (pCheck.status !== 'ok') {
                    result.pressureDropStatus = pCheck;
                }
            }
        }
    }

    return result;
}

export const SERVICE_TYPES = [
    "Pump suction",
    "Pump discharge",
    "General process liquid",
    "Drains",
    "Amine",
    "Boiler feed water",
    "Cooling water",
    "Reboiler",
    "Saturated Vapor (Low P)",
    "Superheated Vapor (Med P)",
    "Superheated Vapor (High P)",
    // Add others from Existing Liquid Criteria if needed
];
