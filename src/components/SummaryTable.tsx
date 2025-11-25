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
} from "@mui/material";
import { NetworkState, PipeProps } from "@/lib/types";
import { PIPE_FITTING_OPTIONS } from "./PipeDimension";

type Props = {
    network: NetworkState;
};

type RowConfig =
    | { type: "section"; label: string }
    | { type: "data"; label: string; unit?: string; getValue: (pipe: PipeProps) => string | number | undefined | null; subLabel?: string; decimals?: number };

export function SummaryTable({ network }: Props) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const formatNumber = (val: string | number | undefined | null, decimals = 2) => {
        if (val === undefined || val === null) return "";
        if (typeof val === "string") return val;
        if (!Number.isFinite(val)) return "";
        return val.toFixed(decimals);
    };

    const getFittingCount = (pipe: PipeProps, type: string) => {
        const fitting = pipe.fittings?.find((f) => f.type === type);
        return fitting ? fitting.count : "";
    };

    const getFittingK = (pipe: PipeProps, type: string) => {
        const fitting = pipe.fittings?.find((f) => f.type === type);
        return fitting ? formatNumber(fitting.k_each) : "";
    };

    const getNodeLabel = (id: string) => {
        return network.nodes.find((n) => n.id === id)?.label || id;
    };

    const pipes = network.pipes;
    const visiblePipes = pipes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const rows: RowConfig[] = [
        { type: "data", label: "Segment ID", getValue: (pipe) => pipe.label || "" },
        { type: "data", label: "Description", getValue: (pipe) => pipe.description },
        { type: "data", label: "From", getValue: (pipe) => getNodeLabel(pipe.startNodeId) },
        { type: "data", label: "To", getValue: (pipe) => getNodeLabel(pipe.endNodeId) },

        { type: "section", label: "I. GENERAL DATA" },
        { type: "data", label: "Fluid Phase", getValue: (pipe) => pipe.fluid?.phase },
        { type: "data", label: "Calculation Type", getValue: (pipe) => pipe.pipeSectionType },
        { type: "data", label: "Flow Direction", getValue: (pipe) => pipe.direction },
        { type: "data", label: "Flow Type (Adiabatic or Isothermal)", getValue: (pipe) => pipe.gasFlowModel },
        {
            type: "data",
            label: "Pressure",
            unit: "kPag",
            subLabel: "at INLET",
            getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.pressure;
                return val ? (val / 1000 - 101.325) : undefined; // Pa -> kPag approx
            },
        },

        { type: "section", label: "II. FLUID DATA" },
        { type: "data", label: "Flow Rate", unit: "kg/h", getValue: (pipe) => pipe.massFlowRate },
        {
            type: "data", label: "Volumetric Flow Rate", unit: "m3/h", getValue: (pipe) => {
                const massFlow = pipe.massFlowRate;
                const density = pipe.resultSummary?.inletState?.density;
                if (massFlow && density) return massFlow / density;
                return undefined;
            }
        },
        // Standard Flow Rate not directly available in simple state, skipping or leaving empty
        {
            type: "data", label: "Temperature", unit: "°C", getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.temprature; // Note typo in types.ts 'temprature'
                return val ? val - 273.15 : undefined;
            }
        },
        { type: "data", label: "Density", unit: "kg/m3", getValue: (pipe) => pipe.resultSummary?.inletState?.density },
        { type: "data", label: "Molecular Weight", getValue: (pipe) => pipe.fluid?.molecularWeight },
        { type: "data", label: "Compressibility Factor Z", getValue: (pipe) => pipe.fluid?.zFactor },
        { type: "data", label: "Specific Heat Ratio k (Cp/Cv)", getValue: (pipe) => pipe.fluid?.specificHeatRatio },
        { type: "data", label: "Viscosity", unit: "cP", getValue: (pipe) => pipe.fluid?.viscosity },

        { type: "section", label: "III. PIPE, FITTING & ELEVATION" },
        { type: "data", label: "Main Pipe DN", unit: "in", getValue: (pipe) => pipe.pipeNPD },
        { type: "data", label: "Pipe Schedule", getValue: (pipe) => pipe.pipeSchedule },
        { type: "data", label: "Main Pipe ID", unit: "mm", getValue: (pipe) => pipe.diameter },
        { type: "data", label: "Inlet Pipe DN", unit: "mm", getValue: (pipe) => pipe.inletDiameter },
        { type: "data", label: "Outlet Pipe DN", unit: "mm", getValue: (pipe) => pipe.outletDiameter },
        { type: "data", label: "Pipe Roughness", unit: "mm", getValue: (pipe) => pipe.roughness },
        { type: "data", label: "Pipe Length", unit: "m", getValue: (pipe) => pipe.length },
        { type: "data", label: "Elevation Change (- for DOWN)", unit: "m", getValue: (pipe) => pipe.elevation },
        { type: "data", label: "Erosional Constant C (API 14E)", getValue: (pipe) => pipe.erosionalConstant },

        // Fittings
        { type: "section", label: "Fitting Count" },
        { type: "data", label: "Elbow 45 °C", getValue: (pipe) => getFittingCount(pipe, "elbow_45") },
        { type: "data", label: "Elbow 90 °C", getValue: (pipe) => getFittingCount(pipe, "elbow_90") },
        { type: "data", label: "U-Bend", getValue: (pipe) => getFittingCount(pipe, "u_bend") },
        { type: "data", label: "Stub-In Elbow", getValue: (pipe) => getFittingCount(pipe, "stub_in_elbow") },
        { type: "data", label: "Tee Elbow", getValue: (pipe) => getFittingCount(pipe, "tee_elbow") },
        { type: "data", label: "Tee Through", getValue: (pipe) => getFittingCount(pipe, "tee_through") },
        { type: "data", label: "Block Valve Full Line Size", getValue: (pipe) => getFittingCount(pipe, "block_valve_full_line_size") },
        { type: "data", label: "Block Valve Reduced Trim 0.9D", getValue: (pipe) => getFittingCount(pipe, "block_valve_reduced_trim_0.9d") },
        { type: "data", label: "Block Valve Reduced Trim 0.8D", getValue: (pipe) => getFittingCount(pipe, "block_valve_reduced_trim_0.8d") },
        { type: "data", label: "Globe Valve", getValue: (pipe) => getFittingCount(pipe, "globe_valve") },
        { type: "data", label: "Diaphragm Valve", getValue: (pipe) => getFittingCount(pipe, "diaphragm_valve") },
        { type: "data", label: "Butterfly Valve", getValue: (pipe) => getFittingCount(pipe, "butterfly_valve") },
        { type: "data", label: "Check Valve Swing", getValue: (pipe) => getFittingCount(pipe, "check_valve_swing") },
        { type: "data", label: "Check Valve Lift", getValue: (pipe) => getFittingCount(pipe, "lift_check_valve") },
        { type: "data", label: "Check Valve Tilting", getValue: (pipe) => getFittingCount(pipe, "tilting_check_valve") },
        { type: "data", label: "Pipe Entrance Normal", getValue: (pipe) => getFittingCount(pipe, "pipe_entrance_normal") },
        { type: "data", label: "Pipe Entrance Raise", getValue: (pipe) => getFittingCount(pipe, "pipe_entrance_raise") },
        { type: "data", label: "Pipe Exit", getValue: (pipe) => getFittingCount(pipe, "pipe_exit") },

        { type: "data", label: "Fitting K", getValue: (pipe) => pipe.pressureDropCalculationResults?.fittingK },
        { type: "data", label: "Pipe Length K", getValue: (pipe) => pipe.pressureDropCalculationResults?.pipeLengthK },
        { type: "data", label: "User Supply K", getValue: (pipe) => pipe.userK },
        { type: "data", label: "Total K", getValue: (pipe) => pipe.pressureDropCalculationResults?.totalK },
        { type: "data", label: "Pipe & Fitting Safety Factor", unit: "%", getValue: (pipe) => pipe.pipingFittingSafetyFactor },

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
        { type: "data", label: "Flow Momentum (Rho*v²)", getValue: (pipe) => pipe.resultSummary?.inletState?.flowMomentum },
        {
            type: "data", label: "Critical Pressure", unit: "kPa(a)", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.gasFlowCriticalPressure;
                return val ? val / 1000 : undefined;
            }
        },

        { type: "section", label: "VI. PRESSURE LOSSES SUMMARY" },
        {
            type: "data", label: "Pipe & Fitting", unit: "kPa", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.pipeAndFittingPressureDrop;
                return val ? val / 1000 : undefined;
            }
        },
        {
            type: "data", label: "Elevation Change", unit: "kPa", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.elevationPressureDrop;
                return val ? val / 1000 : undefined;
            }
        },
        {
            type: "data", label: "Control Valve Pressure Drop", unit: "kPa", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.controlValvePressureDrop;
                return val ? val / 1000 : undefined;
            }
        },
        {
            type: "data", label: "Orifice Pressure Drop", unit: "kPa", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.orificePressureDrop;
                return val ? val / 1000 : undefined;
            }
        },
        {
            type: "data", label: "User Supplied Fixed Loss", unit: "kPa", getValue: (pipe) => {
                const val = pipe.userSpecifiedPressureLoss;
                return val ? val : undefined; // Assuming input is already in kPa or consistent
            }
        },
        {
            type: "data", label: "Segment Total Loss", unit: "kPa", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.totalSegmentPressureDrop;
                return val ? val / 1000 : undefined;
            }
        },
        {
            type: "data", label: "Unit Friction Loss", unit: "kPa/100m", getValue: (pipe) => {
                const val = pipe.pressureDropCalculationResults?.normalizedPressureDrop;
                return val ? val / 1000 * 100 : undefined; // Pa/m -> kPa/100m
            }
        },

        { type: "section", label: "VII. RESULT SUMMARY" },
        // INLET
        {
            type: "data", label: "INLET Pressure", unit: "kPag", getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.pressure;
                return val ? (val / 1000 - 101.325) : undefined;
            }
        },
        {
            type: "data", label: "INLET Temperature", unit: "°C", getValue: (pipe) => {
                const val = pipe.resultSummary?.inletState?.temprature;
                return val ? val - 273.15 : undefined;
            }
        },
        { type: "data", label: "INLET Density", unit: "kg/m3", getValue: (pipe) => pipe.resultSummary?.inletState?.density },
        { type: "data", label: "INLET Mach Number", getValue: (pipe) => pipe.resultSummary?.inletState?.machNumber },
        { type: "data", label: "INLET Velocity", unit: "m/s", getValue: (pipe) => pipe.resultSummary?.inletState?.velocity },
        { type: "data", label: "INLET Erosional Velocity", unit: "m/s", getValue: (pipe) => pipe.resultSummary?.inletState?.erosionalVelocity },
        { type: "data", label: "INLET Flow Momentum", unit: "Pa", getValue: (pipe) => pipe.resultSummary?.inletState?.flowMomentum },

        // OUTLET
        {
            type: "data", label: "OUTLET Pressure", unit: "kPag", getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.pressure;
                return val ? (val / 1000 - 101.325) : undefined;
            }
        },
        {
            type: "data", label: "OUTLET Temperature", unit: "°C", getValue: (pipe) => {
                const val = pipe.resultSummary?.outletState?.temprature;
                return val ? val - 273.15 : undefined;
            }
        },
        { type: "data", label: "OUTLET Density", unit: "kg/m3", getValue: (pipe) => pipe.resultSummary?.outletState?.density },
        { type: "data", label: "OUTLET Mach Number", getValue: (pipe) => pipe.resultSummary?.outletState?.machNumber },
        { type: "data", label: "OUTLET Velocity", unit: "m/s", getValue: (pipe) => pipe.resultSummary?.outletState?.velocity },
        { type: "data", label: "OUTLET Erosional Velocity", unit: "m/s", getValue: (pipe) => pipe.resultSummary?.outletState?.erosionalVelocity },
        { type: "data", label: "OUTLET Flow Momentum", unit: "Pa", getValue: (pipe) => pipe.resultSummary?.outletState?.flowMomentum },
    ];

    return (
        <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
            <Typography variant="h6" gutterBottom component="div" align="center" sx={{ fontWeight: 'bold' }}>
                SINGLE PHASE FLOW PRESSURE DROP
            </Typography>
            <TableContainer sx={{ maxHeight: 800 }}>
                <Table stickyHeader aria-label="sticky table" size="small" sx={{ borderCollapse: 'collapse' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 250, position: 'sticky', left: 0, background: 'white', zIndex: 10, borderRight: '1px solid #e0e0e0' }}>
                                Property
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 60, position: 'sticky', left: 250, background: 'white', zIndex: 10, borderRight: '1px solid #e0e0e0' }}>
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
                                    <TableCell align="center" sx={{ position: 'sticky', left: 250, background: 'white', borderRight: '1px solid #e0e0e0', color: 'text.secondary', fontSize: '0.75rem' }}>
                                        {row.unit || "-"}
                                    </TableCell>
                                    {visiblePipes.map((pipe) => (
                                        <TableCell key={pipe.id} align="center" sx={{ borderRight: '1px solid #e0e0e0' }}>
                                            {formatNumber(row.getValue(pipe), row.decimals)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
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
