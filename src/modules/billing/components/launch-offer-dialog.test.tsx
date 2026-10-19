import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh, replace } = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

import { LaunchOfferDialog } from "./launch-offer-dialog";

const offer = {
  phase: "bonus_active" as const,
  endsAt: "2026-11-04T12:00:00.000Z",
  monthlyPriceLabel: "R$ 39,90",
  semiannualInstallmentLabel: "R$ 29,90",
  monthlyAccessMonths: 2,
  semiannualAccessMonths: 12,
  monthlyRenewalPriceLabel: "Depois, R$ 49,90/mês",
  monthlyBonusMonths: 1,
  semiannualBonusMonths: 6,
};

describe("LaunchOfferDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it("presents the verified launch terms when the landing page opens", () => {
    render(<LaunchOfferDialog context="landing" offer={offer} />);

    const dialog = screen.getByRole("dialog", {
      name: "Mais tempo para transformar diagnóstico em decisão.",
    });
    expect(
      within(dialog).getByText(
        "Mais tempo para transformar diagnóstico em decisão.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText("R$ 39,90")).toBeVisible();
    expect(within(dialog).getByText("no primeiro pagamento")).toBeVisible();
    expect(within(dialog).getByText("Depois, R$ 49,90/mês")).toBeVisible();
    expect(within(dialog).getByText("R$ 29,90")).toBeVisible();
    expect(
      within(dialog).getByText(
        "O primeiro pagamento libera 2 meses de acesso.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText("12 meses de acesso")).toBeVisible();
    expect(
      within(dialog).getByText(/E-book, método de vendas e planilha/),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("region", {
        name: "Tempo restante para ganhar o bônus",
      }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", { name: "Quero aproveitar a oferta" }),
    ).toHaveAttribute("href", "/billing");
    expect(
      within(dialog).getByRole("button", { name: "Talvez mais tarde" }),
    ).toBeVisible();
  });

  it("presents price_active without bonus access copy", () => {
    const { container } = render(
      <LaunchOfferDialog
        context="landing"
        offer={{
          ...offer,
          phase: "price_active",
          endsAt: "2026-11-19T12:00:00.000Z",
          monthlyAccessMonths: 1,
          semiannualAccessMonths: 6,
          monthlyBonusMonths: 0,
          semiannualBonusMonths: 0,
        }}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Tempo restante para aproveitar o preço de lançamento",
      }),
    ).toBeVisible();
    expect(container).not.toHaveTextContent(/m[eê]s(?:es)? de bônus/i);
    expect(
      screen.getByText("O primeiro pagamento libera 1 mês de acesso."),
    ).toBeVisible();
  });

  it("does not dismiss the offer when the backdrop is clicked", () => {
    render(<LaunchOfferDialog context="landing" offer={offer} />);

    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop).not.toBeNull();

    fireEvent.pointerDown(backdrop!);
    fireEvent.click(backdrop!);

    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("uses the completed-diagnosis message and clears its URL marker on close", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <LaunchOfferDialog
        context="diagnosis"
        offer={offer}
        dismissHref="/reports/42"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Seu diagnóstico está pronto. Agora é hora de agir.",
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Talvez mais tarde" }));

    expect(replace).toHaveBeenCalledWith("/reports/42", { scroll: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
