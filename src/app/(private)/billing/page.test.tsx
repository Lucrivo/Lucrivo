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
    amountCents: 3990,
    currency: "BRL" as const,
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "semiannual" as const,
    amountCents: 17940,
    currency: "BRL" as const,
    installmentLimit: 6,
    accessMonths: 6,
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
        courtesyExpiresAt: null,
        contract: null,
        refund: null,
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
      screen.getByRole("article", { name: "Plano Semestral" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mais vantajoso")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Segurança e transparência" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Assinar mensal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Assinar semestral" }),
    ).toBeInTheDocument();
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
        courtesyExpiresAt: null,
        contract: {
          billingMode: "monthly",
          paymentMethod: "credit_card",
          status: "active",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: true,
          refundEligibilityEndsAt: "2026-09-17T12:00:00.000Z",
        },
        refund: null,
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
      within(currentPlan).getByRole("button", { name: "Pedir reembolso" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "Plano Semestral" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer subscription cancellation for semiannual or Pix access", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateDiagnosis: true,
        freeReportUsed: false,
        courtesyExpiresAt: null,
        contract: {
          billingMode: "semiannual",
          paymentMethod: "pix",
          status: "active",
          accessEndsAt: "2027-09-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: false,
          refundEligibilityEndsAt: "2026-09-17T12:00:00.000Z",
        },
        refund: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Plano semestral")).toBeInTheDocument();
    expect(screen.getByText("Pix")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar renovação" }),
    ).not.toBeInTheDocument();
  });

  it("identifies courtesy access without presenting it as a paid plan", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "courtesy",
        canCreateDiagnosis: true,
        freeReportUsed: true,
        courtesyExpiresAt: "2026-09-20T12:00:00.000Z",
        contract: null,
        refund: null,
      },
    });

    await renderPage();

    const courtesy = screen.getByRole("region", { name: "Acesso cortesia" });
    expect(within(courtesy).getByText(/20 de setembro de 2026/)).toBeVisible();
    expect(within(courtesy).getByText(/não é uma assinatura/i)).toBeVisible();
    expect(screen.queryByText("Você está no plano gratuito")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Seu plano atual" }),
    ).toBeNull();
  });

  it("shows unresolved refund state before purchase actions", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateDiagnosis: false,
        freeReportUsed: true,
        courtesyExpiresAt: null,
        contract: {
          billingMode: "monthly",
          paymentMethod: "credit_card",
          status: "refund_pending",
          accessEndsAt: "2026-09-15T12:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: false,
          refundEligibilityEndsAt: "2026-09-17T12:00:00.000Z",
        },
        refund: {
          status: "pending_reconciliation",
          eligibilityEndsAt: "2026-09-17T12:00:00.000Z",
          requestedAt: "2026-09-15T10:00:00.000Z",
          refundConfirmedAt: null,
          lastErrorCode: "provider_ambiguous",
        },
      },
    });

    await renderPage();

    expect(
      screen.getByRole("region", { name: "Situação do reembolso" }),
    ).toHaveTextContent("Reembolso em conferência");
    expect(screen.queryByRole("article", { name: /Plano/ })).toBeNull();
  });

  it("shows a rejected status with an eligible retry", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateDiagnosis: true,
        freeReportUsed: true,
        courtesyExpiresAt: null,
        contract: {
          billingMode: "monthly",
          paymentMethod: "pix",
          status: "active",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: true,
          refundEligibilityEndsAt: "2026-09-17T12:00:00.000Z",
        },
        refund: {
          status: "rejected",
          eligibilityEndsAt: "2026-09-17T12:00:00.000Z",
          requestedAt: "2026-09-15T10:00:00.000Z",
          refundConfirmedAt: null,
          lastErrorCode: "provider_rejected",
        },
      },
    });

    await renderPage();

    expect(screen.getByText("Reembolso não concluído")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Pedir reembolso" }),
    ).toBeVisible();
  });
});
