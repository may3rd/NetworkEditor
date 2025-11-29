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

export const FluidPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => {
    const fluid = pipe.fluid || { id: "fluid", phase: "liquid" };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup header="Fluid Properties">
                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                    <TextField
                        label="Fluid Name"
                        fullWidth
                        size="small"
                        value={fluid.id}
                        onChange={(e) => onUpdatePipe(pipe.id, { fluid: { ...fluid, id: e.target.value } })}
                        sx={glassInputSx}
                    />
                </Box>
                <Box sx={{ px: 2, pb: 2, bgcolor: 'background.paper' }}>
                    <FormControl component="fieldset" fullWidth sx={glassRadioSx}>
                        <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Phase</Typography>
                        <RadioGroup
                            value={fluid.phase}
                            onChange={(e) => onUpdatePipe(pipe.id, { fluid: { ...fluid, phase: e.target.value as "liquid" | "gas" } })}
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
                        onValueChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...fluid, density: v } })}
                        onUnitChange={(u) => onUpdatePipe(pipe.id, { fluid: { ...fluid, densityUnit: u } })}
                        min={0}
                    />
                    <IOSQuantityPage
                        label="Viscosity"
                        value={fluid.viscosity ?? ""}
                        unit={fluid.viscosityUnit ?? "cP"}
                        units={QUANTITY_UNIT_OPTIONS.viscosity}
                        unitFamily="viscosity"
                        onValueChange={(v) => onUpdatePipe(pipe.id, { fluid: { ...fluid, viscosity: v } })}
                        onUnitChange={(u) => onUpdatePipe(pipe.id, { fluid: { ...fluid, viscosityUnit: u } })}
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
                            onChange={(e) => onUpdatePipe(pipe.id, { fluid: { ...fluid, molecularWeight: Number(e.target.value) } })}
                            sx={glassInputSx}
                        />
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                label="Z Factor"
                                type="number"
                                fullWidth
                                size="small"
                                value={fluid.zFactor ?? ""}
                                onChange={(e) => onUpdatePipe(pipe.id, { fluid: { ...fluid, zFactor: Number(e.target.value) } })}
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
                                onChange={(e) => onUpdatePipe(pipe.id, { fluid: { ...fluid, specificHeatRatio: Number(e.target.value) } })}
                                sx={glassInputSx}
                            />
                        </Box>
                    </Box>
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

export const DiameterPage = ({ pipe, onUpdatePipe }: { pipe: PipeProps, onUpdatePipe: (id: string, patch: PipePatch) => void }) => (
    <Box sx={{ pt: 2 }}>
        <IOSListGroup header="Diameter Input Mode">
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <FormControl component="fieldset" fullWidth sx={glassRadioSx}>
                    <RadioGroup
                        row
                        value={pipe.diameterInputMode ?? "nps"}
                        onChange={(e) => onUpdatePipe(pipe.id, { diameterInputMode: e.target.value as "nps" | "diameter" })}
                    >
                        <FormControlLabel value="nps" control={<Radio size="small" />} label="NPS" />
                        <FormControlLabel value="diameter" control={<Radio size="small" />} label="Diameter" />
                    </RadioGroup>
                </FormControl>
            </Box>
        </IOSListGroup>

        {pipe.diameterInputMode === "diameter" ? (
            <>
                <IOSQuantityPage
                    label="Inlet Diameter"
                    value={pipe.diameter ?? ""}
                    unit={pipe.diameterUnit ?? "mm"}
                    units={QUANTITY_UNIT_OPTIONS.length}
                    unitFamily="length"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { diameter: v })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { diameterUnit: u })}
                    min={0}
                />
                <IOSQuantityPage
                    label="Outlet Diameter"
                    value={pipe.outletDiameter ?? ""}
                    unit={pipe.outletDiameterUnit ?? "mm"}
                    units={QUANTITY_UNIT_OPTIONS.length}
                    unitFamily="length"
                    onValueChange={(v) => onUpdatePipe(pipe.id, { outletDiameter: v })}
                    onUnitChange={(u) => onUpdatePipe(pipe.id, { outletDiameterUnit: u })}
                    min={0}
                />
            </>
        ) : (
            <IOSListGroup header="Nominal Pipe Size">
                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                    {/* Placeholder for NPS Select - simplifying for now */}
                    <TextField
                        label="NPS (Placeholder)"
                        fullWidth
                        size="small"
                        value={pipe.pipeNPD ?? ""}
                        onChange={(e) => onUpdatePipe(pipe.id, { pipeNPD: Number(e.target.value) })}
                        sx={glassInputSx}
                    />
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            label="Schedule (Placeholder)"
                            fullWidth
                            size="small"
                            value={pipe.pipeSchedule ?? ""}
                            onChange={(e) => onUpdatePipe(pipe.id, { pipeSchedule: e.target.value as any })}
                            sx={glassInputSx}
                        />
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                        Calculated Diameter: {pipe.diameter?.toFixed(2)} {pipe.diameterUnit}
                    </Typography>
                </Box>
            </IOSListGroup>
        )}
    </Box>
);

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
