import { Box, TextField, FormControl, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { glassInputSx, glassRadioSx } from "@/lib/glassStyles";
import { QuantityInput, QUANTITY_UNIT_OPTIONS } from "../../QuantityInput";
import { IOSQuantityPage } from "./IOSQuantityPage";
import { NodeProps, NodePatch } from "@/lib/types";
import { IOSListGroup } from "../../ios/IOSListGroup";
import { Navigator } from "../../PropertiesPanel";
import { IOSListItem } from "../../ios/IOSListItem";
import { Check, ContentCopy } from "@mui/icons-material";
import { IOSTextField } from "../../ios/IOSTextField";
import { useState, useEffect, useRef } from "react";

// --- Pressure ---
export const PressurePage = ({ node, onUpdateNode }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void }) => (
    <IOSQuantityPage
        label="Pressure"
        value={node.pressure ?? ""}
        unit={node.pressureUnit ?? "kPag"}
        units={QUANTITY_UNIT_OPTIONS.pressure}
        unitFamily="pressure"
        onChange={(v, u) => onUpdateNode(node.id, { pressure: v, pressureUnit: u })}
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
        onChange={(v, u) => onUpdateNode(node.id, { temperature: v, temperatureUnit: u })}
        autoFocus
    />
);

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
                sx={{ borderRadius: "16px" }}
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

// --- Node Selection for Copying Fluid ---

export const NodeSelectionPage = ({
    nodes,
    onSelect,
    currentNodeId
}: {
    nodes: NodeProps[],
    onSelect: (node: NodeProps) => void,
    currentNodeId: string
}) => {
    const availableNodes = nodes.filter(n => n.id !== currentNodeId && n.fluid);

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="Select Node to Copy From">
                {availableNodes.length === 0 ? (
                    <IOSListItem label="No other nodes with fluid data" />
                ) : (
                    availableNodes.map((n, index) => {
                        const fluid = n.fluid!;
                        const isLiquid = fluid.phase === "liquid";
                        const secondaryText = isLiquid
                            ? `ρ: ${fluid.density ?? "-"} ${fluid.densityUnit ?? "kg/m3"}, μ: ${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`
                            : `MW: ${fluid.molecularWeight ?? "-"}, Z: ${fluid.zFactor ?? "-"}, k: ${fluid.specificHeatRatio ?? "-"}, μ: ${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`;

                        return (
                            <IOSListItem
                                key={n.id}
                                label={n.label || n.id}
                                secondary={secondaryText}
                                icon={
                                    <Box sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        backgroundColor: isLiquid ? "primary.main" : "#ff3b30", // Red for Gas
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "14px",
                                        fontWeight: "bold"
                                    }}>
                                        {isLiquid ? "L" : "G"}
                                    </Box>
                                }
                                onClick={() => onSelect(n)}
                                last={index === availableNodes.length - 1}
                                chevron={false}
                            />
                        );
                    })
                )}
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
                    onChange={(v, u) => onUpdateNode(node.id, { fluid: { ...currentFluid, [field]: v, [unitField]: u } })}
                    min={min}
                    autoFocus
                />
            );
        });
    };

    const openCopyFromNodePage = () => {
        navigator.push("Copy Fluid from Node", (net, nav) => {
            return (
                <NodeSelectionPage
                    nodes={net.nodes}
                    currentNodeId={node.id}
                    onSelect={(selectedNode) => {
                        if (selectedNode.fluid) {
                            onUpdateNode(node.id, { fluid: { ...selectedNode.fluid } });
                            nav.pop();
                        }
                    }}
                />
            );
        });
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
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
                <IOSListGroup>
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
                <IOSListGroup>
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
                    />
                    <IOSListItem
                        label="Viscosity"
                        value={`${fluid.viscosity ?? "-"} ${fluid.viscosityUnit ?? "cP"}`}
                        onClick={() => openQuantityPage("Viscosity", "viscosity", "viscosityUnit", QUANTITY_UNIT_OPTIONS.viscosity, "viscosity", 0)}
                        chevron
                        last
                    />
                </IOSListGroup>
            )}

            <IOSListGroup>
                <IOSListItem
                    label="Copy from Node"
                    onClick={openCopyFromNodePage}
                    textColor="primary.main"
                    icon={
                        <Box sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "7px",
                            backgroundColor: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white"
                        }}>
                            <ContentCopy sx={{ fontSize: 18 }} />
                        </Box>
                    }
                    last
                />
            </IOSListGroup>
        </Box>
    );
};
