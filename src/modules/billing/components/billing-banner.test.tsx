import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { BillingBanner } from "./billing-banner";

describe("BillingBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("renders nothing without a relevant billing milestone", () => {
    const { container } = render(<BillingBanner view={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the free-diagnosis invitation before the allowance is used", () => {
    render(<BillingBanner view={{ kind: "free_diagnosis" }} />);

    const banner = screen.getByRole("complementary", {
      name: "Primeiro diagnóstico gratuito",
    });
    expect(
      within(banner).getByRole("link", { name: "Fazer diagnóstico grátis" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(within(banner).queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows the bonus offer and its deadline after the diagnosis", () => {
    render(
      <BillingBanner
        view={{
          kind: "launch_offer",
          phase: "bonus_active",
          endsAt: "2026-11-04T12:00:00.000Z",
        }}
      />,
    );

    const banner = screen.getByRole("complementary", {
      name: "Oferta de lançamento",
    });
    expect(within(banner).getByText("Oferta de lançamento")).toBeVisible();
    expect(within(banner).getByText(/mensal.*2 meses/i)).toBeVisible();
    expect(within(banner).getByText(/semestral.*12 meses/i)).toBeVisible();
    expect(
      within(banner).getByRole("region", {
        name: "Tempo restante para ganhar o bônus",
      }),
    ).toBeVisible();
    expect(
      within(banner).getByRole("link", { name: "Ver oferta nos planos" }),
    ).toHaveAttribute("href", "/billing");
  });

  it("shows only the launch price in the second campaign window", () => {
    render(
      <BillingBanner
        view={{
          kind: "launch_offer",
          phase: "price_active",
          endsAt: "2026-11-19T12:00:00.000Z",
        }}
      />,
    );

    const banner = screen.getByRole("complementary", {
      name: "Oferta de lançamento",
    });
    expect(
      within(banner).getByText(
        /R\$ 39,90 no primeiro pagamento mensal.*R\$ 49,90\/mês/i,
      ),
    ).toBeVisible();
    expect(within(banner).queryByText(/mês de bônus/i)).not.toBeInTheDocument();
    expect(
      within(banner).getByRole("region", {
        name: "Tempo restante para aproveitar o preço de lançamento",
      }),
    ).toBeVisible();
  });
});
