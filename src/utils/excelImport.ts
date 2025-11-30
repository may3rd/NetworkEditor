import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { NetworkState, NodeProps, PipeProps, FittingType } from '@/lib/types';
import { PIPE_FITTING_OPTIONS } from '@/components/PipeDimension';

// Columns to check for pipes (H, K, N, Q, T, W, Z, AC)
const PIPE_COLUMNS = [7, 10, 13, 16, 19, 22, 25, 28];

// Row mapping based on backend-repo/Book1.xlsx
export const ROW_MAPPING = {
    name: 5,           // Row 6
    length: 37,        // Row 38
    diameter: 33,      // Row 34
    inletDiameter: 34, // Row 35
    outletDiameter: 35,// Row 36
    roughness: 36,     // Row 37
    massFlow: 17,      // Row 18
    phase: 10,         // Row 11
    density: 24,       // Row 25
    viscosity: 28,     // Row 29 (Liquid)
    gasViscosity: 28,  // Row 29 (Gas)
    molecularWeight: 25, // Row 26
    zFactor: 26,       // Row 27
    specificHeatRatio: 27, // Row 28
    temperature: 23,   // Row 24
    pressure: 14,      // Row 15
    direction: 12,     // Row 13
    gasFlowModel: 13,  // Row 14
    elevation: 38,     // Row 39
    erosionalConstant: 39, // Row 40
    fittingType: 40,   // Row 41
    userK: 64,         // Row 65
    pipingFittingSafetyFactor: 66, // Row 67
    controlValvePressureDrop: 88, // Row 89
    userSpecifiedPressureLoss: 90, // Row 91
    fittingsStart: 42, // Row 43
    fittingsEnd: 59,   // Row 60
};

export const parseExcelNetwork = async (file: File): Promise<NetworkState | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const nodes: NodeProps[] = [];
                const pipes: PipeProps[] = [];
                let yPos = 0; // Start Y position for the first sheet

                // Filter out auto-only fittings (swages) to match the 18 rows
                const fittingOptions = PIPE_FITTING_OPTIONS.filter(opt => !opt.autoOnly);

                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];

                    // Check C2 (Row 1, Col 2) for validation
                    const c2Address = XLSX.utils.encode_cell({ r: 1, c: 2 });
                    const c2Cell = sheet[c2Address];
                    const c2Value = c2Cell ? String(c2Cell.v).trim() : "";

                    if (c2Value !== "SINGLE PHASE FLOW PRESSURE DROP") {
                        return; // Skip this sheet
                    }

                    let xPos = 0;
                    const xSpacing = 200;

                    PIPE_COLUMNS.forEach((colIndex, i) => {
                        const cellAddress = (row: number) => XLSX.utils.encode_cell({ r: row, c: colIndex });

                        const getValue = (row: number) => {
                            const cell = sheet[cellAddress(row)];
                            return cell ? cell.v : undefined;
                        };

                        const nameVal = getValue(ROW_MAPPING.name);
                        if (!nameVal) {
                            return; // Skip if no name (empty column config)
                        }
                        const name = String(nameVal);

                        const length = Number(getValue(ROW_MAPPING.length))
                        // Diameter Logic
                        // User Request: "only read pipe diameter from row 34, no NPS mode"
                        // User Request: "also read inlet and outlet diameter, if in excel has value, row 35 and 36"
                        const rawDiameter = getValue(ROW_MAPPING.diameter);
                        const diameterVal = Number(rawDiameter) || 102.26; // Default if missing

                        const rawInlet = getValue(ROW_MAPPING.inletDiameter);
                        const rawOutlet = getValue(ROW_MAPPING.outletDiameter);

                        const diameterInputMode = "diameter";
                        const diameter = diameterVal;
                        const pipeDiameter = diameterVal;

                        const inletDiameter = (rawInlet !== undefined && rawInlet !== null && rawInlet !== "")
                            ? Number(rawInlet)
                            : diameterVal;

                        const outletDiameter = (rawOutlet !== undefined && rawOutlet !== null && rawOutlet !== "")
                            ? Number(rawOutlet)
                            : diameterVal;

                        const roughness = Number(getValue(ROW_MAPPING.roughness)) || 0.0457;
                        const massFlow = Number(getValue(ROW_MAPPING.massFlow)) || 1000;

                        const phaseRaw = getValue(ROW_MAPPING.phase) as string;
                        const phase = (phaseRaw && phaseRaw.toLowerCase().includes("vapor")) ? "gas" : "liquid";

                        const density = Number(getValue(ROW_MAPPING.density)) || (phase === "liquid" ? 997 : 1);

                        // Viscosity: Row 29 for both, but let's be explicit based on phase if needed,
                        // though user said "29 for viscosity" generally or specifically for gas?
                        // "add data row in excel for gas ... 29 for viscosity"
                        const liquidViscosity = Number(getValue(ROW_MAPPING.viscosity)) || 1; // Default for liquid
                        const gasViscosity = Number(getValue(ROW_MAPPING.gasViscosity)) || 0.01; // Default for gas
                        const viscosity = phase === "liquid" ? liquidViscosity : gasViscosity;

                        const molecularWeight = Number(getValue(ROW_MAPPING.molecularWeight));
                        const zFactor = Number(getValue(ROW_MAPPING.zFactor));
                        const specificHeatRatio = Number(getValue(ROW_MAPPING.specificHeatRatio));

                        const temperature = Number(getValue(ROW_MAPPING.temperature)) || 20;
                        const pressure = Number(getValue(ROW_MAPPING.pressure)) || 101.325;

                        const directionRaw = getValue(ROW_MAPPING.direction) as string;
                        const direction = (directionRaw && directionRaw.toLowerCase().includes("back")) ? "backward" : "forward";

                        const gasFlowModelRaw = getValue(ROW_MAPPING.gasFlowModel) as string;
                        const gasFlowModel = (gasFlowModelRaw && gasFlowModelRaw.toLowerCase().includes("iso")) ? "isothermal" : "adiabatic";

                        const elevation = Number(getValue(ROW_MAPPING.elevation)) || 0;
                        const erosionalConstant = Number(getValue(ROW_MAPPING.erosionalConstant)) || 100;
                        const fittingTypeStr = getValue(ROW_MAPPING.fittingType) as string;
                        const userK = Number(getValue(ROW_MAPPING.userK)) || 0;
                        const pipingFittingSafetyFactor = Number(getValue(ROW_MAPPING.pipingFittingSafetyFactor)) || 0;
                        const cvDrop = Number(getValue(ROW_MAPPING.controlValvePressureDrop));
                        const userDrop = Number(getValue(ROW_MAPPING.userSpecifiedPressureLoss)) || 0;

                        // Parse Fittings
                        const pipeFittings: FittingType[] = [];
                        for (let r = ROW_MAPPING.fittingsStart; r <= ROW_MAPPING.fittingsEnd; r++) {
                            const count = Number(getValue(r));
                            if (count > 0) {
                                const fittingIndex = r - ROW_MAPPING.fittingsStart;
                                if (fittingIndex < fittingOptions.length) {
                                    pipeFittings.push({
                                        type: fittingOptions[fittingIndex].value,
                                        count: count,
                                        k_each: 0, // Calculated later
                                        k_total: 0
                                    });
                                }
                            }
                        }

                        // Create Fluid Object
                        const fluid = {
                            id: phase === "liquid" ? "Liquid" : "Gas",
                            phase: phase,
                            density: density,
                            densityUnit: "kg/m3",
                            viscosity: viscosity,
                            viscosityUnit: "cP",
                            molecularWeight: phase === "gas" ? molecularWeight : undefined,
                            zFactor: phase === "gas" ? zFactor : undefined,
                            specificHeatRatio: phase === "gas" ? specificHeatRatio : undefined
                        };

                        // Create Nodes
                        const startNodeId = uuidv4();
                        const endNodeId = uuidv4();

                        const startNode: NodeProps = {
                            id: startNodeId,
                            label: `${name}_In`,
                            position: { x: xPos, y: yPos },
                        };

                        const endNode: NodeProps = {
                            id: endNodeId,
                            label: `${name}_Out`,
                            position: { x: xPos + xSpacing, y: yPos },
                        };

                        // Assign Fluid and Boundary Conditions based on Direction
                        if (direction === "forward") {
                            startNode.fluid = fluid;
                            startNode.pressure = pressure;
                            startNode.pressureUnit = 'kPag';
                            startNode.temperature = temperature;
                            startNode.temperatureUnit = 'C';
                        } else {
                            endNode.fluid = fluid;
                            endNode.pressure = pressure;
                            endNode.pressureUnit = 'kPag';
                            endNode.temperature = temperature;
                            endNode.temperatureUnit = 'C';
                        }

                        nodes.push(startNode, endNode);

                        // Create Pipe
                        const pipe: PipeProps = {
                            id: uuidv4(),
                            name: name,
                            startNodeId: startNodeId,
                            endNodeId: endNodeId,
                            boundaryPressure: pressure,
                            boundaryPressureUnit: 'kPag',
                            boundaryTemperature: temperature,
                            boundaryTemperatureUnit: 'C',
                            length: length,
                            lengthUnit: 'm',
                            diameter: diameter,
                            diameterUnit: 'mm',
                            diameterInputMode: diameterInputMode,
                            pipeDiameter: pipeDiameter,
                            pipeDiameterUnit: 'mm',
                            inletDiameter: inletDiameter,
                            inletDiameterUnit: 'mm',
                            outletDiameter: outletDiameter,
                            outletDiameterUnit: 'mm',
                            elevation: elevation,
                            elevationUnit: 'm',
                            roughness: roughness,
                            roughnessUnit: 'mm',
                            massFlowRate: massFlow,
                            massFlowRateUnit: 'kg/h',
                            direction: direction,
                            gasFlowModel: phase === "gas" ? gasFlowModel : undefined,
                            pipeSectionType: cvDrop > 0 ? 'control valve' : 'pipeline',
                            fluid: { ...fluid },
                            erosionalConstant: erosionalConstant,
                            fittingType: fittingTypeStr,
                            userK: userK,
                            pipingFittingSafetyFactor: pipingFittingSafetyFactor,
                            userSpecifiedPressureLoss: userDrop,
                            userSpecifiedPressureLossUnit: 'kPa', // Assuming Pa or kPa? Usually Pa in backend but let's assume Pa for now or check unit.
                            fittings: pipeFittings,
                            controlValve: cvDrop > 0 ? {
                                id: uuidv4(),
                                inputMode: 'pressure_drop',
                                pressureDrop: cvDrop,
                                pressureDropUnit: 'kPa' // Assuming kPa
                            } : undefined
                        };

                        pipes.push(pipe);

                        xPos += xSpacing * 2; // Move to next position
                    });

                    // Increment Y position for the next sheet to avoid overlap
                    yPos += 500;
                });

                resolve({ nodes, pipes });
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
