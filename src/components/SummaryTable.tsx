"use client";

import { useState } from "react";
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Box,
    Button,
    Switch,
    FormControlLabel,
} from "@mui/material";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PrintIcon from '@mui/icons-material/Print';
import { NetworkState, PipeProps } from "@/lib/types";
import { PIPE_FITTING_OPTIONS } from "./PipeDimension";
import { convertUnit } from "@/lib/unitConversion";

type Props = {
    network: NetworkState;
};

type RowConfig =
    | { type: "section"; label: string }
    | {
        type: "data";
        label: string;
        unit?: string;
        getValue: (pipe: PipeProps) => string | number | undefined | null | { value: string | number | undefined | null; subLabel?: string; color?: string; helperText?: string; fontWeight?: string };
        subLabel?: string;
        decimals?: number
    };

export function SummaryTable({ network }: Props) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
    const [fitToPage, setFitToPage] = useState(true);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const formatNumber = (val: string | number | undefined | null, decimals = 3) => {
        if (val === undefined || val === null) return "";
        if (typeof val === "string") return val;
        if (!Number.isFinite(val)) return "";
        return val.toFixed(decimals);
    };

    const getFittingCount = (pipe: PipeProps, type: string) => {
        const fitting = pipe.fittings?.find((f) => f.type === type);
        return fitting ? fitting.count : "";
    };

    const getFittingK = (pipe: PipeProps, type: string, decimals = 3) => {
        const fitting = pipe.fittings?.find((f) => f.type === type);
        return fitting ? formatNumber(fitting.k_each, decimals) : "";
    };

    const getNodeLabel = (id: string) => {
        return network.nodes.find((n) => n.id === id)?.label || id;
    };

    const pipes = network.pipes;
    const visiblePipes = pipes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const u = (metric: string, imperial: string) => unitSystem === "metric" ? metric : imperial;

    const rows: RowConfig[] = [
        { type: "data", label: "Segment ID", getValue: (pipe) => pipe.label || "" },
        { type: "data", label: "Description", getValue: (pipe) => pipe.description },
        { type: "data", label: "From", getValue: (pipe) => getNodeLabel(pipe.startNodeId) },
        { type: "data", label: "To", getValue: (pipe) => getNodeLabel(pipe.endNodeId) },

        { type: "section", label: "I. GENERAL DATA" },
        { type: "data", label: "Fluid Phase", getValue: (pipe) => pipe.fluid?.phase },
        { type: "data", label: "Calculation Type", getValue: (pipe) => pipe.pipeSectionType },
        { type: "data", label: "Flow Direction", getValue: (pipe) => pipe.direction },
        {
            type: "data",
            label: "Flow Type (Adiabatic or Isothermal)",
            getValue: (pipe) => {
                if (pipe.fluid?.phase !== "gas") return "N/A";
                return pipe.gasFlowModel;
            }
        },
        {
            type: "data",
            label: "Pressure",
            unit: u("kPag", "psig"),
            getValue: (pipe) => {
                const direction = pipe.direction ?? "forward";
                const isForward = direction === "forward";
                const val = isForward
                    ? pipe.resultSummary?.inletState?.pressure
                    : pipe.resultSummary?.outletState?.pressure;

                const convertedVal = val ? convertUnit(val, "Pa", u("kPag", "psig")) : undefined;

                return {
                    value: convertedVal,
                    subLabel: isForward ? "at INLET" : "at OUTLET"
                };
            },
        },

        { type: "section", label: "II. FLUID DATA" },
        {
            type: "data",
            label: "Design Flow Rate",
            unit: u("kg/h", "lb/h"),
            getValue: (pipe) => pipe.designMassFlowRate ? convertUnit(pipe.designMassFlowRate, pipe.designMassFlowRateUnit || "kg/h", u("kg/h", "lb/h")) : pipe.massFlowRate ? convertUnit(pipe.massFlowRate, pipe.massFlowRateUnit || "kg/h", u("kg/h", "lb/h")) : undefined
        },
        {
            type: "data",
            label: "Design Volumetric Flow Rate",
            // Unit varies by phase, so we display it per-cell via subLabel
            unit: undefined,
            getValue: (pipe) => {
                const massFlow = pipe.designMassFlowRate || pipe.massFlowRate;
                const density = pipe.resultSummary?.inletState?.density;
                const phase = pipe.fluid?.phase;

                if (massFlow && density) {
                    const volFlowM3H = massFlow / density;

                    let targetUnit = "m3/h";
                    if (phase === "gas") {
                        targetUnit = unitSystem === "metric" ? "Nm3/h" : "SCFD";
                    } else {
                        targetUnit = unitSystem === "metric" ? "m3/h" : "ft3/h";
                    }

                    const val = convertUnit(volFlowM3H, "m3/h", targetUnit, "volumeFlowRate");
                    return {
                        value: val,
                        subLabel: targetUnit,
                        helperText: phase === "gas" ? "(at 1 atm, 25°C)" : undefined
                    };
                }
                return undefined;
            }
        },
        {
            type: "data",
            label: "Temperature",
            unit: u("°C", "°F"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.temprature; // Note typo in types.ts 'temprature'
                return val ? convertUnit(val, "K", u("C", "F")) : undefined;
            }
        },
        {
            type: "data",
            label: "Density",
            unit: u("kg/m3", "lb/ft3"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.density;
                return val ? convertUnit(val, "kg/m3", u("kg/m3", "lb/ft3")) : undefined;
            }
        },
        { type: "data", label: "Molecular Weight", getValue: (pipe) => pipe.fluid?.molecularWeight },
        { type: "data", label: "Compressibility Factor Z", getValue: (pipe) => pipe.fluid?.zFactor },
        { type: "data", label: "Specific Heat Ratio k (Cp/Cv)", getValue: (pipe) => pipe.fluid?.specificHeatRatio },
        {
            type: "data",
            label: "Viscosity",
            unit: "cP",
            getValue: (pipe) => pipe.fluid?.viscosity ? convertUnit(pipe.fluid.viscosity, pipe.fluid.viscosityUnit || "cP", "cP") : undefined
        },

        { type: "section", label: "III. PIPE, FITTING & ELEVATION" },
        { type: "data", label: "Main Pipe DN", unit: u("in", "in"), getValue: (pipe) => pipe.diameterInputMode == "nps" ? pipe.pipeNPD : "" },
        { type: "data", label: "Pipe Schedule", getValue: (pipe) => pipe.diameterInputMode == "nps" ? pipe.pipeSchedule : "" },
        {
            type: "data",
            label: "Main Pipe ID",
            unit: u("mm", "in"),
            getValue: (pipe) => pipe.diameter ? convertUnit(pipe.diameter, pipe.diameterUnit || "mm", u("mm", "in")) : undefined
        },
        {
            type: "data",
            label: "Inlet Pipe DN",
            unit: u("mm", "in"),
            getValue: (pipe) => pipe.inletDiameter ? convertUnit(pipe.inletDiameter, pipe.inletDiameterUnit || pipe.diameterUnit || "mm", u("mm", "in")) : undefined
        },
        {
            type: "data",
            label: "Outlet Pipe DN",
            unit: u("mm", "in"),
            getValue: (pipe) => pipe.outletDiameter ? convertUnit(pipe.outletDiameter, pipe.outletDiameterUnit || pipe.diameterUnit || "mm", u("mm", "in")) : undefined
        },
        {
            type: "data",
            label: "Pipe Roughness",
            unit: u("mm", "in"),
            getValue: (pipe) => pipe.roughness ? convertUnit(pipe.roughness, pipe.roughnessUnit || "mm", u("mm", "in")) : undefined
        },
        {
            type: "data",
            label: "Pipe Length",
            unit: u("m", "ft"),
            getValue: (pipe) => {
                if (!pipe.pipeSectionType) return "";
                const length = pipe.length ? convertUnit(pipe.length, pipe.lengthUnit || "m", u("m", "ft")) : undefined
                const sectionType = pipe.pipeSectionType || "pipeline";
                if (sectionType == "pipeline") {
                    return length;
                } else {
                    return "";
                }
            }
        },
        {
            type: "data",
            label: "Elevation Change (- for DOWN)",
            unit: u("m", "ft"),
            getValue: (pipe) => {
                if (!pipe.pipeSectionType) return "";
                const elevation = pipe.elevation ? convertUnit(pipe.elevation, pipe.elevationUnit || "m", u("m", "ft")) : undefined
                const sectionType = pipe.pipeSectionType || "pipeline";
                if (sectionType == "pipeline") {
                    return elevation;
                } else {
                    return "";
                }
            }
        },
        { type: "data", label: "Erosional Constant C (API 14E)", getValue: (pipe) => pipe.erosionalConstant },

        // Fittings
        { type: "section", label: "Fitting Count" },
        {
            type: "data", label: "Elbow 45°", getValue: (pipe) => {
                const count = getFittingCount(pipe, "elbow_45") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "elbow_45") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Elbow 90°", getValue: (pipe) => {
                const count = getFittingCount(pipe, "elbow_90") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "elbow_90") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "U-Bend", getValue: (pipe) => {
                const count = getFittingCount(pipe, "u_bend") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "u_bend") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Stub-In Elbow", getValue: (pipe) => {
                const count = getFittingCount(pipe, "stub_in_elbow") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "stub_in_elbow") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Tee Elbow", getValue: (pipe) => {
                const count = getFittingCount(pipe, "tee_elbow") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "tee_elbow") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Tee Through", getValue: (pipe) => {
                const count = getFittingCount(pipe, "tee_through") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "tee_through") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Block Valve Full Line Size", getValue: (pipe) => {
                const count = getFittingCount(pipe, "block_valve_full_line_size") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "block_valve_full_line_size") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Block Valve Reduced Trim 0.9D", getValue: (pipe) => {
                const count = getFittingCount(pipe, "block_valve_reduced_trim_0.9d") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "block_valve_reduced_trim_0.9d") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Block Valve Reduced Trim 0.8D", getValue: (pipe) => {
                const count = getFittingCount(pipe, "block_valve_reduced_trim_0.8d") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "block_valve_reduced_trim_0.8d") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Globe Valve", getValue: (pipe) => {
                const count = getFittingCount(pipe, "globe_valve") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "globe_valve") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Diaphragm Valve", getValue: (pipe) => {
                const count = getFittingCount(pipe, "diaphragm_valve") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "diaphragm_valve") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Butterfly Valve", getValue: (pipe) => {
                const count = getFittingCount(pipe, "butterfly_valve") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "butterfly_valve") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Check Valve Swing", getValue: (pipe) => {
                const count = getFittingCount(pipe, "check_valve_swing") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "check_valve_swing") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Check Valve Lift", getValue: (pipe) => {
                const count = getFittingCount(pipe, "lift_check_valve") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "lift_check_valve") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Check Valve Tilting", getValue: (pipe) => {
                const count = getFittingCount(pipe, "tilting_check_valve") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "tilting_check_valve") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Pipe Entrance Normal", getValue: (pipe) => {
                const count = getFittingCount(pipe, "pipe_entrance_normal") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "pipe_entrance_normal") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Pipe Entrance Raise", getValue: (pipe) => {
                const count = getFittingCount(pipe, "pipe_entrance_raise") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "pipe_entrance_raise") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Pipe Exit", getValue: (pipe) => {
                const count = getFittingCount(pipe, "pipe_exit") || 0;
                if (count == 0) return "";
                const K_each = getFittingK(pipe, "pipe_exit") || 0;
                return count + " x " + K_each;
            }
        },
        {
            type: "data", label: "Input Swage", getValue: (pipe) => {
                const diameter = pipe.diameter || 0;
                const inletDiameter = pipe.inletDiameter;
                if (inletDiameter == null) return ""
                else {
                    const K_each = getFittingK(pipe, "inlet_swage", 3);
                    if (diameter > inletDiameter) return "reduce" + " x " + K_each;
                    if (diameter < inletDiameter) return "expand" + " x " + K_each;
                    return "none";
                };
            }
        },
        {
            type: "data", label: "Output Swage", getValue: (pipe) => {
                const diameter = pipe.diameter || 0;
                const outletDiameter = pipe.outletDiameter;
                if (outletDiameter == null) return ""
                else {
                    const K_each = getFittingK(pipe, "outlet_swage", 3);
                    if (diameter > outletDiameter) return "reduce" + " x " + K_each;
                    if (diameter < outletDiameter) return "expand" + " x " + K_each;
                    return "none";
                };
            }
        },

        {
            type: "data",
            label: "Fitting K",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                return pipe.pressureDropCalculationResults?.fittingK;
            }
        },
        {
            type: "data",
            label: "Pipe Length K",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                return pipe.pressureDropCalculationResults?.pipeLengthK;
            }
        },
        {
            type: "data",
            label: "User Supply K",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                return pipe.userK;
            }
        },
        {
            type: "data",
            label: "Total K",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                const fittingK = pipe.pressureDropCalculationResults?.fittingK || 0;
                const pipeLengthK = pipe.pressureDropCalculationResults?.pipeLengthK || 0;
                const userK = pipe.userK || 0;
                return fittingK + pipeLengthK + userK;
            }
        },
        {
            type: "data",
            label: "Pipe & Fitting Safety Factor",
            unit: "%",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                return pipe.pipingFittingSafetyFactor;
            }
        },
        {
            type: "data",
            label: "Total K (with safety factor)",
            getValue: (pipe) => {
                if (pipe.pipeSectionType === "control valve" || pipe.pipeSectionType === "orifice") return undefined;
                return pipe.pressureDropCalculationResults?.totalK;
            }
        },

        { type: "section", label: "IV. OPTIONAL CALCULATIONS" },
        { type: "data", label: "Control Valve Cv", getValue: (pipe) => pipe.controlValve?.cv },
        { type: "data", label: "Control Valve Cg", getValue: (pipe) => pipe.controlValve?.cg },
        { type: "data", label: "Recovery Factor C1", getValue: (pipe) => pipe.controlValve?.C1 },
        { type: "data", label: "Terminal Pressure Drop Ratio xT", getValue: (pipe) => pipe.controlValve?.xT },
        { type: "data", label: "Thin Sharp Edged Orifice d/D Ratio", getValue: (pipe) => pipe.orifice?.betaRatio },

        { type: "section", label: "V. CHARACTERISTIC SUMMARY" },
        { type: "data", label: "Reynolds Number", getValue: (pipe) => pipe.pressureDropCalculationResults?.reynoldsNumber },
        { type: "data", label: "Flow Regime", getValue: (pipe) => pipe.pressureDropCalculationResults?.flowScheme },
        { type: "data", label: "Moody Friction Factor", getValue: (pipe) => pipe.pressureDropCalculationResults?.frictionalFactor, decimals: 5 },
        // Velocity Head at Inlet (K=1) - calculate? 0.5 * rho * v^2 / 1000 for kPa?
        {
            type: "data",
            label: "Flow Momentum (Rho*v²)",
            unit: u("Pa", "psi"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.flowMomentum;
                return val ? convertUnit(val, "Pa", u("Pa", "psi")) : undefined;
            }
        },
        {
            type: "data",
            label: "Critical Pressure",
            unit: u("kPa(a)", "psia"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.gasFlowCriticalPressure;
                return val ? convertUnit(val, "Pa", u("kPa", "psi")) : undefined;
            }
        },

        { type: "section", label: "VI. PRESSURE LOSSES SUMMARY" },
        {
            type: "data",
            label: "Pipe & Fitting",
            unit: u("kPa", "psi"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.pipeAndFittingPressureDrop;
                return val ? convertUnit(val, "Pa", u("kPa", "psi")) : undefined;
            }
        },
        {
            type: "data",
            label: "Elevation Change",
            unit: u("kPa", "psi"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.elevationPressureDrop;
                return val ? convertUnit(val, "Pa", u("kPa", "psi")) : undefined;
            }
        },
        {
            type: "data",
            label: "Control Valve Pressure Drop",
            unit: u("kPa", "psi"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.controlValvePressureDrop;
                return val ? convertUnit(val, "Pa", u("kPa", "psi")) : undefined;
            }
        },
        {
            type: "data",
            label: "Orifice Pressure Drop",
            unit: u("kPa", "psi"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.orificePressureDrop;
                return val ? convertUnit(val, "Pa", u("kPa", "psi")) : undefined;
            }
        },
        {
            type: "data",
            label: "User Supplied Fixed Loss",
            unit: u("kPa", "psi"),
            getValue: (pipe) => {
                const val = pipe.userSpecifiedPressureLoss;
                if (!val) return undefined;
                return unitSystem === "metric" ? val : convertUnit(val, "kPa", "psi");
            }
        },
        {
            type: "data",
            label: "Segment Total Loss",
            unit: u("kPa", "psi"),
            getValue: (pipe: PipeProps) => {
                const val = pipe.pressureDropCalculationResults?.totalSegmentPressureDrop;
                if (typeof val !== 'number') return undefined;
                const inputVal = pipe.resultSummary?.inletState?.pressure || 1e12;
                if (val > inputVal) return { value: val, color: "error.main", fontWeight: "bold", helperText:"Total loss exceeds inlet pressure" };
                return { value: convertUnit(val, "Pa", u("kPa", "psi")), color: "primary.main", fontWeight: "bold" };
            }
        },
        {
            type: "data",
            label: "Unit Friction Loss",
            unit: u("kPa/100m", "psi/100ft"),
            getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.normalizedPressureDrop; // Pa/m
                return val ? convertUnit(val, "Pa/m", u("kPa/100m", "psi/100ft"), "pressureGradient") : undefined;
            }
        },

        { type: "section", label: "VII. RESULT SUMMARY" },
        // INLET
        {
            type: "data",
            label: "INLET Pressure",
            unit: u("kPag", "psig"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.pressure;
                if (typeof val !== 'number') return undefined;
                if (val < 0.0) return { value: val, color: "error.main", fontWeight: "bold" };
                return { value: convertUnit(val, "Pa", u("kPag", "psig")), color: "primary.main", fontWeight: "bold" };
            }
        },
        {
            type: "data",
            label: "INLET Temperature",
            unit: u("°C", "°F"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.temprature;
                return val ? convertUnit(val, "K", u("C", "F")) : undefined;
            }
        },
        {
            type: "data",
            label: "INLET Density",
            unit: u("kg/m3", "lb/ft3"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.density;
                return val ? convertUnit(val, "kg/m3", u("kg/m3", "lb/ft3")) : undefined;
            }
        },
        {
            type: "data",
            label: "INLET Mach Number",
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.machNumber;
                if (typeof val === 'number') {
                    if (val > 1.0) return { value: val, color: "error.main", helperText: "Mach > 1.0" };
                    if (val > 0.5) return { value: val, color: "warning.main", helperText: "Mach > 0.5" };
                }
                return val;
            }
        },
        {
            type: "data",
            label: "INLET Velocity",
            unit: u("m/s", "ft/s"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.velocity;
                const erosional = pipe.resultSummary?.inletState?.erosionalVelocity;
                const convertedVal = val ? convertUnit(val, "m/s", u("m/s", "ft/s")) : undefined;

                if (val && erosional && val > erosional) {
                    return {
                        value: convertedVal,
                        color: "error.main",
                        helperText: "Velocity > Erosional Limit"
                    };
                }
                return convertedVal;
            }
        },
        {
            type: "data",
            label: "INLET Erosional Velocity",
            unit: u("m/s", "ft/s"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.erosionalVelocity;
                return val ? convertUnit(val, "m/s", u("m/s", "ft/s")) : undefined;
            }
        },
        {
            type: "data",
            label: "INLET Flow Momentum",
            unit: u("Pa", "psi"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.flowMomentum;
                return val ? convertUnit(val, "Pa", u("Pa", "psi")) : undefined;
            }
        },

        // OUTLET
        {
            type: "data",
            label: "OUTLET Pressure",
            unit: u("kPag", "psig"),
            getValue: (pipe: PipeProps) => {
                const val = pipe.resultSummary?.outletState?.pressure;
                if (typeof val !== 'number') return undefined;
                if (val < 0.0) return { value: val, color: "error.main", fontWeight: "bold", helperText:"Pressure cannot be negative [Pa]" };
                return { value: convertUnit(val, "Pa", u("kPag", "psig")), color: "primary.main", fontWeight: "bold" };
            }
        },
        {
            type: "data",
            label: "OUTLET Temperature",
            unit: u("°C", "°F"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.temprature;
                return val ? convertUnit(val, "K", u("C", "F")) : undefined;
            }
        },
        {
            type: "data",
            label: "OUTLET Density",
            unit: u("kg/m3", "lb/ft3"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.density;
                return val ? convertUnit(val, "kg/m3", u("kg/m3", "lb/ft3")) : undefined;
            }
        },
        {
            type: "data",
            label: "OUTLET Mach Number",
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.machNumber;
                if (typeof val === 'number') {
                    if (val > 1.0) return { value: val, color: "error.main", helperText: "Mach > 1.0" };
                    if (val > 0.5) return { value: val, color: "warning.main", helperText: "Mach > 0.5" };
                }
                return val;
            }
        },
        {
            type: "data",
            label: "OUTLET Velocity",
            unit: u("m/s", "ft/s"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.velocity;
                const erosional = pipe.resultSummary?.outletState?.erosionalVelocity;
                const convertedVal = val ? convertUnit(val, "m/s", u("m/s", "ft/s")) : undefined;

                if (val && erosional && val > erosional) {
                    return {
                        value: convertedVal,
                        color: "error.main",
                        helperText: "Velocity > Erosional Limit"
                    };
                }
                return convertedVal;
            }
        },
        {
            type: "data",
            label: "OUTLET Erosional Velocity",
            unit: u("m/s", "ft/s"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.erosionalVelocity;
                return val ? convertUnit(val, "m/s", u("m/s", "ft/s")) : undefined;
            }
        },
        {
            type: "data",
            label: "OUTLET Flow Momentum",
            unit: u("Pa", "psi"),
            getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.flowMomentum;
                return val ? convertUnit(val, "Pa", u("Pa", "psi")) : undefined;
            }
        },
    ];

    const handlePrint = () => {
        window.print();
    };

    return (
        <Paper id="summary-table-print-area" className={fitToPage ? "fit-to-page" : ""} sx={{ width: "100%", overflow: "hidden", p: 2 }}>
            <Box className="print-header-container" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flex: 1, textAlign: "center" }}>
                    SINGLE PHASE FLOW PRESSURE DROP
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }} className="no-print">
                    <ToggleButtonGroup
                        color="primary"
                        value={unitSystem}
                        exclusive
                        onChange={(event, value) => setUnitSystem(value)}
                        size="small"
                        aria-label="Unit System"
                    >
                        <ToggleButton value="metric">Metric</ToggleButton>
                        <ToggleButton value="imperial">Imperial</ToggleButton>
                    </ToggleButtonGroup>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={fitToPage}
                                onChange={(e) => setFitToPage(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Fit Height to Page"
                    />
                    <Button variant="outlined" onClick={handlePrint} startIcon={<PrintIcon />}>
                        Print
                    </Button>
                </Box>
            </Box>
            <style type="text/css" media="print">
                {`
                @page { size: portrait; margin: 5mm; }
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #summary-table-print-area, #summary-table-print-area * {
                        visibility: visible;
                    }
                    #summary-table-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none;
                    }
                    .print-header-container {
                        margin-bottom: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Reset table container scroll/height for print */
                    .MuiTableContainer-root {
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    /* Remove sticky positioning for print */
                    .MuiTableCell-stickyHeader, .MuiTableCell-root {
                        position: static !important;
                        border-right: 1px solid #000 !important;
                        border-bottom: 1px solid #000 !important;
                    }
                    /* Add top and left borders to the table to complete the outer border */
                    .MuiTable-root {
                        border-top: 1px solid #000 !important;
                        border-left: 1px solid #000 !important;
                        table-layout: fixed !important; /* Force column widths */
                        width: 100% !important;
                    }
                    .MuiTableHead-root {
                        display: table-header-group;
                    }
                    .MuiTableRow-root {
                        page-break-inside: avoid;
                        height: auto !important; /* Allow rows to shrink */
                        min-height: 0 !important;
                    }

                    /* Fit to Page Styles */
                    .fit-to-page .MuiTableCell-root {
                        padding: 0px 1px !important;
                        font-size: 5.5pt !important;
                        line-height: 0.9 !important; /* Very tight line height */
                        height: 10px !important; /* Force small height */
                        min-height: 0 !important;
                    }
                    .fit-to-page .MuiTypography-root {
                        font-size: 5.5pt !important;
                    }
                    .fit-to-page .MuiTypography-caption {
                        font-size: 4.5pt !important;
                        line-height: 0.9 !important;
                    }

                    /* Column Width Adjustments for Print */
                    /* Property Column */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(1),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(1) {
                        width: 150px !important; /* Reduced from default minWidth 250 */
                        min-width: 150px !important;
                        max-width: 150px !important;
                        white-space: normal !important; /* Allow wrapping */
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    /* Unit Column */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(2),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(2) {
                        width: 25px !important;
                        min-width: 25px !important;
                        max-width: 25px !important;
                        padding: 0px 1px !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                    }
                    /* Data Columns */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(n+3),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(n+3) {
                        width: auto !important;
                        min-width: 30px !important;
                    }

                    /* Fix empty page at the end */
                    html, body {
                        height: auto !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #summary-table-print-area {
                        height: auto !important;
                        overflow: visible !important;
                        width: 99% !important; /* Prevent horizontal overflow */
                    }
                    #summary-table-print-area.fit-to-page {
                        transform: scale(0.98);
                        transform-origin: top left;
                    }
                }
                `}
            </style>
            <TableContainer sx={{ maxHeight: 800 }}>
                <Table stickyHeader aria-label="sticky table" size="small" sx={{ borderCollapse: 'collapse', border: '1px solid #e0e0e0' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 200, width: 200, position: 'sticky', left: 0, background: 'white', zIndex: 10, borderRight: '1px solid #e0e0e0' }}>
                                Property
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', width: 60, position: 'sticky', left: 200, background: 'white', zIndex: 10, borderRight: '1px solid #e0e0e0' }}>
                                Unit
                            </TableCell>
                            {visiblePipes.map((pipe, index) => (
                                <TableCell key={pipe.id} align="center" sx={{ minWidth: 120, borderRight: '1px solid #e0e0e0', bgcolor: '#e0f2f1' }}>
                                    {index + 1 + (page * rowsPerPage)}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => {
                            if (row.type === "section") {
                                return (
                                    <TableRow key={index} sx={{ bgcolor: "#e0e0e0" }}>
                                        <TableCell colSpan={2 + visiblePipes.length} sx={{ fontWeight: "bold", borderRight: '1px solid #e0e0e0' }}>
                                            {row.label}
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow hover key={index}>
                                    <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'white', borderRight: '1px solid #e0e0e0' }}>
                                        {row.label}
                                        {row.subLabel && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {row.subLabel}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ position: 'sticky', left: 200, background: 'white', borderRight: '1px solid #e0e0e0', color: 'text.secondary', fontSize: '0.75rem' }}>
                                        {row.unit || "-"}
                                    </TableCell>
                                    {visiblePipes.map((pipe) => {
                                        const result = row.getValue(pipe);
                                        const value = typeof result === 'object' && result !== null ? result.value : result;
                                        const cellSubLabel = typeof result === 'object' && result !== null ? result.subLabel : undefined;
                                        const cellColor = typeof result === 'object' && result !== null ? result.color : undefined;
                                        const cellHelperText = typeof result === 'object' && result !== null ? result.helperText : undefined;
                                        const cellFontWeight = typeof result === 'object' && result !== null ? result.fontWeight : undefined;

                                        return (
                                            <TableCell key={pipe.id} align="center" sx={{ borderRight: '1px solid #e0e0e0', color: cellColor, fontWeight: cellFontWeight }}>
                                                {formatNumber(value, row.decimals)}
                                                {cellSubLabel && (
                                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {cellSubLabel}
                                                    </Typography>
                                                )}
                                                {cellHelperText && (
                                                    <Typography variant="caption" display="block" color={cellColor || "text.secondary"} sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                        {cellHelperText}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                className="no-print"
                rowsPerPageOptions={[8, 16, 24, 100]}
                component="div"
                count={pipes.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Pipes per page:"
            />
        </Paper>
    );
}
