type PasswordSetupFlow = "recovery" | "invite";

type PasswordSetupPath = "/update-password" | "/update-password?flow=invite";

function authenticationMethods(amr: unknown): string[] {
  if (!Array.isArray(amr)) return [];

  return amr.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (
      entry &&
      typeof entry === "object" &&
      "method" in entry &&
      typeof entry.method === "string"
    ) {
      return [entry.method];
    }
    return [];
  });
}

function passwordSetupFlow(
  claims: { amr?: unknown } | null | undefined,
): PasswordSetupFlow | null {
  const methods = authenticationMethods(claims?.amr);
  if (methods.includes("invite")) return "invite";
  if (methods.includes("recovery")) return "recovery";
  return null;
}

function passwordSetupPath(flow: PasswordSetupFlow): PasswordSetupPath {
  return flow === "invite"
    ? "/update-password?flow=invite"
    : "/update-password";
}

export {
  passwordSetupFlow,
  passwordSetupPath,
  type PasswordSetupFlow,
  type PasswordSetupPath,
};
