import type {
  PipeProps,
  PressureDropCalculationResults,
  resultSummary,
} from "./types";
import {
  buildHydraulicContext,
  calculateResultSummary,
  type PipeLengthComputation,
} from "./calculations/utils";
import {
  calculateControlValvePressureDrop,
} from "./calculations/controlValve";
import {
  calculateOrificePressureDrop,
} from "./calculations/orifice";
import {
  computeFittingContribution,
  computePipeLengthContribution,
  calculateGasFlowForPipe,
  calculatePressureDropResults,
} from "./calculations/pipeline";

export function recalculatePipeFittingLosses(pipe: PipeProps): PipeProps {
  const context = buildHydraulicContext(pipe);

  let pressureDropResults: PressureDropCalculationResults | undefined;
  let resultSummary: resultSummary | undefined;

  let pipeLengthCompForSummary: PipeLengthComputation = {};
  if (context) {
    const area = 0.25 * Math.PI * context.pipeDiameter * context.pipeDiameter;
    const velocity = context.volumetricFlowRate / area;
    pipeLengthCompForSummary = { velocity };
  }

  if (pipe.pipeSectionType === "control valve") {
    const { results, updatedControlValve } = calculateControlValvePressureDrop(pipe, context);
    pressureDropResults = results;
    resultSummary = calculateResultSummary(pipe, context, pipeLengthCompForSummary, pressureDropResults);
    if (updatedControlValve) {
      pipe = { ...pipe, controlValve: updatedControlValve };
    }
  } else if (pipe.pipeSectionType === "orifice") {
    const { results, updatedOrifice } = calculateOrificePressureDrop(pipe, context);
    pressureDropResults = results;
    resultSummary = calculateResultSummary(pipe, context, pipeLengthCompForSummary, pressureDropResults);
    if (updatedOrifice) {
      pipe = { ...pipe, orifice: updatedOrifice };
    }
  } else {
    // Default to pipeline calculation
    const fittingResult = computeFittingContribution(pipe, context);
    const pipeResult = computePipeLengthContribution(pipe, context, fittingResult.fittingK);
    const gasResults =
      context && context.phase === "gas"
        ? calculateGasFlowForPipe(pipe, context, pipeResult, fittingResult.fittingK)
        : null;

    if (gasResults) {
      return {
        ...pipe,
        fittingK: fittingResult.fittingK,
        pipeLengthK: pipeResult.pipeLengthK,
        totalK: pipeResult.totalK,
        equivalentLength: pipeResult.equivalentLength,
        fittings: fittingResult.fittings,
        pressureDropCalculationResults: gasResults.pressureDropResults,
        resultSummary: gasResults.resultSummary,
      };
    }

    pressureDropResults = calculatePressureDropResults(
      pipe,
      context,
      pipeResult,
      fittingResult.fittingK
    );
    resultSummary = calculateResultSummary(pipe, context, pipeResult, pressureDropResults);

    return {
      ...pipe,
      fittingK: fittingResult.fittingK,
      pipeLengthK: pipeResult.pipeLengthK,
      totalK: pipeResult.totalK,
      equivalentLength: pipeResult.equivalentLength,
      fittings: fittingResult.fittings,
      pressureDropCalculationResults: pressureDropResults,
      resultSummary,
    };
  }

  return {
    ...pipe,
    pressureDropCalculationResults: pressureDropResults,
    resultSummary,
  };
}

// Re-export types that might be needed by consumers (though mostly they should import from types.ts)
export {
  calculateSharpEdgedPlateOrificePressureDrop,
  type SharpEdgedOrificeInput,
  type SharpEdgedOrificeResult,
} from "./calculations/orifice";
export {
  calculateRequiredCg,
  type GasControlValveArgs,
} from "./calculations/controlValve";
