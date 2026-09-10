import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBillingOverview, listActivePrices, requireUser } = vi.hoisted(
  () => ({
    getBillingOverview: vi.fn(),
    listActivePrices: vi.fn(),
    requireUser: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
}));
vi.mock("@/modules/billing/services/list-active-prices.service", () => ({
  listActivePrices,
}));

import BillingPage from "./page";

const prices = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "monthly" as const,
    amountCents: 4990,
    currency: "BRL" as const,
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "annual" as const,
    amountCents: 47880,
    currency: "BRL" as const,
    installmentLimit: 12,
    accessMonths: 12,
  },
];

describe("BillingPage", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    listActivePrices.mockResolvedValue({ status: "success", prices });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateDiagnosis: true,
        freeReportUsed: false,
        contract: null,
      },
    });
  });

  async function renderPage() {
    render(await BillingPage());
  }

  it("shows both paid offers and method-specific actions to a free customer", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Plano e cobrança", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Você está no plano gratuito")).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Plano Mensal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Plano Anual" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mais popular")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Segurança e transparência" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /cartão/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Pix/i })).toHaveLength(2);
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getBillingOverview).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
    });
    expect(listActivePrices).toHaveBeenCalledWith({ supabase });
  });

  it("shows the active monthly card contract and its cancellation control", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateDiagnosis: true,
        freeReportUsed: true,
        contract: {
          billingMode: "monthly",
          paymentMethod: "credit_card",
          status: "active",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });

    await renderPage();

    const currentPlan = screen.getByRole("region", {
      name: "Seu plano atual",
    });
    expect(within(currentPlan).getByText("Plano mensal")).toBeInTheDocument();
    expect(
      within(currentPlan).getByText("Cartão de crédito"),
    ).toBeInTheDocument();
    expect(
      within(currentPlan).getByText(/10 de outubro de 2026/),
    ).toBeInTheDocument();
    expect(
      within(currentPlan).getByRole("button", {
        name: "Cancelar renovação",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "Plano Anual" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer subscription cancellation for annual or Pix access", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateDiagnosis: true,
        freeReportUsed: false,
        contract: {
          billingMode: "annual",
          paymentMethod: "pix",
          status: "active",
          accessEndsAt: "2027-09-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });

    await renderPage();

    expect(screen.getByText("Plano anual")).toBeInTheDocument();
    expect(screen.getByText("Pix")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar renovação" }),
    ).not.toBeInTheDocument();
  });
});
