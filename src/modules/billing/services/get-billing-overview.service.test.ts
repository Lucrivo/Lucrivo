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
  const refundSelect = vi.fn();
  const refundByContract = vi.fn();
  const refundMaybeSingle = vi.fn();
  const from = vi.fn();
  const rpc = vi.fn();
  const supabase = { from, rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "billing_contracts") {
        return { select: contractSelect };
      }

      if (table === "diagnoses") return { select: diagnosisSelect };
      if (table === "billing_refund_requests") {
        return { select: refundSelect };
      }
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
    refundSelect.mockReturnValue({ eq: refundByContract });
    refundByContract.mockReturnValue({ maybeSingle: refundMaybeSingle });
    refundMaybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({ data: null, error: null });
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
        courtesyExpiresAt: null,
        contract: null,
        refund: null,
      },
    });

    expect(contractSelect).toHaveBeenCalledWith(
      "id, billing_mode, payment_method, status, access_starts_at, access_ends_at, cancel_at_period_end, created_at",
    );
    expect(contractByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(contractOrder).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(diagnosisSelect).toHaveBeenCalledWith("is_free_report");
    expect(diagnosisByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(diagnosisIsFree).toHaveBeenCalledWith("is_free_report", true);
    expect(diagnosisLimit).toHaveBeenCalledWith(1);
    expect(rpc).toHaveBeenCalledWith("current_courtesy_access_expires_at");
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
          id: "contract-paid",
          billing_mode: "semiannual",
          payment_method: "credit_card",
          status: "active",
          access_starts_at: "2026-09-01T00:00:00.000Z",
          access_ends_at: "2027-03-01T00:00:00.000Z",
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
        courtesyExpiresAt: null,
        contract: {
          billingMode: "semiannual",
          paymentMethod: "credit_card",
          status: "active",
          accessEndsAt: "2027-03-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: false,
          refundEligibilityEndsAt: "2026-09-08T00:00:00.000Z",
        },
        refund: null,
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
          id: "contract-expired",
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
        courtesyExpiresAt: null,
        contract: {
          billingMode: "monthly",
          paymentMethod: "pix",
          status: "expired",
          accessEndsAt: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          canRequestRefund: false,
          refundEligibilityEndsAt: "2026-08-08T00:00:00.000Z",
        },
        refund: null,
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

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private courtesy detail" },
    });
    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });

  it("shows active courtesy separately from a paid subscription", async () => {
    diagnosisMaybeSingle.mockResolvedValue({
      data: { is_free_report: true },
      error: null,
    });
    rpc.mockResolvedValue({
      data: "2026-09-20T12:00:00.000Z",
      error: null,
    });

    await expect(get()).resolves.toMatchObject({
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
  });

  it("projects inclusive refund eligibility for the exact contract", async () => {
    contractOrder.mockResolvedValue({
      data: [
        {
          id: "contract-refundable",
          billing_mode: "monthly",
          payment_method: "credit_card",
          status: "active",
          access_starts_at: "2026-09-08T12:00:00.000Z",
          access_ends_at: "2026-10-08T12:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-09-08T12:00:00.000Z",
        },
      ],
      error: null,
    });

    await expect(get()).resolves.toMatchObject({
      status: "success",
      overview: {
        contract: {
          canRequestRefund: true,
          refundEligibilityEndsAt: "2026-09-15T12:00:00.000Z",
        },
        refund: null,
      },
    });
    expect(refundByContract).toHaveBeenCalledWith(
      "contract_id",
      "contract-refundable",
    );
  });

  it("projects a safe refund summary and disables duplicate requests", async () => {
    contractOrder.mockResolvedValue({
      data: [
        {
          id: "contract-refundable",
          billing_mode: "monthly",
          payment_method: "pix",
          status: "refund_pending",
          access_starts_at: "2026-09-10T12:00:00.000Z",
          access_ends_at: "2026-10-10T12:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-09-10T12:00:00.000Z",
        },
      ],
      error: null,
    });
    refundMaybeSingle.mockResolvedValue({
      data: {
        status: "submitted",
        eligibility_ends_at: "2026-09-17T12:00:00.000Z",
        requested_at: "2026-09-15T10:00:00.000Z",
        refund_confirmed_at: null,
        last_error_code: null,
      },
      error: null,
    });

    await expect(get()).resolves.toMatchObject({
      status: "success",
      overview: {
        contract: { canRequestRefund: false },
        refund: {
          status: "submitted",
          eligibilityEndsAt: "2026-09-17T12:00:00.000Z",
          requestedAt: "2026-09-15T10:00:00.000Z",
          refundConfirmedAt: null,
        },
      },
    });
  });

  it("fails closed when the exact refund query or its timestamps are invalid", async () => {
    contractOrder.mockResolvedValue({
      data: [
        {
          id: "contract-refundable",
          billing_mode: "monthly",
          payment_method: "pix",
          status: "active",
          access_starts_at: "2026-09-10T12:00:00.000Z",
          access_ends_at: "2026-10-10T12:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-09-10T12:00:00.000Z",
        },
      ],
      error: null,
    });
    refundMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001" },
    });
    await expect(get()).resolves.toEqual({ status: "read_failed" });

    refundMaybeSingle.mockResolvedValueOnce({
      data: {
        status: "submitted",
        eligibility_ends_at: "not-a-date",
        requested_at: "2026-09-15T10:00:00.000Z",
        refund_confirmed_at: null,
        last_error_code: null,
      },
      error: null,
    });
    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });
});
