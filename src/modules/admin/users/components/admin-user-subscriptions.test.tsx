import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  AdminUserDetail,
  AdminUserSubscription,
} from "../admin-users.schema";
import { AdminUserSubscriptions } from "./admin-user-subscriptions";

const user = {
  access: "paid",
  subscription: {
    billingMode: "semiannual",
    status: "active",
    accessEndsAt: "2027-03-16T12:00:00+00:00",
  },
} as Pick<AdminUserDetail, "access" | "subscription">;

const subscription: AdminUserSubscription = {
  id: "96300000-0000-4000-8000-000000000003",
  createdAt: "2026-09-16T12:00:00+00:00",
  catalogCode: "standard",
  billingMode: "semiannual",
  paymentMethod: "credit_card",
  chargeType: "installment",
  amountCents: 17_940,
  currency: "BRL",
  installmentLimit: 6,
  accessMonths: 6,
  bonusMonths: 0,
  status: "refunded",
  accessStartsAt: "2026-09-16T12:00:00+00:00",
  accessEndsAt: "2027-03-16T12:00:00+00:00",
  cancelAtPeriodEnd: false,
  cancellationRequestedAt: null,
  cancellationConfirmedAt: null,
  canceledAt: null,
  payment: {
    confirmedCount: 1,
    receivedCents: 17_940,
    lastPaymentAt: "2026-09-16T12:00:00+00:00",
  },
  refund: {
    status: "confirmed",
    requestedAt: "2026-09-17T12:00:00+00:00",
    refundConfirmedAt: "2026-09-18T12:00:00+00:00",
  },
};

describe("AdminUserSubscriptions", () => {
  it("leads with current access and uses textual semantic states", () => {
    render(
      <AdminUserSubscriptions
        user={user}
        page={{ items: [subscription], nextCursor: null }}
        nextHref={null}
      />,
    );

    expect(screen.getByText("Acesso vigente")).toBeVisible();
    expect(screen.getByText("Reembolsada")).toBeVisible();
    expect(screen.getByText("Cartão de crédito")).toBeVisible();
  });
});
