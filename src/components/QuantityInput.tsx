"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, OutlinedInput, Select, Typography, MenuItem, SelectChangeEvent, TextField } from "@mui/material";
import { convertUnit, type UnitFamily } from "@/lib/unitConversion";

export const QUANTITY_UNIT_OPTIONS = {
  area: ["mm2", "cm2", "m2", "in2", "ft2"] as const,
  density: ["kg/m3", "g/cm3", "lb/ft3"] as const,
  length: ["m", "km", "ft", "in", "mil"] as const,
  lengthSmall: ["mm", "cm", "in"] as const,
  massFlowRate: ["kg/h", "kg/s", "lb/h", "lb/s", "tonn/day"] as const,
  pressure: ["kPag", "barg", "kg/cm2g", "psig", "kPa", "bar", "kg/cm2", "Pa", "psi", "mmH2O", "torr", "inHg"] as const,
  pressureDrop: ["kPa", "bar", "kg_cm2", "Pa", "psi"] as const,
  temperature: ["C", "F", "K", "R"] as const,
  volume: ["mm3", "cm3", "m3", "in3", "ft3"] as const,
  volumeFlowRate: ["m3/s"] as const,
  viscosity: ["cP", "Poise", "Pa.s"] as const,
} as const;

type QuantityInputProps = {
  label: string;
  value: number | string;
  unit: string;
  units: readonly string[];
  onValueChange: (value: number | undefined) => void;
  onUnitChange?: (unit: string) => void;
  unitFamily?: UnitFamily;
  placeholder?: string;
  isDisabled?: boolean;
};

export function QuantityInput({
  label,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
  unitFamily,
  placeholder,
  isDisabled = false,
}: QuantityInputProps) {
  const displayLabel = unit ? `${label} (${unit})` : label;
  const formatValue = useMemo(
    () => (val: number | string) => {
      if (val === "" || val === null || val === undefined) {
        return "";
      }
      if (typeof val === "number") {
        return Number.isFinite(val) ? `${val}` : "";
      }
      return val;
    },
    [],
  );

  const [inputValue, setInputValue] = useState<string>(formatValue(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const formatted = formatValue(value);
    if (!isFocused && formatted !== inputValue) {
      setInputValue(formatted);
    }
  }, [value, formatValue, isFocused, inputValue]);

  const handleUnitChange = (nextUnit: string) => {
    const numericValue =
      typeof value === "number"
        ? value
        : value === "" || value === null || value === undefined
          ? undefined
          : Number(value);
    const canConvert =
      unitFamily && typeof numericValue === "number" && !Number.isNaN(numericValue);

    if (canConvert) {
      const converted = convertUnit(numericValue, unit, nextUnit, unitFamily);
      onValueChange(converted);
    }

    onUnitChange?.(nextUnit);
  };

  return (
    <Box width="100%">
      <Typography color="text.secondary" sx={{ mb: 0.5 }}>
        {displayLabel}
      </Typography>
      <Box
        sx={{
          display: "flex",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          '&:hover': { borderColor: "text.primary" },
          '&:focus-within': { borderColor: "primary.main", boxShadow: "0 0 0 1px #1976d2" } // Using default MUI primary blue
        }}
      >
        <OutlinedInput
          label={displayLabel}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={inputValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (inputValue === "-" || inputValue === "." || inputValue === "-.") {
              setInputValue(formatValue(value));
            }
          }}
          onChange={(e) => {
            const next = e.target.value;
            if (
              next !== "" &&
              next !== "-" &&
              next !== "." &&
              next !== "-." &&
              !/^[-+]?\d*(?:\.\d*)?$/.test(next)
            ) {
              return;
            }
            setInputValue(next);
            if (next === "") {
              onValueChange(undefined);
              return;
            }
            if (next === "-" || next === "." || next === "-.") {
              return;
            }
            const parsed = Number(next);
            if (!Number.isNaN(parsed)) {
              onValueChange(parsed);
            }
          }}
          sx={{
            flex: 1,
            '& fieldset': { border: 'none' },
            '& input': { py: 1, px: 1.5 }
          }}
          disabled={isDisabled}
        />
        <Select
          value={unit}
          onChange={(e: SelectChangeEvent) => handleUnitChange(e.target.value)}
          disabled={isDisabled}
          variant="standard"
          disableUnderline
          sx={{
            // width: "120px",
            borderLeft: "1px solid",
            borderColor: "divider",
            borderRadius: 0,
            bgcolor: "action.hover",
            '& .MuiSelect-select': {
              py: 1,
              px: 1.5,
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          {units.map((u) => (
            <MenuItem key={u} value={u}>
              {u}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
}
