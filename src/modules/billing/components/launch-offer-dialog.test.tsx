import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferPresentation } from "@/modules/billing/presenters/offer-presentation";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { LaunchOfferDialog } from "./launch-offer-dialog";

const launchBonusOffer: OfferPresentation = {
  moment: "launch_bonus",
  catalogCode: "launch",
  promotional: true,
  monthlyPriceLabel: "R$ 39,90",
  monthlyPriceQualifier: "no primeiro pagamento",
  monthlyRenewalPriceLabel: "Depois, R$ 49,90/mês",
  semiannualTotalLabel: "R$ 179,40",
  semiannualInstallmentLabel: "R$ 29,90",
  monthlyAccessMonths: 2,
  monthlyBonusMonths: 1,
  semiannualAccessMonths: 12,
  semiannualBonusMonths: 6,
};

const title =
  "Você já descobriu como está seu preço. Agora saiba como lucrar mais.";

function renderDialog(offer: OfferPresentation = launchBonusOffer) {
  render(<LaunchOfferDialog offer={offer} dismissHref="/reports/42" />);

  return screen.getByRole("dialog", { name: title });
}

function expectReferenceContent(dialog: HTMLElement) {
  expect(within(dialog).getByRole("heading", { name: title })).toBeVisible();
  expect(
    within(dialog).getByRole("img", {
      name: "Notebook mostrando o painel financeiro do Lucrivo.",
    }),
  ).toBeVisible();
  expect(
    within(dialog).getByText("Entenda quanto realmente sobra das suas vendas."),
  ).toBeVisible();
  expect(
    within(dialog).getByText("Saiba quando vale a pena ajustar seu preço."),
  ).toBeVisible();
  expect(
    within(dialog).getByRole("link", {
      name: "Quero liberar meu acesso completo",
    }),
  ).toHaveAttribute("href", "/billing");
  expect(dialog).toHaveTextContent(
    "Acesso imediato e cancelamento quando quiser.",
  );
  expect(within(dialog).getByRole("button", { name: "Fechar" })).toBeVisible();
  expect(dialog).not.toHaveTextContent(
    /plano semestral|e-book|contagem|7 dias de garantia|talvez mais tarde/i,
  );
}

describe("LaunchOfferDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the launch price and bonus after the diagnosis", () => {
    const dialog = renderDialog();

    expectReferenceContent(dialog);
    expect(dialog).toHaveTextContent("Oferta de lançamento");
    expect(dialog).toHaveTextContent("R$ 39,90");
    expect(dialog).toHaveTextContent("Inclui 1 mês de bônus");
    expect(dialog).toHaveTextContent("Você fica 2 meses com tudo liberado.");
    expect(dialog).toHaveTextContent("Depois, R$ 49,90/mês");
  });

  it("shows the launch price without a bonus claim", () => {
    const dialog = renderDialog({
      ...launchBonusOffer,
      moment: "launch_price",
      catalogCode: "launch_price",
      monthlyAccessMonths: 1,
      monthlyBonusMonths: 0,
      semiannualAccessMonths: 6,
      semiannualBonusMonths: 0,
    });

    expectReferenceContent(dialog);
    expect(dialog).toHaveTextContent("Oferta de lançamento");
    expect(dialog).toHaveTextContent("R$ 39,90");
    expect(dialog).toHaveTextContent("no primeiro pagamento");
    expect(dialog).toHaveTextContent("Depois, R$ 49,90/mês");
    expect(dialog).not.toHaveTextContent(/bônus/i);
  });

  it("shows only the recurring monthly price during the standard period", () => {
    const dialog = renderDialog({
      ...launchBonusOffer,
      moment: "standard",
      catalogCode: "standard",
      promotional: false,
      monthlyPriceLabel: "R$ 49,90",
      monthlyPriceQualifier: null,
      monthlyRenewalPriceLabel: null,
      semiannualTotalLabel: "R$ 239,40",
      semiannualInstallmentLabel: "R$ 39,90",
      monthlyAccessMonths: 1,
      monthlyBonusMonths: 0,
      semiannualAccessMonths: 6,
      semiannualBonusMonths: 0,
    });

    expectReferenceContent(dialog);
    expect(dialog).toHaveTextContent("R$ 49,90");
    expect(dialog).toHaveTextContent("/mês");
    expect(dialog).not.toHaveTextContent(/oferta de lançamento|bônus|depois/i);
  });

  it("ignores the backdrop and clears the URL marker from the close control", async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop!);
    fireEvent.click(backdrop!);
    expect(dialog).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Fechar" }));

    expect(replace).toHaveBeenCalledWith("/reports/42", { scroll: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
