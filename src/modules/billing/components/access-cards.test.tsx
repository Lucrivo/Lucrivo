import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiagnosisLimitCard } from "./diagnosis-limit-card";
import { LockedReportCard } from "./locked-report-card";

describe("billing access cards", () => {
  it("explains the diagnosis limit and offers the plans", () => {
    render(<DiagnosisLimitCard />);

    expect(
      screen.getByRole("heading", {
        name: "Seu diagnóstico gratuito já foi usado",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Conhecer os planos" }),
    ).toHaveAttribute("href", "/billing");
  });

  it("explains a locked owned report without exposing its contents", () => {
    render(<LockedReportCard />);

    expect(
      screen.getByRole("heading", { name: "Relatório bloqueado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Reativar acesso" }),
    ).toHaveAttribute("href", "/billing");
    expect(
      screen.getByRole("link", { name: "Voltar aos relatórios" }),
    ).toHaveAttribute("href", "/reports");
  });
});
