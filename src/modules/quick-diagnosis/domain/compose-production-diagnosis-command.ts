import type {
  ProductionDiagnosisCommand,
  ProductionDiagnosisValidatedInput,
} from "../types";

function composeProductionDiagnosisCommand(
  input: ProductionDiagnosisValidatedInput,
): ProductionDiagnosisCommand {
  if (!input.costCompositionEnabled) {
    if (input.productionUnitCostCents === null) {
      throw new Error("invalid_cost_shape");
    }
    return {
      ...input,
      productionUnitCostCents: input.productionUnitCostCents,
    };
  }

  const components = [
    input.materialUnitCostCents,
    input.packagingUnitCostCents,
    input.directLaborUnitCostCents,
    input.otherVariableUnitCostCents,
  ];
  if (components.some((value) => value === null)) {
    throw new Error("invalid_cost_shape");
  }

  const total = components.reduce(
    (sum, value) => sum + BigInt(value!),
    BigInt(0),
  );
  if (total <= BigInt(0) || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("invalid_cost_total");
  }

  return { ...input, productionUnitCostCents: Number(total) };
}

export { composeProductionDiagnosisCommand };
