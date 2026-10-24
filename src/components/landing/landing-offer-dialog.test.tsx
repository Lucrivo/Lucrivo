import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LandingOfferPresentation } from "./landing-offer";
import { LandingOfferDialog } from "./landing-offer-dialog";

const launchOffer: LandingOfferPresentation = {
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

const headline = /Seu preço pode estar\s+dando prejuízo\s+e você nem sabe\./;

function renderDialog(offer: LandingOfferPresentation) {
  render(<LandingOfferDialog offer={offer} />);
  return screen.getByRole("dialog", { name: headline });
}

describe("LandingOfferDialog", () => {
  it("presents the launch bonus on the monthly card", () => {
    const dialog = renderDialog(launchOffer);
    const priceCard = dialog.querySelector(".landing-offer-dialog-price");

    expect(priceCard).toHaveClass("landing-offer-dialog-price-launch");
    expect(within(dialog).getByText("Oferta de lançamento")).toBeVisible();
    expect(within(dialog).getByText("R$ 39,90")).toBeVisible();
    expect(within(dialog).getByText("no primeiro pagamento")).toBeVisible();
    expect(dialog).toHaveTextContent("Inclui 1 mês de bônus");
    expect(dialog).toHaveTextContent("Você fica 2 meses com tudo liberado.");
    expect(within(dialog).getByText("Depois, R$ 49,90/mês")).toBeVisible();
    expect(
      within(dialog).getByRole("img", {
        name: "Tablet mostrando a etapa 1 do diagnóstico financeiro, com as opções Serviço, Produto e Produção.",
      }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", {
        name: "Quero fazer meu diagnóstico agora",
      }),
    ).toHaveAttribute("href", "/register");
    expect(dialog).toHaveTextContent(
      "Acesso imediato e cancelamento quando quiser.",
    );
    expect(
      priceCard?.querySelector(".landing-offer-dialog-condition-copy"),
    ).not.toBeNull();
    expect(
      priceCard?.querySelector(".landing-offer-dialog-renewal"),
    ).not.toBeNull();
  });

  it("keeps the promotional price without the bonus line", () => {
    const dialog = renderDialog({
      ...launchOffer,
      moment: "launch_price",
      catalogCode: "launch_price",
      monthlyAccessMonths: 1,
      monthlyBonusMonths: 0,
      semiannualAccessMonths: 6,
      semiannualBonusMonths: 0,
    });
    const priceCard = dialog.querySelector(".landing-offer-dialog-price");

    expect(priceCard).toHaveClass("landing-offer-dialog-price-launch_price");
    expect(within(dialog).getByText("Oferta de lançamento")).toBeVisible();
    expect(within(dialog).getByText("R$ 39,90")).toBeVisible();
    expect(within(dialog).getByText("no primeiro pagamento")).toBeVisible();
    expect(within(dialog).getByText("Depois, R$ 49,90/mês")).toBeVisible();
    expect(dialog).not.toHaveTextContent(/bônus/i);
    expect(dialog).not.toHaveTextContent("Inclui 1 mês de acesso");
    expect(
      priceCard?.querySelector(".landing-offer-dialog-condition-copy"),
    ).toBeNull();
    expect(
      priceCard?.querySelector(".landing-offer-dialog-renewal"),
    ).not.toBeNull();
  });

  it("shows only the monthly price outside the launch", () => {
    const dialog = renderDialog({
      ...launchOffer,
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
    const priceCard = dialog.querySelector(".landing-offer-dialog-price");

    expect(priceCard).toHaveClass("landing-offer-dialog-price-standard");
    expect(within(dialog).getByText("R$ 49,90")).toBeVisible();
    expect(within(dialog).getByText("/mês")).toBeVisible();
    expect(
      within(dialog).queryByText("Oferta de lançamento"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("no primeiro pagamento"),
    ).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("Depois, R$ 49,90/mês");
    expect(dialog).not.toHaveTextContent(/bônus/i);
    expect(
      priceCard?.querySelector(".landing-offer-dialog-condition"),
    ).toBeNull();
  });

  it("closes from the button and ignores the backdrop", () => {
    const dialog = renderDialog(launchOffer);
    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop!);
    fireEvent.click(backdrop!);
    expect(dialog).toBeVisible();

    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the call to action when the visitor is already registering", () => {
    render(<LandingOfferDialog offer={launchOffer} dismissCta />);

    const dialog = screen.getByRole("dialog", { name: headline });
    expect(
      within(dialog).queryByRole("link", {
        name: "Quero fazer meu diagnóstico agora",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Quero fazer meu diagnóstico agora",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
