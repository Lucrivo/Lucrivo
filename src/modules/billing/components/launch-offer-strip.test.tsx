import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { LaunchOfferStrip } from "./launch-offer-strip";

describe("LaunchOfferStrip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("renders nothing without an eligible launch offer", () => {
    const { container } = render(<LaunchOfferStrip offer={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("guides a free user to the first diagnosis without manufacturing urgency", () => {
    render(
      <LaunchOfferStrip
        offer={{
          endsAt: "2026-11-04T12:00:00.000Z",
          freeQuickDiagnosisUsed: false,
        }}
      />,
    );

    const strip = screen.getByRole("complementary", {
      name: "Condição especial de lançamento",
    });
    expect(
      within(strip).getByText("Seu primeiro diagnóstico é grátis"),
    ).toBeVisible();
    expect(
      within(strip).getByRole("link", { name: "Fazer diagnóstico grátis" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(
      within(strip).getByRole("link", { name: "Fazer diagnóstico grátis" }),
    ).toHaveClass("focus-visible:ring-2");
    expect(
      within(strip).queryByRole("region", {
        name: "Tempo restante da oferta de lançamento",
      }),
    ).not.toBeInTheDocument();
    expect(within(strip).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the offer, both bonus summaries and countdown after the diagnosis", () => {
    const { container } = render(
      <LaunchOfferStrip
        offer={{
          endsAt: "2026-11-04T12:00:00.000Z",
          freeQuickDiagnosisUsed: true,
        }}
      />,
    );

    const strip = screen.getByRole("complementary", {
      name: "Condição especial de lançamento",
    });
    expect(within(strip).getByText("Oferta de lançamento")).toBeVisible();
    expect(within(strip).getByText(/mensal.*2 meses/i)).toBeVisible();
    expect(within(strip).getByText(/semestral.*12 meses/i)).toBeVisible();
    expect(within(strip).getByText(/mensal.*1 mês de bônus/i)).toBeVisible();
    expect(
      within(strip).getByText(/semestral.*6 meses de bônus/i),
    ).toBeVisible();
    expect(
      within(strip).getByRole("link", { name: "Ver oferta nos planos" }),
    ).toHaveAttribute("href", "/billing");
    expect(
      within(strip).getByRole("region", {
        name: "Tempo restante da oferta de lançamento",
      }),
    ).toBeVisible();
    expect(within(strip).queryByRole("button")).not.toBeInTheDocument();

    expect(
      within(strip).getByRole("link", { name: "Ver oferta nos planos" }),
    ).toHaveClass("focus-visible:ring-2");
    for (const cell of container.querySelectorAll(
      "[data-countdown-digits] > div",
    )) {
      expect(cell.className).not.toMatch(/(?:^|\s)w-\d/);
    }
  });
});
