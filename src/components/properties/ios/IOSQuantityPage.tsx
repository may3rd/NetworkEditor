import { Box } from "@mui/material";
import { Check } from "@mui/icons-material";
import { IOSTextField } from "../../ios/IOSTextField";
import { IOSListGroup } from "../../ios/IOSListGroup";
import { IOSListItem } from "../../ios/IOSListItem";
import { convertUnit, UnitFamily } from "@/lib/unitConversion";
import { useState, useEffect, useMemo, useRef } from "react";

type Props = {
    label: string;
    value: number | string;
    unit: string;
    units: readonly string[];
    onValueChange?: (value: number | undefined) => void;
    onUnitChange?: (unit: string) => void;
    onChange?: (value: number | undefined, unit: string) => void;
    unitFamily?: UnitFamily;
    min?: number;
    placeholder?: string;
    autoFocus?: boolean;
};

export function IOSQuantityPage({
    label,
    value,
    unit,
    units,
    onValueChange,
    onUnitChange,
    onChange,
    unitFamily,
    min,
    placeholder,
    autoFocus,
}: Props) {
    const [inputValue, setInputValue] = useState<string>("");
    const [localUnit, setLocalUnit] = useState<string>(unit);
    const [error, setError] = useState<string | null>(null);

    // Refs to track latest values for cleanup commit
    const valueRef = useRef<number | undefined>(typeof value === 'number' ? value : undefined);
    const unitRef = useRef<string>(unit);
    const isDirty = useRef(false);

    // Refs for callbacks to ensure fresh access in cleanup
    const onValueChangeRef = useRef(onValueChange);
    const onUnitChangeRef = useRef(onUnitChange);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onValueChangeRef.current = onValueChange;
        onUnitChangeRef.current = onUnitChange;
        onChangeRef.current = onChange;
    }, [onValueChange, onUnitChange, onChange]);

    // Format value for display
    const formatValue = useMemo(() => (val: number | string | undefined) => {
        if (val === "" || val === null || val === undefined) return "";
        if (typeof val === "number") {
            if (!Number.isFinite(val)) return "";
            return `${val}`;
        }
        return val;
    }, []);

    // Sync input value with prop value only on mount
    useEffect(() => {
        setInputValue(formatValue(value));
        if (typeof value === 'number') {
            valueRef.current = value;
        }
        setLocalUnit(unit); // Initialize localUnit from prop
        unitRef.current = unit; // Initialize unitRef from prop
    }, []); // Only run once on mount

    // Commit changes on unmount
    useEffect(() => {
        return () => {
            if (isDirty.current) {
                if (onChangeRef.current) {
                    onChangeRef.current(valueRef.current, unitRef.current);
                } else {
                    // Fallback to separate callbacks if onChange is not provided
                    if (onValueChangeRef.current) {
                        onValueChangeRef.current(valueRef.current);
                    }
                    if (onUnitChangeRef.current && unitRef.current !== unit) {
                        onUnitChangeRef.current(unitRef.current);
                    }
                }
            }
        };
    }, [unit]);

    const handleInputChange = (text: string) => {
        // Allow empty, minus, dot
        if (text === "" || text === "-" || text === "." || text === "-.") {
            setInputValue(text);
            if (text === "") {
                valueRef.current = undefined;
                isDirty.current = true;
            }
            return;
        }

        // Regex for number validation
        if (!/^[-+]?\d*(?:\.\d*)?$/.test(text)) {
            return;
        }

        setInputValue(text);
        const parsed = Number(text);
        if (!Number.isNaN(parsed)) {
            valueRef.current = parsed;
            isDirty.current = true;

            // Validation (Visual only)
            if (min !== undefined && parsed < min) {
                setError(`Value cannot be less than ${min}`);
            } else {
                setError(null);
            }
        }
    };

    const handleUnitSelect = (newUnit: string) => {
        if (newUnit === localUnit) return;

        // Convert value if unitFamily provided
        const numericValue = valueRef.current;
        if (unitFamily && numericValue !== undefined && !Number.isNaN(numericValue)) {
            const converted = convertUnit(numericValue, localUnit, newUnit, unitFamily);
            valueRef.current = converted;
            setInputValue(formatValue(converted));
        }

        setLocalUnit(newUnit);
        unitRef.current = newUnit;
        isDirty.current = true;
    };

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
                <IOSTextField
                    fullWidth
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onClear={() => {
                        setInputValue("");
                        valueRef.current = undefined;
                        isDirty.current = true;
                    }}
                    placeholder={placeholder || label}
                    autoFocus={autoFocus}
                    error={!!error}
                    helperText={error}
                />
            </IOSListGroup>

            <IOSListGroup header="Unit">
                {units.map((u) => (
                    <IOSListItem
                        key={u}
                        label={u}
                        value={u === localUnit ? <Check color="primary" sx={{ fontSize: 16 }} /> : ""}
                        onClick={() => handleUnitSelect(u)}
                        last={u === units[units.length - 1]}
                    />
                ))}
            </IOSListGroup>
        </Box>
    );
}
