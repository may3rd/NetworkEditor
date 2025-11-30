import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Typography, Switch, RadioGroup, FormControlLabel, Radio, IconButton } from "@mui/material";
import { glassInputSx, glassSelectSx, glassRadioSx } from "@/lib/glassStyles";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../../QuantityInput";
import { getScheduleEntries, nearest_pipe_diameter, PIPE_FITTING_OPTIONS } from "../../PipeDimension";
import { PipeProps, PipePatch, FittingType, ViewSettings } from "@/lib/types";
import { IOSListGroup } from "../../ios/IOSListGroup";
import { IOSListItem } from "../../ios/IOSListItem";
import { IOSContainer } from "../../ios/IOSContainer";
import { IOSTextField } from "../../ios/IOSTextField";
import { IOSQuantityPage } from "./IOSQuantityPage";
import { Check, ArrowForwardIos, Add, Remove } from "@mui/icons-material";
import { Navigator } from "../../PropertiesPanel";
import { convertUnit } from "@/lib/unitConversion";

import { useState, useEffect, useRef } from "react";

// --- Name & Description ---

export const NamePage = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <Box sx={{ p: 2 }}>
        <IOSTextField
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClear={() => onChange("")}
            placeholder="Name"
            autoFocus
        />
    </Box>
);

export const DescriptionPage = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <Box sx={{ p: 2 }}>
        <IOSTextField
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClear={() => onChange("")}
            placeholder="Description"
            multiline
            rows={4}
            autoFocus
        />
    </Box>
);

// --- Fluid ---

const FluidNamePage = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <Box sx={{ pt: 4 }}>
        <IOSListGroup>
            <IOSTextField
                fullWidth
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onClear={() => onChange("")}
                placeholder="Fluid Name"
                autoFocus
            />
        </IOSListGroup>
    </Box>
);

const FluidPhasePage = ({ value, onChange }: { value: "liquid" | "gas", onChange: (v: "liquid" | "gas") => void }) => {
    const [localValue, setLocalValue] = useState(value);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const isDirty = useRef(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        return () => {
            if (isDirty.current) {
                onChangeRef.current(valueRef.current);
            }
        };
    }, []);

    const handleSelect = (v: "liquid" | "gas") => {
        setLocalValue(v);
        valueRef.current = v;
        isDirty.current = true;
    };

    return (
        <Box sx={{ pt: 4 }}>
            <IOSListGroup>
                <IOSListItem
                    label="Liquid"
                    value={localValue === "liquid" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                    onClick={() => handleSelect("liquid")}
                />
                <IOSListItem
                    label="Gas"
                    value={localValue === "gas" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                    onClick={() => handleSelect("gas")}
                    last
                />
            </IOSListGroup>
        </Box>
    );
};

// --- Helper for Number Input ---
export const NumberInputPage = ({
    value,
    onChange,
    placeholder,
    autoFocus,
    min
}: {
    value: number | undefined,
    onChange: (val: number | undefined) => void,
    placeholder: string,
    autoFocus?: boolean,
    min?: number
}) => {
    const [localValue, setLocalValue] = useState(value?.toString() ?? "");

    useEffect(() => {
        if (value !== undefined && Number(localValue) !== value) {
            setLocalValue(value.toString());
        } else if (value === undefined && localValue !== "") {
            setLocalValue("");
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        if (newVal.trim() === "") {
            onChange(undefined);
            return;
        }

        const num = parseFloat(newVal);
        if (!isNaN(num)) {
            if (min !== undefined && num < min) {
                return;
            }
            onChange(num);
        }
    };

    return (
        <Box sx={{ pt: 4 }}>
            <IOSListGroup>
                <IOSTextField
                    fullWidth
                    value={localValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    type="number"
                />
            </IOSListGroup>
        </Box>
    );
};

export const FluidPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {
    const fluid = pipe.fluid || { id: "fluid", phase: "liquid" };

    const openNamePage = () => {
        navigator.push("Fluid Name", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidNamePage
                    value={currentFluid.id}
                    onChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, id: v } })}
                />
            );
        });
    };

    const openPhasePage = () => {
        navigator.push("Phase", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidPhasePage
                    value={currentFluid.phase as "liquid" | "gas"}
                    onChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, phase: v } })}
                />
            );
        });
    };

    const openQuantityPage = (
        label: string,
        field: keyof typeof fluid,
        unitField: keyof typeof fluid,
        options: readonly string[],
        family: any, // UnitFamily
        min?: number
    ) => {
        navigator.push(label, (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
            return (
                <IOSQuantityPage
                    label={label}
                    value={(currentFluid as any)[field] ?? ""}
                    unit={(currentFluid as any)[unitField] ?? options[0]}
                    units={options}
                    unitFamily={family}
                    onValueChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, [field]: v } })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, [unitField]: u } })}
                    min={min}
                    autoFocus
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="General">
                <IOSListItem
                    label="Name"
                    value={fluid.id}
                    onClick={openNamePage}
                    chevron
                />
                <IOSListItem
                    label="Phase"
                    value={fluid.phase === "liquid" ? "Liquid" : "Gas"}
                    onClick={openPhasePage}
                    chevron
                    last
                />
            </IOSListGroup>

            {fluid.phase === "liquid" ? (
                <IOSListGroup header="Liquid Properties">
                    <IOSListItem
                        label="Density"
                        value={`${fluid.density ?? "-"} ${fluid.densityUnit ?? "kg/m3"}`}
                        onClick={() => openQuantityPage("Density", "density", "densityUnit", QUANTITY_UNIT_OPTIONS.density, "density", 0)}
                        chevron
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            ) : (
                <IOSListGroup header="Gas Properties">


                    <IOSListItem
                        label="Molecular Weight"
                        value={fluid.molecularWeight?.toString() ?? "-"}
                        onClick={() => navigator.push("Molecular Weight", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.molecularWeight}
                                    onChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, molecularWeight: val } })}
                                    placeholder="Molecular Weight"
                                    autoFocus
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Z Factor"
                        value={fluid.zFactor?.toString() ?? "-"}
                        onClick={() => navigator.push("Z Factor", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.zFactor}
                                    onChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, zFactor: val } })}
                                    placeholder="Z Factor"
                                    autoFocus
                                />
                            );
                        })}
                        chevron
                    />
                    <IOSListItem
                        label="Specific Heat Ratio"
                        value={fluid.specificHeatRatio?.toString() ?? "-"}
                        onClick={() => navigator.push("Specific Heat Ratio", (net, nav) => {
                            const currentPipe = net.pipes.find(p => p.id === pipe.id);
                            if (!currentPipe) return null;
                            const currentFluid = currentPipe.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.specificHeatRatio}
                                    onChange={(val) => onUpdatePipe(pipe.id, { fluid: { ...currentFluid, specificHeatRatio: val } })}
                                    placeholder="Specific Heat Ratio"
                                    autoFocus
                                />
                            );
                        })}
                        chevron
                        last
                    />
                </IOSListGroup>
            )}
        </Box>
    );
};

// --- Mass Flow Rate ---

export const MassFlowRatePage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <IOSQuantityPage
        label="Mass Flow Rate"
        value={pipe.massFlowRate ?? ""}
        unit={pipe.massFlowRateUnit ?? "kg/h"}
        units={QUANTITY_UNIT_OPTIONS.massFlowRate}
        unitFamily="massFlowRate"
        onValueChange={(v) => onUpdatePipe(pipe.id, { massFlowRate: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { massFlowRateUnit: u })}
        min={0}
        autoFocus
    />
);

// --- Dimensions (Diameter) ---

// --- Dimensions (Diameter) ---

const DiameterInputModePage = ({ value, onChange }: { value: "nps" | "diameter", onChange: (v: "nps" | "diameter") => void }) => (
    <Box sx={{ pt: 4 }}>
        <IOSListGroup>
            <IOSListItem
                label="NPS"
                value={value === "nps" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("nps")}
            />
            <IOSListItem
                label="Diameter"
                value={value === "diameter" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("diameter")}
                last
            />
        </IOSListGroup>
    </Box>
);

const PIPE_SCHEDULES = [
    "5", "10", "20", "30", "40", "60", "80", "100", "120", "140", "160",
    "STD", "XS", "XXS", "5S", "10S", "40S", "80S"
] as const;

const SchedulePage = ({ value, onChange }: { value: string, onChange: (v: any) => void }) => (
    <Box sx={{ pt: 4 }}>
        <IOSListGroup>
            {PIPE_SCHEDULES.map((schedule, index) => (
                <IOSListItem
                    key={schedule}
                    label={schedule}
                    value={value === schedule ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                    onClick={() => onChange(schedule)}
                    last={index === PIPE_SCHEDULES.length - 1}
                />
            ))}
        </IOSListGroup>
    </Box>
);



const NPDSelectionPage = ({ schedule, value, onChange }: { schedule: string, value: number | undefined, onChange: (v: number) => void }) => {
    const entries = getScheduleEntries(schedule as any) || [];

    return (
        <Box sx={{ pt: 4 }}>
            <IOSListGroup>
                {entries.map((entry, index) => (
                    <IOSListItem
                        key={entry.nps}
                        label={entry.nps.toString()}
                        value={value === entry.nps ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                        onClick={() => onChange(entry.nps)}
                        last={index === entries.length - 1}
                    />
                ))}
            </IOSListGroup>
        </Box>
    );
};

export const DiameterPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {

    const openInputModePage = () => {
        navigator.push("Pipe Diameter Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <DiameterInputModePage
                    value={currentPipe.diameterInputMode ?? "nps"}
                    onChange={(v) => onUpdatePipe(pipe.id, { diameterInputMode: v })}
                />
            );
        });
    };

    const openSchedulePage = () => {
        navigator.push("Schedule", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <SchedulePage
                    value={currentPipe.pipeSchedule ?? "40"}
                    onChange={(v) => {
                        const newDiameter = nearest_pipe_diameter(currentPipe.pipeNPD, v);
                        onUpdatePipe(pipe.id, {
                            pipeSchedule: v,
                            ...(newDiameter !== undefined ? { diameter: newDiameter, diameterUnit: "mm" } : {})
                        });
                    }}
                />
            );
        });
    };

    const openNPDPage = () => {
        navigator.push("NPD", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <NPDSelectionPage
                    schedule={currentPipe.pipeSchedule ?? "40"}
                    value={currentPipe.pipeNPD}
                    onChange={(v) => {
                        const newDiameter = nearest_pipe_diameter(v, currentPipe.pipeSchedule ?? "40");
                        onUpdatePipe(pipe.id, {
                            pipeNPD: v,
                            ...(newDiameter !== undefined ? { diameter: newDiameter, diameterUnit: "mm" } : {})
                        });
                    }}
                />
            );
        });
    };

    const openDiameterQuantityPage = (
        label: string,
        field: "diameter" | "outletDiameter" | "inletDiameter",
        unitField: "diameterUnit" | "outletDiameterUnit" | "inletDiameterUnit"
    ) => {
        navigator.push(label, (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <IOSQuantityPage
                    label={label}
                    value={currentPipe[field] ?? ""}
                    unit={currentPipe[unitField] ?? "mm"}
                    units={["mm", "cm", "m", "in", "ft"]}
                    unitFamily="length"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { [field]: v })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { [unitField]: u })}
                    min={0}
                    autoFocus
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="Configuration">
                <IOSListItem
                    label="Pipe Diameter Mode"
                    value={pipe.diameterInputMode === "diameter" ? "Diameter" : "NPS"}
                    onClick={openInputModePage}
                    chevron
                    last
                />
            </IOSListGroup>

            {pipe.diameterInputMode === "diameter" ? (
                <IOSListGroup header="Dimensions">
                    <IOSListItem
                        label="Pipe Diameter"
                        value={`${typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} ${pipe.diameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Pipe Diameter", "diameter", "diameterUnit")}
                        chevron
                    />

                    <IOSListItem
                        label="Inlet Diameter"
                        value={`${typeof pipe.inletDiameter === 'number' ? pipe.inletDiameter.toFixed(3) : "-"} ${pipe.inletDiameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Inlet Diameter", "inletDiameter", "inletDiameterUnit")}
                        chevron
                    />
                    <IOSListItem
                        label="Outlet Diameter"
                        value={`${typeof pipe.outletDiameter === 'number' ? pipe.outletDiameter.toFixed(3) : "-"} ${pipe.outletDiameterUnit ?? "mm"}`}
                        onClick={() => openDiameterQuantityPage("Outlet Diameter", "outletDiameter", "outletDiameterUnit")}
                        chevron
                        last
                    />
                </IOSListGroup>
            ) : (
                <>
                    <IOSListGroup header="Nominal Pipe Size">
                        <IOSListItem
                            label="NPD"
                            value={pipe.pipeNPD?.toString() ?? "-"}
                            onClick={openNPDPage}
                            chevron
                        />
                        <IOSListItem
                            label="Schedule"
                            value={pipe.pipeSchedule ?? "-"}
                            onClick={openSchedulePage}
                            chevron
                            last
                        />
                    </IOSListGroup>
                    <Typography variant="caption" sx={{ px: 2, pt: 1, pb: 2, display: "block", color: "text.secondary" }}>
                        Pipe Diameter: {typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} {pipe.diameterUnit ?? "mm"}
                    </Typography>

                    <IOSListGroup header="Dimensions">
                        <IOSListItem
                            label="Inlet Diameter"
                            value={`${typeof pipe.inletDiameter === 'number' ? pipe.inletDiameter.toFixed(3) : "-"} ${pipe.inletDiameterUnit ?? "mm"}`}
                            onClick={() => openDiameterQuantityPage("Inlet Diameter", "inletDiameter", "inletDiameterUnit")}
                            chevron
                        />

                        <IOSListItem
                            label="Outlet Diameter"
                            value={`${typeof pipe.outletDiameter === 'number' ? pipe.outletDiameter.toFixed(3) : "-"} ${pipe.outletDiameterUnit ?? "mm"}`}
                            onClick={() => openDiameterQuantityPage("Outlet Diameter", "outletDiameter", "outletDiameterUnit")}
                            chevron
                            last
                        />
                    </IOSListGroup>
                </>
            )}
        </Box>
    );
};

// --- Calculation Type ---

export const CalculationTypePage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <Box sx={{ pt: 2 }}>
        <IOSListGroup>
            {["pipeline", "control valve", "orifice"].map((type) => (
                <IOSListItem
                    key={type}
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                    onClick={() => onUpdatePipe(pipe.id, { pipeSectionType: type as any })}
                    last={type === "orifice"}
                    value={pipe.pipeSectionType === type ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                />
            ))}
        </IOSListGroup>
    </Box>
);

// --- Length & Elevation ---

export const LengthPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <IOSQuantityPage
        label="Length"
        value={pipe.length ?? ""}
        unit={pipe.lengthUnit ?? "m"}
        units={QUANTITY_UNIT_OPTIONS.length}
        unitFamily="length"
        onValueChange={(v) => onUpdatePipe(pipe.id, { length: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { lengthUnit: u })}
        min={0}
        autoFocus
    />
);

export const ElevationPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <IOSQuantityPage
        label="Elevation Change"
        value={pipe.elevation ?? ""}
        unit={pipe.elevationUnit ?? "m"}
        units={QUANTITY_UNIT_OPTIONS.length}
        unitFamily="length"
        onValueChange={(v) => onUpdatePipe(pipe.id, { elevation: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { elevationUnit: u })}
        autoFocus
    />
);

// --- Control Valve & Orifice ---

const ControlValveInputModePage = ({ value, onChange }: { value: "cv" | "pressure_drop", onChange: (v: "cv" | "pressure_drop") => void }) => (
    <Box sx={{ pt: 4 }}>
        <IOSListGroup>
            <IOSListItem
                label="CV"
                value={value === "cv" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("cv")}
            />
            <IOSListItem
                label="Pressure Drop"
                value={value === "pressure_drop" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("pressure_drop")}
                last
            />
        </IOSListGroup>
    </Box>
);

const OrificeInputModePage = ({ value, onChange }: { value: "beta_ratio" | "pressure_drop", onChange: (v: "beta_ratio" | "pressure_drop") => void }) => (
    <Box sx={{ pt: 4 }}>
        <IOSListGroup>
            <IOSListItem
                label="Beta Ratio"
                value={value === "beta_ratio" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("beta_ratio")}
            />
            <IOSListItem
                label="Pressure Drop"
                value={value === "pressure_drop" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onChange("pressure_drop")}
                last
            />
        </IOSListGroup>
    </Box>
);

export const ControlValvePage = ({ pipe, onUpdatePipe, navigator, viewSettings }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator, viewSettings: ViewSettings }) => {
    const cvData = pipe.controlValve || { id: "cv", inputMode: "cv" };
    const isGas = pipe.fluid?.phase === "gas";
    const inputMode = cvData.inputMode || "cv";

    const openInputModePage = () => {
        navigator.push("Input Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "cv" };
            return (
                <ControlValveInputModePage
                    value={currentCV.inputMode || "cv"}
                    onChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, inputMode: v } })}
                />
            );
        });
    };

    const openCVPage = () => {
        navigator.push("CV Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "cv" };
            return (
                <NumberInputPage
                    value={currentCV.cv}
                    onChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, cv: v, cg: undefined } })}
                    placeholder="CV Value"
                    autoFocus
                    min={0}
                />
            );
        });
    };

    const openCgPage = () => {
        navigator.push("Cg Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "cv" };
            return (
                <NumberInputPage
                    value={currentCV.cg}
                    onChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, cg: v, cv: undefined } })}
                    placeholder="Cg Value"
                    autoFocus
                    min={0}
                />
            );
        });
    };

    const openPressureDropPage = () => {
        navigator.push("Pressure Drop", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentCV = currentPipe.controlValve || { id: "cv", inputMode: "cv" };
            return (
                <IOSQuantityPage
                    label="Pressure Drop"
                    value={currentCV.pressureDrop ?? ""}
                    unit={currentCV.pressureDropUnit ?? "kPa"}
                    units={["Pa", "kPa", "bar", "psi"]}
                    unitFamily="pressure"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, pressureDrop: v } })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { controlValve: { ...currentCV, pressureDropUnit: u } })}
                    min={0}
                    autoFocus
                />
            );
        });
    };

    // Helper to format pressure drop
    const getFormattedPressureDrop = () => {
        const dp = pipe.pressureDropCalculationResults?.controlValvePressureDrop;
        if (dp === undefined) return "-";

        // Default to kPa if no unit system preferred, or use logic similar to formatPressure
        let unit = "kPa";
        if (viewSettings.unitSystem === "imperial") unit = "psi";
        else if (viewSettings.unitSystem === "metric_kgcm2") unit = "kg/cm2";
        else if (viewSettings.unitSystem === "fieldSI") unit = "bar";

        const val = convertUnit(dp, "Pa", unit);
        return `${val.toFixed(2)} ${unit}`;
    };

    return (
        <>
            <IOSListItem
                label="Input Mode"
                value={inputMode === "cv" ? (isGas ? "Cg" : "CV") : "Pressure Drop"}
                onClick={openInputModePage}
                chevron
            />
            {inputMode === "cv" ? (
                isGas ? (
                    <IOSListItem
                        label="Cg"
                        value={cvData.cg?.toString() ?? "-"}
                        onClick={openCgPage}
                        chevron
                    />
                ) : (
                    <IOSListItem
                        label="CV"
                        value={cvData.cv?.toString() ?? "-"}
                        onClick={openCVPage}
                        chevron
                    />
                )
            ) : (
                <IOSListItem
                    label="Pressure Drop"
                    value={`${cvData.pressureDrop ?? "-"} ${cvData.pressureDropUnit ?? "kPa"}`}
                    onClick={openPressureDropPage}
                    chevron
                />
            )}
            {inputMode === "cv" ? (
                <IOSListItem
                    label="Calculated dP"
                    value={getFormattedPressureDrop()}
                    last
                />
            ) : (
                isGas ? (
                    <IOSListItem
                        label="Calculated Cg"
                        value={pipe.pressureDropCalculationResults?.controlValveCg?.toFixed(2) ?? "-"}
                        last
                    />
                ) : (
                    <IOSListItem
                        label="Calculated CV"
                        value={pipe.pressureDropCalculationResults?.controlValveCV?.toFixed(2) ?? "-"}
                        last
                    />
                )
            )}
        </>
    );
};

export const OrificePage = ({ pipe, onUpdatePipe, navigator, viewSettings }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator, viewSettings: ViewSettings }) => {
    const orificeData = pipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
    const inputMode = orificeData.inputMode || "beta_ratio";

    const openInputModePage = () => {
        navigator.push("Input Mode", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
            return (
                <OrificeInputModePage
                    value={currentOrifice.inputMode || "beta_ratio"}
                    onChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, inputMode: v } })}
                />
            );
        });
    };

    const openBetaRatioPage = () => {
        navigator.push("Beta Ratio", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
            return (
                <NumberInputPage
                    value={currentOrifice.betaRatio}
                    onChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, betaRatio: v } })}
                    placeholder="Beta Ratio"
                    autoFocus
                    min={0}
                />
            );
        });
    };

    const openPressureDropPage = () => {
        navigator.push("Pressure Drop", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            const currentOrifice = currentPipe.orifice || { id: "orifice", inputMode: "beta_ratio" };
            return (
                <IOSQuantityPage
                    label="Pressure Drop"
                    value={currentOrifice.pressureDrop ?? ""}
                    unit={currentOrifice.pressureDropUnit ?? "kPa"}
                    units={["Pa", "kPa", "bar", "psi"]}
                    unitFamily="pressure"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, pressureDrop: v } })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { orifice: { ...currentOrifice, pressureDropUnit: u } })}
                    min={0}
                    autoFocus
                />
            );
        });
    };

    // Helper to format pressure drop
    const getFormattedPressureDrop = () => {
        const dp = pipe.pressureDropCalculationResults?.orificePressureDrop;
        if (dp === undefined) return "-";

        // Default to kPa if no unit system preferred, or use logic similar to formatPressure
        let unit = "kPa";
        if (viewSettings.unitSystem === "imperial") unit = "psi";
        else if (viewSettings.unitSystem === "metric_kgcm2") unit = "kg/cm2";

        const val = convertUnit(dp, "Pa", unit);
        return `${val.toFixed(2)} ${unit}`;
    };

    return (
        <>
            <IOSListItem
                label="Input Mode"
                value={inputMode === "beta_ratio" ? "Beta Ratio" : "Pressure Drop"}
                onClick={openInputModePage}
                chevron
            />
            {inputMode === "beta_ratio" ? (
                <IOSListItem
                    label="Beta Ratio"
                    value={orificeData.betaRatio?.toString() ?? "-"}
                    onClick={openBetaRatioPage}
                    chevron
                />
            ) : (
                <IOSListItem
                    label="Pressure Drop"
                    value={`${orificeData.pressureDrop ?? "-"} ${orificeData.pressureDropUnit ?? "kPa"}`}
                    onClick={openPressureDropPage}
                    chevron
                />
            )}
            {inputMode === "beta_ratio" ? (
                <IOSListItem
                    label="Calculated dP"
                    value={getFormattedPressureDrop()}
                    last
                />
            ) : (
                <IOSListItem
                    label="Calculated Beta Ratio"
                    value={pipe.pressureDropCalculationResults?.orificeBetaRatio?.toFixed(4) ?? "-"}
                    last
                />
            )}
        </>
    );
};

export const UserSpecifiedPressureLossPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <IOSQuantityPage
        label="User Specified Drop"
        value={pipe.userSpecifiedPressureLoss ?? ""}
        unit={pipe.userSpecifiedPressureLossUnit ?? "Pa"}
        units={["Pa", "kPa", "bar", "psi"]}
        unitFamily="pressure"
        onValueChange={(v) => onUpdatePipe(pipe.id, { userSpecifiedPressureLoss: v })}
        onUnitChange={(u) => onUpdatePipe(pipe.id, { userSpecifiedPressureLossUnit: u })}
        min={0}
        autoFocus
    />
);

// --- Direction ---

export const DirectionPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <Box sx={{ pt: 2 }}>
        <IOSListGroup>
            <IOSListItem
                label="Forward"
                value={(!pipe.direction || pipe.direction === "forward") ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onUpdatePipe(pipe.id, { direction: "forward" })}
            />
            <IOSListItem
                label="Backward"
                value={pipe.direction === "backward" ? <Check color="primary" sx={{ fontSize: 20 }} /> : ""}
                onClick={() => onUpdatePipe(pipe.id, { direction: "backward" })}
                last
            />
        </IOSListGroup>
    </Box>
);

// --- Pipe Fittings ---



export const PipeFittingsPage = ({ pipe, onUpdatePipe, navigator }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void, navigator: Navigator }) => {
    const fittings = pipe.fittings || [];

    const updateFitting = (type: string, count: number) => {
        const existingIndex = fittings.findIndex(f => f.type === type);
        let newFittings = [...fittings];

        if (existingIndex >= 0) {
            if (count > 0) {
                newFittings[existingIndex] = { ...newFittings[existingIndex], count };
            } else {
                newFittings.splice(existingIndex, 1);
            }
        } else if (count > 0) {
            newFittings.push({ type, count, k_each: 0, k_total: 0 }); // k_each/total will be calculated elsewhere
        }

        onUpdatePipe(pipe.id, { fittings: newFittings });
    };

    const getCount = (type: string) => fittings.find(f => f.type === type)?.count || 0;

    const openSafetyFactorPage = () => {
        navigator.push("Fitting Safety Factor", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <IOSQuantityPage
                    label="Fitting Safety Factor (%)"
                    value={currentPipe.pipingFittingSafetyFactor ?? ""}
                    unit="%"
                    units={["%"]}
                    unitFamily="dimensionless"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { pipingFittingSafetyFactor: v })}
                    onUnitChange={() => { }}
                    min={0}
                    autoFocus
                />
            );
        });
    };

    const openUserKPage = () => {
        navigator.push("User K Value", (net, nav) => {
            const currentPipe = net.pipes.find(p => p.id === pipe.id);
            if (!currentPipe) return null;
            return (
                <NumberInputPage
                    value={currentPipe.userK}
                    onChange={(v) => onUpdatePipe(pipe.id, { userK: v })}
                    placeholder="User K Value"
                    autoFocus
                    min={0}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="General">
                <IOSListItem
                    label="Fitting Safety Factor"
                    value={`${pipe.pipingFittingSafetyFactor ?? 0}%`}
                    onClick={openSafetyFactorPage}
                    chevron
                />
                <IOSListItem
                    label="User K Value"
                    value={pipe.userK?.toString() ?? "0.0"}
                    onClick={openUserKPage}
                    chevron
                    last
                />
            </IOSListGroup>

            <IOSListGroup header="Fittings">
                {PIPE_FITTING_OPTIONS.map((option, index) => {
                    const count = getCount(option.value);
                    const isToggle = option.value === "pipe_entrance_normal" || option.value === "pipe_entrance_raise" || option.value === "pipe_exit";
                    const isSwage = option.value === "inlet_swage" || option.value === "outlet_swage";

                    if (isSwage && count === 0) {
                        return null;
                    }

                    return (
                        <IOSListItem
                            key={option.value}
                            label={option.label}
                            control={isToggle ? (
                                <Switch
                                    size="small"
                                    checked={count > 0}
                                    onChange={(e) => updateFitting(option.value, e.target.checked ? 1 : 0)}
                                />
                            ) : undefined}
                            value={isSwage ? (() => {
                                const pipeDia = pipe.diameter || 0;
                                if (option.value === "inlet_swage") {
                                    const inletDia = pipe.inletDiameter || pipeDia;
                                    return inletDia < pipeDia ? "Expand" : "Reduce";
                                } else {
                                    const outletDia = pipe.outletDiameter || pipeDia;
                                    return outletDia < pipeDia ? "Reduce" : "Expand";
                                }
                            })() : (!isToggle ? (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateFitting(option.value, count + 1);
                                        }}
                                        sx={{
                                            width: "28px",
                                            height: "28px",
                                            color: (theme) => theme.palette.mode === 'dark' ? "#ffffff" : "#000000",
                                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                            "&:hover": {
                                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                                            }
                                        }}
                                    >
                                        <Add sx={{ fontSize: "16px" }} />
                                    </IconButton>
                                    <Typography sx={{ minWidth: "24px", textAlign: "center", fontSize: "14px" }}>
                                        {count}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateFitting(option.value, Math.max(0, count - 1));
                                        }}
                                        sx={{
                                            width: "28px",
                                            height: "28px",
                                            color: (theme) => theme.palette.mode === 'dark' ? "#ffffff" : "#000000",
                                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                            "&:hover": {
                                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                                            }
                                        }}
                                    >
                                        <Remove sx={{ fontSize: "16px" }} />
                                    </IconButton>
                                </Stack>
                            ) : undefined)}
                            onClick={(!isToggle && !isSwage) ? undefined : undefined}
                            chevron={!isToggle && !isSwage ? false : (!isToggle && !isSwage)}
                            last={index === PIPE_FITTING_OPTIONS.length - 1}
                        />
                    );
                })}
            </IOSListGroup>
        </Box>
    );
};

// --- Summary ---


export function PipeSummaryPage({ pipe, viewSettings }: { pipe: PipeProps, viewSettings: ViewSettings }) {
    const results = pipe.pressureDropCalculationResults;
    const velocity = pipe.resultSummary?.outletState?.velocity;

    const formatPressure = (value: number | undefined) => {
        if (value === undefined) return "-";

        const unitSystem = viewSettings.unitSystem;
        let unit = "kPa";
        let targetUnit = "kPa";

        switch (unitSystem) {
            case "imperial":
                unit = "psi";
                targetUnit = "psi";
                break;
            case "fieldSI":
                unit = "bar";
                targetUnit = "bar";
                break;
            case "metric_kgcm2":
                unit = "kg/cm²";
                targetUnit = "kg/cm2";
                break;
            case "metric":
            default:
                unit = "kPa";
                targetUnit = "kPa";
                break;
        }

        // Input value is always in Pascals (Pa)
        const convertedValue = convertUnit(value, "Pa", targetUnit);
        return `${convertedValue.toFixed(2)} ${unit}`;
    };

    const formatVelocity = (value: number | undefined) => {
        if (value === undefined) return "-";

        const unitSystem = viewSettings.unitSystem;
        let unit = "m/s";
        let convertedValue = value;

        if (unitSystem === "imperial") {
            unit = "ft/s";
            convertedValue = convertUnit(value, "m/s", "ft/s");
        }

        return `${convertedValue.toFixed(2)} ${unit}`;
    };

    const formatUserSpecifiedDrop = () => {
        if (!pipe.userSpecifiedPressureLoss) return "-";

        const sourceUnit = pipe.userSpecifiedPressureLossUnit ?? "Pa";
        const valueInPa = convertUnit(pipe.userSpecifiedPressureLoss, sourceUnit, "Pa");
        return formatPressure(valueInPa);
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="K-Value">
                <IOSListItem label="Pipe" value={results?.pipeLengthK?.toFixed(3) ?? "-"} />
                <IOSListItem label="Fittings" value={results?.fittingK?.toFixed(3) ?? "-"} />
                <IOSListItem label="Total" value={results?.totalK?.toFixed(3) ?? "-"} last />
            </IOSListGroup>

            <IOSListGroup header="Characteristic Summary">
                <IOSListItem label="Reynolds Number" value={results?.reynoldsNumber?.toFixed(0) ?? "-"} />
                <IOSListItem label="Flow Scheme" value={results?.flowScheme ?? "-"} />
                <IOSListItem label="Friction Factor" value={results?.frictionalFactor?.toFixed(4) ?? "-"} />
                <IOSListItem label="Velocity" value={formatVelocity(velocity) ?? "-"} last />
            </IOSListGroup>

            <IOSListGroup header="Pressure Loss Summary">
                <IOSListItem label="Pipe & Fitting" value={formatPressure(results?.pipeAndFittingPressureDrop) ?? "-"} />
                <IOSListItem label="Elevation Change" value={formatPressure(results?.elevationPressureDrop) ?? "-"} />
                <IOSListItem label="User supplied K" value="-" />
                <IOSListItem label="Control Valve drop" value={formatPressure(results?.controlValvePressureDrop) ?? "-"} />
                <IOSListItem label="Orifice drop" value={formatPressure(results?.orificePressureDrop) ?? "-"} />
                <IOSListItem
                    label="User Specified Drop"
                    value={formatUserSpecifiedDrop()}
                />
                <IOSListItem label="Total Pressure Drop" value={formatPressure(results?.totalSegmentPressureDrop) ?? "-"} last />
            </IOSListGroup>
        </Box>
    );
}
