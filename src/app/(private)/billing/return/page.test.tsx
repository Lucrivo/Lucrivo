import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveDetailedDiagnosisIntent } from "@/modules/detailed-diagnosis/services/detailed-diagnosis-intent";

const { getBillingOverview, listActivePrices, requireUser } = vi.hoisted(
  () => ({
    getBillingOverview: vi.fn(),
    listActivePrices: vi.fn(),
    requireUser: vi.fn(),
  }),
);

vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
}));
vi.mock("@/modules/billing/services/list-active-prices.service", () => ({
  listActivePrices,
}));

import BillingReturnPage from "./page";

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

describe("BillingReturnPage", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    listActivePrices.mockResolvedValue({ status: "success", prices });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: false,
        contract: null,
      },
    });
  });

  async function renderOutcome(outcome: string) {
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ outcome }),
      }),
    );
  }

  it("waits for the webhook when checkout success is still pending", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: false,
        contract: {
          billingMode: "monthly",
          paymentMethod: "credit_card",
          status: "pending",
          accessEndsAt: null,
          cancelAtPeriodEnd: false,
        },
      },
    });

    saveDetailedDiagnosisIntent(window.sessionStorage, {
      userId: "trusted-user",
      category: "product",
      now: Date.now(),
    });

    await renderOutcome("success");

    expect(
      screen.getByRole("heading", { name: "Confirmando pagamento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/confirmação segura do Asaas/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pagamento confirmado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Continuar diagnóstico detalhado" }),
    ).not.toBeInTheDocument();
  });

  it("confirms only paid access already observed on the server", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: true,
        freeQuickDiagnosisUsed: true,
        contract: {
          billingMode: "monthly",
          paymentMethod: "pix",
          status: "active",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });

    await renderOutcome("success");

    expect(
      screen.getByRole("heading", { name: "Pagamento confirmado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Fazer diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(
      screen.queryByRole("link", { name: "Continuar diagnóstico detalhado" }),
    ).not.toBeInTheDocument();
  });

  it("resumes a confirmed paid checkout only when the current user stored a category", async () => {
    saveDetailedDiagnosisIntent(window.sessionStorage, {
      userId: "trusted-user",
      category: "product",
      now: Date.now(),
    });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: true,
        freeQuickDiagnosisUsed: true,
        contract: {
          billingMode: "monthly",
          paymentMethod: "pix",
          status: "active",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });

    await renderOutcome("success");

    expect(
      await screen.findByRole("link", {
        name: "Continuar diagnóstico detalhado",
      }),
    ).toHaveAttribute(
      "href",
      "/quick-diagnosis?resume=detailed&category=product",
    );
  });

  it("never claims paid access from the callback alone", async () => {
    await renderOutcome("success");

    expect(
      screen.getByRole("heading", {
        name: "Pagamento ainda não confirmado",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pagamento confirmado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Continuar diagnóstico detalhado" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["canceled", "Checkout cancelado"],
    ["expired", "Checkout expirado"],
  ])("returns %s outcomes to plan selection", async (outcome, heading) => {
    saveDetailedDiagnosisIntent(window.sessionStorage, {
      userId: "trusted-user",
      category: "product",
      now: Date.now(),
    });

    await renderOutcome(outcome);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Continuar diagnóstico detalhado" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Plano Mensal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Plano Semestral" }),
    ).toBeInTheDocument();
  });
});
