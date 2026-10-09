import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DetailedDiagnosisUpgradeDialog } from "./detailed-diagnosis-upgrade-dialog";

const INTENT_KEY = "lucrivo:detailed-diagnosis-intent:v1";

describe("DetailedDiagnosisUpgradeDialog", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("explains multi-item access and offers quick or plans", () => {
    render(
      <DetailedDiagnosisUpgradeDialog
        open
        userId="user-1"
        category="product"
        onOpenChange={vi.fn()}
        onContinueQuick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Diagnóstico detalhado faz parte dos planos",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Os planos permitem analisar vários itens no mesmo diagnóstico. O diagnóstico rápido gratuito continua disponível.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continuar no diagnóstico rápido" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Conhecer os planos" }),
    ).toHaveAttribute("href", "/billing");
    expect(screen.getByRole("dialog").className).toContain("motion-reduce:");
  });

  it("saves the pending category before the plans link is used", async () => {
    const user = userEvent.setup();
    render(
      <DetailedDiagnosisUpgradeDialog
        open
        userId="user-1"
        category="production"
        onOpenChange={vi.fn()}
        onContinueQuick={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Conhecer os planos" }));

    expect(JSON.parse(sessionStorage.getItem(INTENT_KEY) ?? "")).toMatchObject({
      version: 1,
      userId: "user-1",
      category: "production",
    });
  });

  it("keeps the plans link when storage cannot be written", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const user = userEvent.setup();
    render(
      <DetailedDiagnosisUpgradeDialog
        open
        userId="user-1"
        category="product"
        onOpenChange={vi.fn()}
        onContinueQuick={vi.fn()}
      />,
    );

    const plans = screen.getByRole("link", { name: "Conhecer os planos" });
    expect(plans).toHaveAttribute("href", "/billing");
    await user.click(plans);
    expect(sessionStorage.getItem(INTENT_KEY)).toBeNull();
  });

  it("continues on the quick diagnosis", async () => {
    const onContinueQuick = vi.fn();
    const user = userEvent.setup();
    render(
      <DetailedDiagnosisUpgradeDialog
        open
        userId="user-1"
        category="product"
        onOpenChange={vi.fn()}
        onContinueQuick={onContinueQuick}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continuar no diagnóstico rápido" }),
    );

    expect(onContinueQuick).toHaveBeenCalledOnce();
  });
});
