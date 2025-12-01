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
    Tooltip,
} from "@mui/material";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import { RowConfig } from "./summary/tableConfig";

type Props<T> = {
    data: T[];
    rowConfigs: RowConfig<T>[];
    keyExtractor: (item: T) => string;
    labelExtractor: (item: T, index: number) => string;
    title?: string;
    headerActions?: React.ReactNode;
    isSnapshot?: boolean;
    initialRowsPerPage?: number;
    onColumnSettingsClick?: () => void;
};

export function GenericTable<T>({
    data,
    rowConfigs,
    keyExtractor,
    labelExtractor,
    title,
    headerActions,
    isSnapshot = false,
    initialRowsPerPage = 8,
    onColumnSettingsClick
}: Props<T>) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
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

    const visibleData = isSnapshot ? data : data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const emptyColumnsCount = isSnapshot
        ? (8 - (visibleData.length % 8)) % 8
        : Math.max(0, rowsPerPage - visibleData.length);

    const emptyColumns = Array(emptyColumnsCount).fill(null);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        // 1. Headers
        const headerRow = ["Property", "Unit", ...data.map((item, i) => labelExtractor(item, i))];
        const csvRows = [headerRow.map(cell => `"${cell}"`).join(",")];

        // 2. Data Rows
        rowConfigs.forEach(row => {
            if (row.type === "section") {
                // Section header row
                const sectionRow = [`"${row.label}"`, ...Array(data.length + 1).fill("")];
                csvRows.push(sectionRow.join(","));
            } else {
                // Data row
                const rowData = [
                    `"${row.label}"`,
                    `"${row.unit || ""}"`
                ];

                data.forEach(item => {
                    const result = row.getValue(item);
                    let value = "";

                    if (result !== null && result !== undefined) {
                        if (typeof result === 'object') {
                            value = result.value !== null && result.value !== undefined ? String(result.value) : "";
                        } else {
                            value = String(result);
                        }
                    }
                    // Escape quotes in value
                    value = value.replace(/"/g, '""');
                    rowData.push(`"${value}"`);
                });

                csvRows.push(rowData.join(","));
            }
        });

        // 3. Create Blob and Download
        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "summary_table.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Paper id="summary-table-print-area" className={fitToPage ? "fit-to-page" : ""} sx={{ width: "100%", overflow: "hidden", p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box className="print-header-container" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flex: 1, textAlign: "center" }}>
                    {title}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }} className="no-print">
                    {headerActions}
                    {/* <FormControlLabel
                        control={
                            <Switch
                                checked={fitToPage}
                                onChange={(e) => setFitToPage(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Fit Height to Page"
                    /> */}
                    {onColumnSettingsClick && (
                        <Tooltip title="Column Settings">
                            <Button
                                variant="outlined"
                                startIcon={<SettingsIcon />}
                                onClick={onColumnSettingsClick}
                                size="small"
                            >
                                Columns
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Print Table">
                        <Button
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={handlePrint}
                            size="small"
                        >
                            Print
                        </Button>
                    </Tooltip>
                    <Tooltip title="Export CSV">
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCSV}
                            size="small"
                        >
                            CSV
                        </Button>
                    </Tooltip>
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
                        color: black !important; /* Force black text */
                        background-color: white !important; /* Force white background */
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
                        border: 1px solid #000 !important; /* distinct border */
                    }
                    /* Remove sticky positioning for print */
                    .MuiTableCell-stickyHeader, .MuiTableCell-root {
                        position: static !important;
                        border-right: 1px solid #ccc !important;
                        border-bottom: 1px solid #ccc !important;
                        box-shadow: none !important; /* Remove shadows */
                    }
                    /* Add top and left borders to the table to complete the outer border */
                    .MuiTable-root {
                        border-top: 1px solid #ccc !important;
                        border-left: 1px solid #ccc !important;
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
                        padding: 0px 2px !important;
                        font-size: 8pt !important; /* Increased from 6pt */
                        line-height: 1.2 !important;
                        height: auto !important; /* Allow height to adjust */
                        min-height: 0 !important;
                    }
                    .fit-to-page .MuiTypography-root {
                        font-size: 8pt !important;
                    }
                    .fit-to-page .MuiTypography-caption {
                        font-size: 6pt !important;
                        line-height: 1 !important;
                        color: #444 !important;
                    }

                    /* Column Width Adjustments for Print */
                    /* Property Column */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(1),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(1) {
                        width: 160px !important;
                        min-width: 160px !important;
                        max-width: 160px !important;
                        white-space: normal !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    /* Unit Column */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(2),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(2) {
                        width: 40px !important;
                        min-width: 40px !important;
                        max-width: 40px !important;
                        padding: 0px 1px !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                    }
                    /* Data Columns */
                    .MuiTableHead-root .MuiTableCell-root:nth-of-type(n+3),
                    .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root:nth-of-type(n+3) {
                        width: auto !important; /* Allow expansion */
                        min-width: 50px !important;
                    }

                    /* Fix empty page at the end */
                    html, body {
                        height: auto !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: white !important;
                    }
                    #summary-table-print-area {
                        height: auto !important;
                        overflow: visible !important;
                        width: 99% !important; /* Prevent horizontal overflow */
                    }
                    #summary-table-print-area.fit-to-page {
                        transform: scale(1); /* Reset scale, rely on font size */
                        transform-origin: top left;
                    }
                    /* Ensure dummy cells have borders */
                    .dummy-cell {
                        border-right: 1px solid #ccc !important;
                        border-bottom: 1px solid #ccc !important;
                    }
                }
                `}
            </style>
            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #e0e0e0' }}>
                <Table stickyHeader aria-label="sticky table" size="small" sx={{ borderCollapse: 'separate' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: 240, position: 'sticky', left: 0, bgcolor: 'background.default', zIndex: "9999 !important", borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0' }}>
                                Property
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', width: 60, position: 'sticky', left: 240, bgcolor: 'background.default', zIndex: "9999 !important", borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0' }}>
                                Unit
                            </TableCell>
                            {visibleData.map((item, index) => (
                                <TableCell key={keyExtractor(item)} align="center" sx={{ minWidth: 110, borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0', bgcolor: 'background.default' }}>
                                    {labelExtractor(item, index + (page * rowsPerPage))}
                                </TableCell>
                            ))}
                            {emptyColumns.map((_, index) => (
                                <TableCell key={`dummy-head-${index}`} sx={{ minWidth: 110, borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0', bgcolor: 'background.default' }} />
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rowConfigs.map((row, index) => {
                            if (row.type === "section") {
                                return (
                                    <TableRow key={index} sx={{ bgcolor: "background.default" }}>
                                        <TableCell colSpan={2} sx={{ position: 'sticky', left: 0, width: 300, fontWeight: "bold" }}>
                                            {row.label}
                                        </TableCell>
                                        <TableCell colSpan={visibleData.length + emptyColumnsCount} sx={{}} />
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow hover key={index}>
                                    <TableCell component="th" scope="row" sx={(theme) => ({
                                        minWidth: 240,
                                        width: 240,
                                        position: 'sticky',
                                        left: 0,
                                        bgcolor: 'background.paper',
                                        boxShadow: "1px 1px 1px text.secondary",
                                        borderRight: '1px solid #e0e0e0',
                                        '.MuiTableRow-root:hover &': {
                                            bgcolor: 'background.paper',
                                            backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
                                        }
                                    })}>
                                        {row.label}
                                        {row.subLabel && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {row.subLabel}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={(theme) => ({
                                        width: 60,
                                        position: 'sticky',
                                        left: 240,
                                        bgcolor: 'background.paper',
                                        boxShadow: "1px 1px 1px text.secondary",
                                        borderRight: '1px solid #e0e0e0',
                                        color: 'text.secondary',
                                        '.MuiTableRow-root:hover &': {
                                            bgcolor: 'background.paper',
                                            backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
                                        }
                                    })}>
                                        {row.unit || ""}
                                    </TableCell>
                                    {visibleData.map((item) => {
                                        const result = row.getValue(item);
                                        const value = typeof result === 'object' && result !== null ? result.value : result;
                                        const cellSubLabel = typeof result === 'object' && result !== null ? result.subLabel : undefined;
                                        const cellColor = typeof result === 'object' && result !== null ? result.color : undefined;
                                        const cellHelperText = typeof result === 'object' && result !== null ? result.helperText : undefined;
                                        const cellFontWeight = typeof result === 'object' && result !== null ? result.fontWeight : undefined;

                                        return (
                                            <TableCell key={keyExtractor(item)} align="center" sx={{ borderRight: '1px solid #e0e0e0', color: cellColor, fontWeight: cellFontWeight }}>
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
                                    {emptyColumns.map((_, index) => (
                                        <TableCell key={`dummy-cell-${index}`} className="dummy-cell" sx={{ borderRight: '1px solid #e0e0e0' }} />
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            {!isSnapshot && (
                <TablePagination
                    className="no-print"
                    rowsPerPageOptions={[8, 16, 24, 100]}
                    component="div"
                    count={data.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Items per page:"
                />
            )}
        </Paper>
    );
}
