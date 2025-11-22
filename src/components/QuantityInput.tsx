"use client";

import { Flex, Input, Select, FormControl, FormLabel } from "@chakra-ui/react";
import { convertUnit, type UnitFamily } from "@/lib/unitConversion";

type QuantityInputProps = {
  label: string;
  value: number | string;
  unit: string;
  units: readonly string[];
  onValueChange: (value: number) => void;
  onUnitChange?: (unit: string) => void;
  unitFamily?: UnitFamily;
  placeholder?: string;
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
}: QuantityInputProps) {
  const displayLabel = unit ? `${label} (${unit})` : label;

  const handleUnitChange = (nextUnit: string) => {
    const numericValue = typeof value === "number" ? value : Number(value);
    const canConvert = unitFamily && !Number.isNaN(numericValue);

    if (canConvert) {
      const converted = convertUnit(numericValue, unit, nextUnit, unitFamily);
      onValueChange(converted);
    }

    onUnitChange?.(nextUnit);
  };

  return (
    <FormControl>
      <FormLabel fontSize="sm" color="gray.500" mb={1}>
        {displayLabel}
      </FormLabel>
      <Flex
        border="1px solid"
        borderColor="inherit" // Use parent's border color from chakra
        borderRadius="md"
        overflow="hidden"
        _hover={{ borderColor: "gray.300" }}
        _focusWithin={{ zIndex: 1, borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
      >
        <Input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          border="none"
          borderRadius="0"
          _focus={{ boxShadow: "none" }}
        />
        <Select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          border="none"
          borderLeft="1px solid"
          borderColor="inherit"
          borderRadius="0"
          w="120px"
          _focus={{ boxShadow: "none" }}
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </Flex>
    </FormControl>
  );
}
