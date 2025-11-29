import { MarkerType, type Edge } from "@xyflow/react";
import { type Theme } from "@mui/material";
import { type PipeProps, type ViewSettings } from "@/lib/types";
import { convertUnit } from "@/lib/unitConversion";

interface GetPipeEdgeParams {
  pipe: PipeProps;
  index: number;
  selectedId: string | null;
  selectedType: "node" | "pipe" | null;
  viewSettings: ViewSettings;
  theme: Theme;
  forceLightMode?: boolean;
  isAnimationEnabled?: boolean;
  isConnectingMode?: boolean;
}

export const getPipeEdge = ({
  pipe,
  index,
  selectedId,
  selectedType,
  viewSettings,
  theme,
  forceLightMode = false,
  isAnimationEnabled = false,
  isConnectingMode = false,
}: GetPipeEdgeParams): Edge => {
  const isSelectedPipe = selectedType === "pipe" && selectedId === pipe.id;
  const labelLines: string[] = [];

  // Default decimals
  const lengthDecimals = viewSettings.pipe.decimals?.length ?? 2;
  const deltaPDecimals = viewSettings.pipe.decimals?.deltaP ?? 2;
  const velocityDecimals = viewSettings.pipe.decimals?.velocity ?? 2;
  const dPPer100mDecimals = viewSettings.pipe.decimals?.dPPer100m ?? 2;

  // Line 1: Name + Type
  if (viewSettings.pipe.name) {
    let line1 = pipe.name || `P${index + 1} `;
    if (!pipe.name) {
      line1 = `P${index + 1} `;
    }
    if (pipe.pipeSectionType === "control valve") {
      line1 += ": CV";
    } else if (pipe.pipeSectionType === "orifice") {
      line1 += ": RO";
    }
    labelLines.push(line1);
  }

  // Line 2: Length / Dimensions
  if (viewSettings.pipe.length && pipe.pipeSectionType !== "control valve" && pipe.pipeSectionType !== "orifice") {
    const lengthUnit = viewSettings.unitSystem === "imperial" ? "ft" : "m";
    const lengthVal = typeof pipe.length === "number" ? pipe.length : Number(pipe.length ?? 0);
    // Assuming pipe.length is stored in meters (if not specified otherwise, but usually it is)
    // If pipe.lengthUnit is stored, we should convert from that.
    // For now assuming storage is 'm' or we use existing unit if we can't convert?
    // Actually, let's assume storage is 'm' for simplicity or use the stored unit.
    const convertedLength = convertUnit(lengthVal, pipe.lengthUnit || "m", lengthUnit);

    labelLines.push(`${convertedLength.toFixed(lengthDecimals)} ${lengthUnit}`);
  }

  // Line 3: Pressure Drop
  if (
    viewSettings.pipe.deltaP &&
    pipe.pressureDropCalculationResults?.totalSegmentPressureDrop !== undefined
  ) {
    // totalSegmentPressureDrop is likely in Pa (based on previous code /1000 to kPa)
    const deltaPPa = pipe.pressureDropCalculationResults.totalSegmentPressureDrop;

    let deltaPUnit = "kPa";
    if (viewSettings.unitSystem === "imperial") deltaPUnit = "psi";
    else if (viewSettings.unitSystem === "metric_kgcm2") deltaPUnit = "kg/cm2";
    else if (viewSettings.unitSystem === "fieldSI") deltaPUnit = "barg";

    const deltaP = convertUnit(deltaPPa, "Pa", deltaPUnit);
    labelLines.push(`ΔP: ${deltaP.toFixed(deltaPDecimals)} ${deltaPUnit}`);
  }

  // Line 4: Velocity
  if (
    viewSettings.pipe.velocity &&
    pipe.resultSummary?.outletState?.velocity !== undefined
  ) {
    const velocityMS = pipe.resultSummary.outletState.velocity;
    const velocityUnit = viewSettings.unitSystem === "imperial" ? "ft/s" : "m/s";
    const velocity = convertUnit(velocityMS, "m/s", velocityUnit);

    labelLines.push(`v: ${velocity.toFixed(velocityDecimals)} ${velocityUnit}`);
  }

  // Line 5: dP/100m
  if (
    viewSettings.pipe.dPPer100m &&
    pipe.pressureDropCalculationResults?.normalizedPressureDrop !== undefined
  ) {
    // normalizedPressureDrop is likely Pa/m
    const dPGradientPaM = pipe.pressureDropCalculationResults.normalizedPressureDrop;

    let gradientUnit = "kPa/100m";
    if (viewSettings.unitSystem === "imperial") gradientUnit = "psi/100ft";
    else if (viewSettings.unitSystem === "metric_kgcm2") gradientUnit = "kg/cm2/100m";
    else if (viewSettings.unitSystem === "fieldSI") gradientUnit = "bar/100m";

    const dPGradient = convertUnit(dPGradientPaM, "Pa/m", gradientUnit);
    labelLines.push(`dP: ${dPGradient.toFixed(dPPer100mDecimals)} ${gradientUnit}`);
  }

  // Line 6: Mass Flow Rate
  if (viewSettings.pipe.massFlowRate) {
    const massFlowRateDecimals = viewSettings.pipe.decimals?.massFlowRate ?? 2;
    // Use designMassFlowRate if available (calculated), otherwise input massFlowRate
    // Actually, for steady state, usually we display the flow going through.
    // pipe.massFlowRate is the input.
    // Let's use pipe.massFlowRate for now as it's the primary property.
    // If we want the calculated one (e.g. if it differs due to some reason), we might check resultSummary.
    // But resultSummary usually has state (P, T, v), not necessarily mass flow if it's constant.
    // However, `pipe.massFlowRate` is what we have.

    const massFlow = pipe.massFlowRate;
    const massFlowUnit = pipe.massFlowRateUnit || "kg/h";

    if (typeof massFlow === "number") {
      labelLines.push(`m: ${massFlow.toFixed(massFlowRateDecimals)} ${massFlowUnit}`);
    }
  }

  const labelTextColor = forceLightMode
    ? "rgba(0, 0, 0, 0.6)"
    : theme.palette.text.secondary;
  const labelBgColor = forceLightMode
    ? "#ffffff"
    : theme.palette.background.paper;
  const labelBorderColor = isSelectedPipe ? "#f59e0b" : "#cbd5f5";

  return {
    id: pipe.id,
    source: pipe.startNodeId,
    target: pipe.endNodeId,
    type: "pipe", // Use custom edge type
    data: {
      labelLines,
      labelBgColor: isSelectedPipe ? "#fffbeb" : labelBgColor,
      labelTextColor: isSelectedPipe ? "#92400e" : labelTextColor,
      labelBorderColor,
      isSelected: isSelectedPipe,
      pipe, // Pass full pipe data for hover card
      isAnimationEnabled,
      isConnectingMode,
      velocity: pipe.resultSummary?.outletState?.velocity ?? 0,
    },
    style: {
      strokeWidth: isSelectedPipe ? 2 : 1,
      stroke: isSelectedPipe ? "#f59e0b" : "#94a3b8",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isSelectedPipe ? "#f59e0b" : "#94a3b8",
    },
  };
};
