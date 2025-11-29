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
export const NodeFluidPage = ({ node, onUpdateNode }: { node: NodeProps, onUpdateNode: (id: string, patch: NodePatch) => void }) => {
    const fluid = node.fluid || { id: "fluid", phase: "liquid" };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="Fluid Properties">
                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                    <TextField
                        label="Fluid Name"
                        fullWidth
                        size="small"
                        value={fluid.id}
                        onChange={(e) => onUpdateNode(node.id, { fluid: { ...fluid, id: e.target.value } })}
                        sx={glassInputSx}
                    />
                </Box>
                <Box sx={{ px: 2, pb: 2, bgcolor: 'background.paper' }}>
                    <FormControl component="fieldset" fullWidth sx={glassRadioSx}>
                        <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Phase</Typography>
                        <RadioGroup
                            value={fluid.phase}
                            onChange={(e) => onUpdateNode(node.id, { fluid: { ...fluid, phase: e.target.value as "liquid" | "gas" } })}
                        >
                            <FormControlLabel value="liquid" control={<Radio size="small" />} label="Liquid" />
                            <FormControlLabel value="gas" control={<Radio size="small" />} label="Gas" />
                        </RadioGroup>
                    </FormControl>
                </Box>
            </IOSListGroup>

            {fluid.phase === "liquid" ? (
                <>
                    <IOSQuantityPage
                        label="Density"
                        value={fluid.density ?? ""}
                        unit={fluid.densityUnit ?? "kg/m3"}
                        units={QUANTITY_UNIT_OPTIONS.density}
                        unitFamily="density"
                        onValueChange={(v) => onUpdateNode(node.id, { fluid: { ...fluid, density: v } })}
                        onUnitChange={(u) => onUpdateNode(node.id, { fluid: { ...fluid, densityUnit: u } })}
                        min={0}
                    />
                    <IOSQuantityPage
                        label="Viscosity"
                        value={fluid.viscosity ?? ""}
                        unit={fluid.viscosityUnit ?? "cP"}
                        units={QUANTITY_UNIT_OPTIONS.viscosity}
                        unitFamily="viscosity"
                        onValueChange={(v) => onUpdateNode(node.id, { fluid: { ...fluid, viscosity: v } })}
                        onUnitChange={(u) => onUpdateNode(node.id, { fluid: { ...fluid, viscosityUnit: u } })}
                        min={0}
                    />
                </>
            ) : (
                <IOSListGroup header="Gas Properties">
                    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <TextField
                            label="Molecular Weight"
                            type="number"
                            fullWidth
                            size="small"
                            value={fluid.molecularWeight ?? ""}
                            onChange={(e) => onUpdateNode(node.id, { fluid: { ...fluid, molecularWeight: Number(e.target.value) } })}
                            sx={glassInputSx}
                        />
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                label="Z Factor"
                                type="number"
                                fullWidth
                                size="small"
                                value={fluid.zFactor ?? ""}
                                onChange={(e) => onUpdateNode(node.id, { fluid: { ...fluid, zFactor: Number(e.target.value) } })}
                                sx={glassInputSx}
                            />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                label="Specific Heat Ratio"
                                type="number"
                                fullWidth
                                size="small"
                                value={fluid.specificHeatRatio ?? ""}
                                onChange={(e) => onUpdateNode(node.id, { fluid: { ...fluid, specificHeatRatio: Number(e.target.value) } })}
                                sx={glassInputSx}
                            />
                        </Box>
                    </Box>
                </IOSListGroup>
            )}
        </Box>
    );
};
