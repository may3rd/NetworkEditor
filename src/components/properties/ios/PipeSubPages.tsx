import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Typography, Switch, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { glassInputSx, glassSelectSx, glassRadioSx } from "@/lib/glassStyles";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../../QuantityInput";
import { PipeProps, PipePatch } from "@/lib/types";
import { IOSListGroup } from "../../ios/IOSListGroup";
import { IOSListItem } from "../../ios/IOSListItem";
import { IOSQuantityPage } from "./IOSQuantityPage";

import { IOSTextField } from "../../ios/IOSTextField";

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

// --- Fluid ---
import { Navigator } from "../../PropertiesPanel";
import { Check } from "@mui/icons-material";

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

import { useState, useEffect, useRef } from "react";

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
const NumberInputPage = ({
    value,
    onChange,
    placeholder,
    autoFocus
}: {
    value: number | undefined,
    onChange: (val: number) => void,
    placeholder: string,
    autoFocus?: boolean
}) => {
    const [localValue, setLocalValue] = useState(value?.toString() ?? "");

    useEffect(() => {
        if (value !== undefined && Number(localValue) !== value) {
            setLocalValue(value.toString());
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        const num = parseFloat(newVal);
        if (!isNaN(num) && newVal.trim() !== "") {
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

import { getScheduleEntries, nearest_pipe_diameter } from "../../PipeDimension";

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
                    <Typography variant="caption" sx={{ px: 2, pt: 1, display: "block", color: "text.secondary" }}>
                        Pipe Diameter: {typeof pipe.diameter === 'number' ? pipe.diameter.toFixed(3) : "-"} {pipe.diameterUnit ?? "mm"}
                    </Typography>
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
                    value={pipe.pipeSectionType === type ? "✓" : ""}
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
