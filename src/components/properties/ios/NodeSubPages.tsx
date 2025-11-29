import { Box, TextField, FormControl, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { glassInputSx, glassRadioSx } from "@/lib/glassStyles";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../../QuantityInput";
import { IOSQuantityPage } from "./IOSQuantityPage";
import { NodeProps, NodePatch } from "@/lib/types";
import { IOSListGroup } from "../../ios/IOSListGroup";

// --- Pressure ---
export const PressurePage = ({ node, onUpdateNode }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void }) => (
    <IOSQuantityPage
        label="Pressure"
        value={node.pressure ?? ""}
        unit={node.pressureUnit ?? "kPag"}
        units={QUANTITY_UNIT_OPTIONS.pressure}
        unitFamily="pressure"
        onValueChange={(v) => onUpdateNode(node.id, { pressure: v })}
        onUnitChange={(u) => onUpdateNode(node.id, { pressureUnit: u })}
        autoFocus
    />
);

// --- Temperature ---
export const TemperaturePage = ({ node, onUpdateNode }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void }) => (
    <IOSQuantityPage
        label="Temperature"
        value={node.temperature ?? ""}
        unit={node.temperatureUnit ?? "C"}
        units={QUANTITY_UNIT_OPTIONS.temperature}
        unitFamily="temperature"
        onValueChange={(v) => onUpdateNode(node.id, { temperature: v })}
        onUnitChange={(u) => onUpdateNode(node.id, { temperatureUnit: u })}
        autoFocus
    />
);

// --- Fluid ---
import { Navigator } from "../../PropertiesPanel";
import { IOSListItem } from "../../ios/IOSListItem";
import { Check } from "@mui/icons-material";
import { IOSTextField } from "../../ios/IOSTextField";

// ... (PressurePage and TemperaturePage remain unchanged)

// --- Fluid Sub-Pages ---

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

// --- Fluid ---

export const NodeFluidPage = ({ node, onUpdateNode, navigator }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void, navigator: Navigator }) => {
    const fluid = node.fluid || { id: "fluid", phase: "liquid" };

    const openNamePage = () => {
        navigator.push("Fluid Name", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidNamePage
                    value={currentFluid.id}
                    onChange={(v) => onUpdateNode(node.id, { fluid: { ...currentFluid, id: v } })}
                />
            );
        });
    };

    const openPhasePage = () => {
        navigator.push("Phase", (net, nav) => {
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <FluidPhasePage
                    value={currentFluid.phase as "liquid" | "gas"}
                    onChange={(v) => onUpdateNode(node.id, { fluid: { ...currentFluid, phase: v } })}
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
            const currentNode = net.nodes.find(n => n.id === node.id);
            if (!currentNode) return null;
            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
            return (
                <IOSQuantityPage
                    label={label}
                    value={(currentFluid as any)[field] ?? ""}
                    unit={(currentFluid as any)[unitField] ?? options[0]}
                    units={options}
                    unitFamily={family}
                    onValueChange={(v) => onUpdateNode(node.id, { fluid: { ...currentFluid, [field]: v } })}
                    onUnitChange={(u) => onUpdateNode(node.id, { fluid: { ...currentFluid, [unitField]: u } })}
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
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.molecularWeight}
                                    onChange={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, molecularWeight: val } })}
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
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.zFactor}
                                    onChange={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, zFactor: val } })}
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
                            const currentNode = net.nodes.find(n => n.id === node.id);
                            if (!currentNode) return null;
                            const currentFluid = currentNode.fluid || { id: "fluid", phase: "liquid" };
                            return (
                                <NumberInputPage
                                    value={currentFluid.specificHeatRatio}
                                    onChange={(val) => onUpdateNode(node.id, { fluid: { ...currentFluid, specificHeatRatio: val } })}
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
