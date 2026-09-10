import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getBillingOverview } from "./get-billing-overview.service";

const now = () => new Date("2026-09-15T12:00:00.000Z");

describe("getBillingOverview", () => {
  const contractSelect = vi.fn();
  const contractByUser = vi.fn();
  const contractOrder = vi.fn();
  const diagnosisSelect = vi.fn();
  const diagnosisByUser = vi.fn();
  const diagnosisIsFree = vi.fn();
  const diagnosisLimit = vi.fn();
  const diagnosisMaybeSingle = vi.fn();
  const from = vi.fn();
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "billing_contracts") {
        return { select: contractSelect };
      }

      if (table === "diagnoses") return { select: diagnosisSelect };
      throw new Error(`unexpected table ${table}`);
    });
    contractSelect.mockReturnValue({ eq: contractByUser });
    contractByUser.mockReturnValue({ order: contractOrder });
    contractOrder.mockResolvedValue({ data: [], error: null });
    diagnosisSelect.mockReturnValue({ eq: diagnosisByUser });
    diagnosisByUser.mockReturnValue({ eq: diagnosisIsFree });
    diagnosisIsFree.mockReturnValue({ limit: diagnosisLimit });
    diagnosisLimit.mockReturnValue({ maybeSingle: diagnosisMaybeSingle });
    diagnosisMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  function get() {
    return getBillingOverview({
      supabase: supabase as never,
      userId: "trusted-user",
      now,
    });
  }

  it("returns a free unused allowance without a contract or report", async () => {
    await expect(get()).resolves.toEqual({
      status: "success",
      overview: {
        tier: "free",
        canCreateDiagnosis: true,
        freeReportUsed: false,
        contract: null,
      },
    });

    expect(contractSelect).toHaveBeenCalledWith(
      "billing_mode, payment_method, status, access_starts_at, access_ends_at, cancel_at_period_end, created_at",
    );
    expect(contractByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(contractOrder).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(diagnosisSelect).toHaveBeenCalledWith("is_free_report");
    expect(diagnosisByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(diagnosisIsFree).toHaveBeenCalledWith("is_free_report", true);
    expect(diagnosisLimit).toHaveBeenCalledWith(1);
  });

  it("returns free used after the free report is consumed", async () => {
    diagnosisMaybeSingle.mockResolvedValue({
      data: { is_free_report: true },
      error: null,
    });

    await expect(get()).resolves.toMatchObject({
      status: "success",
      overview: {
        tier: "free",
        canCreateDiagnosis: false,
        freeReportUsed: true,
        contract: null,
      },
    });
  });

  it("returns paid inside the valid half-open interval", async () => {
    diagnosisMaybeSingle.mockResolvedValue({
      data: { is_free_report: true },
      error: null,
    });
    contractOrder.mockResolvedValue({
      data: [
        {
          billing_mode: "annual",
          payment_method: "credit_card",
          status: "active",
          access_starts_at: "2026-09-01T00:00:00.000Z",
          access_ends_at: "2027-09-01T00:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    await expect(get()).resolves.toEqual({
      status: "success",
      overview: {
        tier: "paid",
        canCreateDiagnosis: true,
        freeReportUsed: true,
        contract: {
          billingMode: "annual",
          paymentMethod: "credit_card",
          status: "active",
          accessEndsAt: "2027-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });
  });

  it("returns free after expiry while retaining the latest contract state", async () => {
    diagnosisMaybeSingle.mockResolvedValue({
      data: { is_free_report: true },
      error: null,
    });
    contractOrder.mockResolvedValue({
      data: [
        {
          billing_mode: "monthly",
          payment_method: "pix",
          status: "expired",
          access_starts_at: "2026-08-01T00:00:00.000Z",
          access_ends_at: "2026-09-01T00:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-08-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    await expect(get()).resolves.toEqual({
      status: "success",
      overview: {
        tier: "free",
        canCreateDiagnosis: false,
        freeReportUsed: true,
        contract: {
          billingMode: "monthly",
          paymentMethod: "pix",
          status: "expired",
          accessEndsAt: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
      },
    });
  });

  it("fails closed when either access query fails", async () => {
    contractOrder.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private contract detail" },
    });
    await expect(get()).resolves.toEqual({ status: "read_failed" });

    contractOrder.mockResolvedValue({ data: [], error: null });
    diagnosisMaybeSingle.mockRejectedValueOnce(new Error("private report"));
    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });
});
