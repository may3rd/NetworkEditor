import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface CriteriaRow {
    category: string | React.ReactNode;
    subCategory: string | React.ReactNode;
    velocity: string;
    pressureDrop: string | React.ReactNode;
    rowSpan?: number;
}

const VELOCITY_DATA: CriteriaRow[] = [
    // Pump suction
    { category: 'Pump suction', subCategory: '≤ 2”', velocity: '0.45 – 0.75', pressureDrop: 'Note 1', rowSpan: 3 },
    { category: 'Pump suction', subCategory: '3” - 10”', velocity: '0.60 – 1.20', pressureDrop: 'Note 1' },
    { category: 'Pump suction', subCategory: '12” - 20” & Up', velocity: '0.90 – 1.85', pressureDrop: 'Note 1' },
    // Pump discharge
    { category: 'Pump discharge', subCategory: '≤ 2”', velocity: '1.20 – 2.75', pressureDrop: '0.34 – 0.68', rowSpan: 3 },
    { category: 'Pump discharge', subCategory: '3” - 10”', velocity: '1.50 – 3.65', pressureDrop: '0.34 – 0.68' },
    { category: 'Pump discharge', subCategory: '12” - 20” & Up', velocity: '2.45 – 4.55', pressureDrop: '0.34 – 0.68' },
    // Others general process liquid lines
    { category: 'Others general process liquid lines', subCategory: '1”', velocity: '0.8 – 1.4', pressureDrop: '0.56', rowSpan: 7 },
    { category: 'Others general process liquid lines', subCategory: '2”', velocity: '1.1 – 1.9', pressureDrop: '0.56' },
    { category: 'Others general process liquid lines', subCategory: '3”', velocity: '1.4 – 2.2', pressureDrop: '0.56' },
    { category: 'Others general process liquid lines', subCategory: '4”', velocity: '1.7 – 2.8', pressureDrop: '0.56' },
    { category: 'Others general process liquid lines', subCategory: '6”', velocity: '2.0 – 3.1', pressureDrop: '0.46' },
    { category: 'Others general process liquid lines', subCategory: '8”', velocity: '2.2 – 3.9', pressureDrop: '0.46' },
    { category: 'Others general process liquid lines', subCategory: '10” & Up', velocity: '3.0 – 4.6', pressureDrop: '0.46' },
    // Drains
    { category: 'Drains', subCategory: 'a) Pipe diameter ≤ 2 inches', velocity: '0.9 – 1.2', pressureDrop: 'N/A', rowSpan: 2 },
    { category: 'Drains', subCategory: 'b) Pipe diameter 3 – 10 inches', velocity: '0.9 – 1.5', pressureDrop: 'N/A' },
    // Amine
    { category: 'Amine', subCategory: 'a) Carbon steel', velocity: '< 2', pressureDrop: 'N/A', rowSpan: 2 },
    { category: 'Amine', subCategory: 'b) Stainless steel Note 2', velocity: '< 3', pressureDrop: 'N/A' },
    // Boiler feed water
    { category: 'Boiler feed water', subCategory: '≤ 2”', velocity: '1.20 – 2.75', pressureDrop: 'N/A', rowSpan: 3 },
    { category: 'Boiler feed water', subCategory: '3” - 10”', velocity: '1.50 – 3.65', pressureDrop: 'N/A' },
    { category: 'Boiler feed water', subCategory: '12” - 20” & Up', velocity: '2.45 – 4.25', pressureDrop: 'N/A' },
    // Cooling water
    {
        category: <span>Cooling water <sup style={{ fontSize: '0.7em' }}>Note 3</sup></span>,
        subCategory: 'a) Main header',
        velocity: '3.7',
        pressureDrop: '0.23 – 0.34',
        rowSpan: 2
    },
    {
        category: 'Cooling water',
        subCategory: 'b) Branch lines',
        velocity: '3.7 – 4.8',
        pressureDrop: '0.34 – 0.68'
    },
    // Reboiler
    {
        category: 'Reboiler',
        subCategory: 'a) Reboiler Trap-out lines',
        velocity: '0.30 – 1.22',
        pressureDrop: '0.035',
        rowSpan: 2
    },
    {
        category: 'Reboiler',
        subCategory: <span>b) Reboiler return lines <sup style={{ fontSize: '0.7em' }}>Note 4</sup></span>,
        velocity: '10.5 – 13.5',
        pressureDrop: '0.07'
    },
];

interface VaporCriteriaRow {
    service: string | React.ReactNode;
    velocitySmall: string; // <= 2"
    velocityMedium: string; // 3"-6"
    velocityLarge: string; // 8"-18"
    velocityExtraLarge: string; // >= 20"
    pressureDrop: string;
    isSectionHeader?: boolean;
}

const VAPOR_DATA: VaporCriteriaRow[] = [
    { service: 'Saturated Vapor', velocitySmall: '', velocityMedium: '', velocityLarge: '', velocityExtraLarge: '', pressureDrop: '', isSectionHeader: true },
    { service: '(Low pressure or < 3.45 barg)', velocitySmall: '13.5 – 30.5', velocityMedium: '15 – 36.5', velocityLarge: '20 – 41', velocityExtraLarge: '24.5 – 42.5', pressureDrop: '-' },
    { service: 'Superheated Vapor', velocitySmall: '', velocityMedium: '', velocityLarge: '', velocityExtraLarge: '', pressureDrop: '', isSectionHeader: true },
    { service: '(Medium pressure or 3.45 to 10.34 barg)', velocitySmall: '12 – 24.5', velocityMedium: '13.5 – 36.5', velocityLarge: '24.5 – 64', velocityExtraLarge: '36.5 – 67', pressureDrop: '-' },
    { service: 'Superheated Vapor', velocitySmall: '', velocityMedium: '', velocityLarge: '', velocityExtraLarge: '', pressureDrop: '', isSectionHeader: true },
    { service: '(High pressure or > 10.34 barg)', velocitySmall: '9 – 18.5', velocityMedium: '10.5 – 27.5', velocityLarge: '20 – 49', velocityExtraLarge: '30.5 – 52', pressureDrop: '-' },
    { service: 'Hydrocarbon or Steam lines (L < 90 m)', velocitySmall: '', velocityMedium: '', velocityLarge: '', velocityExtraLarge: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) 0.07 bara or less', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '0.014' },
    { service: 'b) 0.49 bara or less', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '0.034' },
    { service: 'c) 0 to 3.45 barg', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '0.06 – 0.11' },
    { service: 'd) 3.45 to 10.34 barg', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '0.11 – 0.34' },
    { service: 'e) 10.34 to 41.40 barg', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '0.34 – 0.68' },
    { service: 'f) Over 41.40 barg', velocitySmall: '-', velocityMedium: '-', velocityLarge: '-', velocityExtraLarge: '-', pressureDrop: '1.64% of pressure level' },
];

interface ExistingLiquidCriteriaRow {
    service: string | React.ReactNode;
    velocity: string;
    pressureDrop: string;
    isSectionHeader?: boolean;
    isSubHeader?: boolean;
}

const EXISTING_LIQUID_DATA: ExistingLiquidCriteriaRow[] = [
    { service: <span>Pump suction <sup style={{ fontSize: '0.7em' }}>Note 1</sup></span>, velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'Pipe diameter ≤ 8 inches', velocity: '', pressureDrop: '', isSubHeader: true },
    { service: <span>a) Non-boiling liquid <sup style={{ fontSize: '0.7em' }}>Note 2</sup></span>, velocity: '2.4', pressureDrop: '0.45' },
    { service: 'b) Boiling liquid', velocity: '1.8', pressureDrop: '0.11' },
    { service: 'Pipe diameter > 8 inches', velocity: '', pressureDrop: '', isSubHeader: true },
    { service: <span>a) Non-boiling liquid <sup style={{ fontSize: '0.7em' }}>Note 2</sup></span>, velocity: '3.6', pressureDrop: '0.45' },
    { service: 'b) Boiling liquid', velocity: '1.8', pressureDrop: '0.11' },

    { service: 'Pump discharge', velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: <span>Pipe material <sup style={{ fontSize: '0.7em' }}>Note 3</sup></span>, velocity: '', pressureDrop: '', isSubHeader: true },
    { service: 'a) Carbon steel', velocity: '4.5', pressureDrop: '0.91' },
    { service: 'b) Alloy / Stainless steel', velocity: '6.0', pressureDrop: '0.91' },

    { service: 'Drains', velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Pipe diameter ≤ 2 inches', velocity: '0.9 – 1.2', pressureDrop: 'N/A' },
    { service: 'b) Pipe diameter 3 – 10 inches', velocity: '0.9 – 1.5', pressureDrop: 'N/A' },

    { service: 'Amine', velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Carbon steel', velocity: '< 2', pressureDrop: 'N/A' },
    { service: <span>b) Stainless steel <sup style={{ fontSize: '0.7em' }}>Note 4</sup></span>, velocity: '< 3', pressureDrop: 'N/A' },

    { service: 'Boiler feed water', velocity: '2.44 – 4.57', pressureDrop: 'N/A', isSectionHeader: true },

    { service: <span>Cooling water <sup style={{ fontSize: '0.7em' }}>Note 5</sup></span>, velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Main header', velocity: '3.7', pressureDrop: '0.23 – 0.34' },
    { service: 'b) Branch lines', velocity: '3.7 – 4.8', pressureDrop: '0.34 – 0.68' },

    { service: 'Reboiler', velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Reboiler Trap-out lines', velocity: '1.0 – 2.0', pressureDrop: '0.03 – 0.07' },
    { service: <span>b) Reboiler return lines <sup style={{ fontSize: '0.7em' }}>Note 6</sup></span>, velocity: '10.5 – 13.5', pressureDrop: '0.07' },

    { service: 'Liquids with sand', velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Carbon steel', velocity: '5', pressureDrop: 'N/A' },
    { service: 'b) Stainless steel', velocity: '7', pressureDrop: 'N/A' },
    { service: 'c) GRP (Glass Reinforced Polyester Pipe)', velocity: '6', pressureDrop: 'N/A' },

    { service: 'Oily water system', velocity: '3', pressureDrop: 'N/A', isSectionHeader: true },

    { service: <span>Drilling fluid system <sup style={{ fontSize: '0.7em' }}>Note 7</sup></span>, velocity: '4', pressureDrop: '0.3', isSectionHeader: true },

    { service: <span>Fresh water / Portable water <sup style={{ fontSize: '0.7em' }}>Note 8</sup></span>, velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Carbon steel', velocity: '4', pressureDrop: 'N/A' },
    { service: 'b) Stainless steel / Titanium', velocity: '5', pressureDrop: 'N/A' },
    { service: 'c) Cu-Ni', velocity: '3', pressureDrop: 'N/A' },
    { service: 'd) GRP (Glass Reinforced Polyester Pipe)', velocity: '6', pressureDrop: 'N/A' },

    { service: <span>Brackish / Sea water <sup style={{ fontSize: '0.7em' }}>Note 8</sup></span>, velocity: '', pressureDrop: '', isSectionHeader: true },
    { service: 'a) Carbon steel', velocity: '3', pressureDrop: 'N/A' },
    { service: 'b) Stainless steel / Titanium', velocity: '5', pressureDrop: 'N/A' },
    { service: 'c) Cu-Ni', velocity: '3', pressureDrop: 'N/A' },
    { service: 'd) GRP (Glass Reinforced Polyester Pipe)', velocity: '6', pressureDrop: 'N/A' },
];

export const VelocityCriteriaPage = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{
            width: '100%',
            overflowX: 'auto',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
        }}>
            <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'backgronud.paper' }}>
                <Table sx={{ minWidth: 650 }} aria-label="velocity criteria table">
                    <caption style={{ captionSide: 'top', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: theme.palette.text.primary, padding: '10px' }}>
                        Typical velocity and pressure drop for New Liquid Lines
                    </caption>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Services</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Pipe diameter</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Velocity</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Allowable pressure drop</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>(NPS, inches)</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>(m/s)</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>(bar/100m)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {VELOCITY_DATA.map((row, index) => {
                            const isFirstInCategory = row.rowSpan !== undefined;
                            return (
                                <TableRow key={index}>
                                    {isFirstInCategory && (
                                        <TableCell
                                            rowSpan={row.rowSpan}
                                            sx={{
                                                verticalAlign: 'top',
                                                fontWeight: 'bold',
                                                border: '1px solid rgba(224, 224, 224, 1)',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            {row.category}
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.subCategory}</TableCell>
                                    <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocity}</TableCell>
                                    {/* Handle merged cells for pressure drop if needed, but for now simple rendering */}
                                    {row.category === 'Pump suction' && isFirstInCategory ? (
                                        <TableCell rowSpan={3} align="left" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>
                                            <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>Note 1</Typography>
                                            <Typography variant="body2">a) Non-boiling liquid : 0.23 – 0.34</Typography>
                                            <Typography variant="body2">b) Boiling liquid : 0.07 – 0.11</Typography>
                                        </TableCell>
                                    ) : row.category === 'Pump discharge' && isFirstInCategory ? (
                                        <TableCell rowSpan={3} align="center" sx={{ verticalAlign: 'middle', border: '1px solid rgba(224, 224, 224, 1)' }}>
                                            {row.pressureDrop}
                                        </TableCell>
                                    ) : row.category === 'Drains' && isFirstInCategory ? (
                                        <TableCell rowSpan={2} align="center" sx={{ verticalAlign: 'middle', border: '1px solid rgba(224, 224, 224, 1)' }}>
                                            {row.pressureDrop}
                                        </TableCell>
                                    ) : row.category === 'Amine' && isFirstInCategory ? (
                                        <TableCell rowSpan={2} align="center" sx={{ verticalAlign: 'middle', border: '1px solid rgba(224, 224, 224, 1)' }}>
                                            {row.pressureDrop}
                                        </TableCell>
                                    ) : row.category === 'Boiler feed water' && isFirstInCategory ? (
                                        <TableCell rowSpan={3} align="center" sx={{ verticalAlign: 'middle', border: '1px solid rgba(224, 224, 224, 1)' }}>
                                            {row.pressureDrop}
                                        </TableCell>
                                    ) : (
                                        // Render standard pressure drop cells for rows that aren't grouped or are part of a group but not the first (if not handled above)
                                        // For the groups handled above, we need to NOT render a cell for subsequent rows
                                        (row.category !== 'Pump suction' && row.category !== 'Pump discharge' && row.category !== 'Drains' && row.category !== 'Amine' && row.category !== 'Boiler feed water') ?
                                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.pressureDrop}</TableCell> : null
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ p: 2, pt: 0, mt: -3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Note :</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    1) The fluid operating temperature shall be at least 15 °C below the fluid boiling point temperature to allow sizing based on the criterion for Non-boiling liquid.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    2) Maximum velocity is 5 m/s but recommended at 3 m/s.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    3) Minimum velocity of tube side heat exchanger should be higher than 1 m/s for prevent fouling.
                </Typography>
                <Typography variant="body2">
                    4) Two-phase flow.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'background.paper' }}>
                <Table sx={{ minWidth: 650 }} aria-label="vapor criteria table">
                    <caption style={{ captionSide: 'top', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: theme.palette.text.primary, padding: '10px' }}>
                        Typical Velocity and Pressure Drop for Vapor
                    </caption>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Services</TableCell>
                            <TableCell colSpan={4} align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Velocity (m/s)</TableCell>
                            <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Allowable pressure drop<br />(bar/100m)</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>Pipe ≤ 2”</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>Pipe 3”– 6”</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>Pipe 8”–18”</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>Pipe ≥ 20”</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {VAPOR_DATA.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell
                                    sx={{
                                        border: '1px solid rgba(224, 224, 224, 1)',
                                        fontWeight: row.isSectionHeader ? 'bold' : 'normal',
                                        textDecoration: row.isSectionHeader ? 'underline' : 'none'
                                    }}
                                >
                                    {row.service}
                                </TableCell>
                                {row.isSectionHeader ? (
                                    <>
                                        <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}></TableCell>
                                        <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}></TableCell>
                                        <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}></TableCell>
                                        <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}></TableCell>
                                        <TableCell sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}></TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocitySmall}</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocityMedium}</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocityLarge}</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocityExtraLarge}</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.pressureDrop}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'background.paper' }}>
                <Table sx={{ minWidth: 650 }} aria-label="existing liquid criteria table">
                    <caption style={{ captionSide: 'top', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: theme.palette.text.primary, padding: '10px' }}>
                        Existing Liquid Line Criteria
                    </caption>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Services</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Maximum Velocity<br />(m/s)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid rgba(224, 224, 224, 1)' }}>Allowable pressure drop<br />(bar/100m)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {EXISTING_LIQUID_DATA.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell
                                    sx={{
                                        border: '1px solid rgba(224, 224, 224, 1)',
                                        fontWeight: row.isSectionHeader ? 'bold' : 'normal',
                                        textDecoration: row.isSectionHeader ? 'underline' : 'none',
                                        pl: row.isSubHeader ? 4 : 2
                                    }}
                                >
                                    {row.service}
                                </TableCell>
                                <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.velocity}</TableCell>
                                <TableCell align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>{row.pressureDrop}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ p: 2, pt:0, mt: -3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Note :</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    1) NPSHa shall be the most important parameter to calculated and considered.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    2) The fluid temperature shall be at least 15 °C below the fluid boiling point temperature to allow sizing based on the criterion for Non-boiling liquid.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    3) Must also compare and ensure the velocity shall not higher than erosional velocity from API RP14E. If higher, the limit at erosional velocity from API RP14E should be applied.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    4) Maximum velocity is 5 m/s but recommended at 3 m/s.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    5) Minimum velocity of tube side heat exchanger should be higher than 1 m/s for prevent fouling.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    6) Two-phase flow.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                    7) Minimum velocity is 0.8 m/s to prevent the settling of sand in pipes.
                </Typography>
                <Typography variant="body2">
                    8) Minimum velocity is 1.5 m/s.
                </Typography>
            </Box>
        </Box>
    );
};