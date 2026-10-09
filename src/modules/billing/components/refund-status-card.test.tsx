import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BillingRefundStatus } from "../types";
import { RefundStatusCard } from "./refund-status-card";

describe("RefundStatusCard", () => {
  it.each([
    ["processing", "Solicitando seu reembolso"],
    ["submitted", "Reembolso enviado ao Asaas"],
    ["pending_reconciliation", "Reembolso em conferência"],
    ["rejected", "Reembolso não concluído"],
    ["confirmed", "Reembolso confirmado"],
  ] as const)("presents the %s state", (status, title) => {
    render(<RefundStatusCard status={status as BillingRefundStatus} />);

    const region = screen.getByRole("region", {
      name: "Situação do reembolso",
    });
    expect(region).toHaveTextContent(title);
    expect(region).not.toHaveTextContent(/provider_|state_persist/i);
  });

  it("does not claim the card credit is already visible", () => {
    render(<RefundStatusCard status="confirmed" />);

    expect(screen.getByText(/depende do banco/i)).toBeVisible();
    expect(screen.queryByText(/já está na fatura/i)).toBeNull();
  });
});
