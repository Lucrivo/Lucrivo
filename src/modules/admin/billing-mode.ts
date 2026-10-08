type AdminBillingMode = "monthly" | "semiannual";

const billingModeLabels = {
  monthly: "Mensal",
  semiannual: "Semestral",
} as const satisfies Record<AdminBillingMode, string>;

function presentBillingMode(value: unknown) {
  if (value !== "monthly" && value !== "semiannual") {
    return "Plano desconhecido";
  }

  return billingModeLabels[value];
}

export { billingModeLabels, presentBillingMode, type AdminBillingMode };
