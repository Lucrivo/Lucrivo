import { seedUuid } from "./ids";
import { allAdminReportTemplates } from "./historical-report-scenarios";
import type {
  DemoSeedCatalog,
  SeedAdminUserEvent,
  SeedAdminUserState,
  SeedAssignedReport,
  SeedContract,
  SeedContractStatus,
  SeedCreatedBucket,
  SeedPayment,
  SeedPaymentStatus,
  SeedRelativeTime,
  SeedUser,
} from "./model";
import { currentReportTemplates } from "./report-scenarios";

const MONTHLY_PRICE_ID = "20000000-0000-4000-8000-000000000001";
const ANNUAL_PRICE_ID = "20000000-0000-4000-8000-000000000002";

const contractStatuses = [
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
] as const satisfies readonly SeedContractStatus[];

const paymentStatuses = [
  "pending",
  "confirmed",
  "received",
  "overdue",
  "capture_refused",
  "refunded",
  "partially_refunded",
  "chargeback_requested",
  "chargeback_dispute",
] as const satisfies readonly SeedPaymentStatus[];

const validPurchaseTuples = [
  ["monthly", "credit_card", "recurring"],
  ["monthly", "pix", "detached"],
  ["annual", "credit_card", "installment"],
  ["annual", "pix", "detached"],
] as const;

function relativeTime(
  months: number,
  days = 0,
  hours = 0,
  anchor: SeedRelativeTime["anchor"] = "month_start",
): SeedRelativeTime {
  return { anchor, months, days, hours };
}

function clientReportCount(ordinal: number): number {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 96) {
    throw new RangeError("Client ordinal must be an integer from 1 through 96.");
  }
  if (ordinal <= 24) return 0;
  if (ordinal <= 48) return 1;
  if (ordinal <= 58) return 2;
  if (ordinal <= 68) return 3;
  if (ordinal <= 78) return 4;
  if (ordinal <= 88) return 5;
  if (ordinal <= 95) return ordinal - 83;
  return 32;
}

function createdBucket(ordinal: number): SeedCreatedBucket {
  if (ordinal <= 6) return "today";
  if (ordinal <= 16) return "week";
  if (ordinal <= 32) return "month";
  if (ordinal <= 45) return "month-1";
  if (ordinal <= 58) return "month-2";
  if (ordinal <= 71) return "month-3";
  if (ordinal <= 84) return "month-4";
  return "month-5";
}

function lastSignInOffsetDays(ordinal: number): number | null {
  if (ordinal <= 47) return ((ordinal - 1) % 7) + 1;
  if (ordinal <= 79) return 8 + ((ordinal - 48) % 53);
  if (ordinal <= 95) return null;
  return 0;
}

function buildUsers(): { admin: SeedUser; clients: SeedUser[] } {
  const admin: SeedUser = {
    ordinal: 0,
    id: seedUuid("user", 0),
    identityId: seedUuid("identity", 0),
    email: "admin@seed.lucrivo.test",
    isAdmin: true,
    accountState: "active",
    accessSource: "paid",
    reportCount: 36,
    createdBucket: "month-5",
    lastSignInOffsetDays: 0,
  };
  const clients = Array.from({ length: 96 }, (_, index): SeedUser => {
    const ordinal = index + 1;
    return {
      ordinal,
      id: seedUuid("user", ordinal),
      identityId: seedUuid("identity", ordinal),
      email: `cliente+${String(ordinal).padStart(3, "0")}@seed.lucrivo.test`,
      isAdmin: false,
      accountState:
        ordinal >= 73 && ordinal <= 80
          ? "blocked"
          : ordinal >= 81 && ordinal <= 88
            ? "deleted"
            : "active",
      accessSource:
        ordinal <= 44 ? "free" : ordinal <= 84 ? "paid" : "courtesy",
      reportCount: clientReportCount(ordinal),
      createdBucket: createdBucket(ordinal),
      lastSignInOffsetDays: lastSignInOffsetDays(ordinal),
    };
  });
  return { admin, clients };
}

function buildReports(admin: SeedUser, clients: SeedUser[]): SeedAssignedReport[] {
  const reports: SeedAssignedReport[] = allAdminReportTemplates.map(
    (template, reportOrdinal) => ({
      ownerId: admin.id,
      ownerOrdinal: admin.ordinal,
      reportOrdinal,
      templateKey: template.key,
      createdAt: relativeTime(-(reportOrdinal % 12), reportOrdinal % 20, 9),
      deletedAt: null,
    }),
  );

  for (const client of clients) {
    for (let reportOrdinal = 0; reportOrdinal < client.reportCount; reportOrdinal += 1) {
      const template =
        currentReportTemplates[
          (client.ordinal + reportOrdinal) % currentReportTemplates.length
        ]!;
      const months =
        client.accessSource === "courtesy"
          ? -(2 + (reportOrdinal % 5))
          : -(reportOrdinal % 6);
      const createdAt = relativeTime(months, (client.ordinal + reportOrdinal) % 20, 10);
      reports.push({
        ownerId: client.id,
        ownerOrdinal: client.ordinal,
        reportOrdinal,
        templateKey: template.key,
        createdAt,
        deletedAt:
          client.ordinal >= 81 &&
          client.ordinal <= 88 &&
          reportOrdinal < 2
            ? { ...createdAt, days: createdAt.days + 1 }
            : null,
      });
    }
  }
  return reports;
}

function baseContract(input: {
  ownerOrdinal: number;
  childOrdinal: number;
  userId: string;
  externalReference: string;
  status: SeedContractStatus;
  tuple?: (typeof validPurchaseTuples)[number];
  accessStartsAt?: SeedRelativeTime | null;
  accessEndsAt?: SeedRelativeTime | null;
  createdAt?: SeedRelativeTime;
}): SeedContract {
  const tuple = input.tuple ?? validPurchaseTuples[0];
  const [billingMode, paymentMethod, chargeType] = tuple;
  const cancelAtPeriodEnd = input.status === "cancel_at_period_end";
  return {
    id: seedUuid("contract", input.ownerOrdinal, input.childOrdinal),
    userId: input.userId,
    priceId: billingMode === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID,
    externalReference: input.externalReference,
    billingMode,
    paymentMethod,
    chargeType,
    amountCents: billingMode === "annual" ? 47_880 : 3_990,
    installmentLimit: billingMode === "annual" ? 12 : null,
    accessMonths: billingMode === "annual" ? 12 : 1,
    status: input.status,
    accessStartsAt: input.accessStartsAt ?? null,
    accessEndsAt: input.accessEndsAt ?? null,
    cancelAtPeriodEnd,
    cancellationRequestedAt: cancelAtPeriodEnd ? relativeTime(-1, 2) : null,
    cancellationConfirmedAt: cancelAtPeriodEnd ? relativeTime(-1, 3) : null,
    canceledAt: input.status === "canceled" ? relativeTime(-2, 5) : null,
    createdAt: input.createdAt ?? relativeTime(-2, 1),
  };
}

function paymentFor(input: {
  ownerOrdinal: number;
  childOrdinal: number;
  contract: SeedContract;
  status: SeedPaymentStatus;
  dueAt: SeedRelativeTime;
}): SeedPayment {
  const confirmed = input.status === "confirmed" || input.status === "received";
  const received = input.status === "received";
  return {
    id: seedUuid("payment", input.ownerOrdinal, input.childOrdinal),
    contractId: input.contract.id,
    externalPaymentId: `demo-payment-${String(input.ownerOrdinal).padStart(3, "0")}-${String(input.childOrdinal).padStart(3, "0")}`,
    status: input.status,
    valueCents:
      input.contract.billingMode === "annual"
        ? input.contract.amountCents / 12
        : input.contract.amountCents,
    installmentNumber: input.contract.billingMode === "annual" ? 1 : null,
    dueAt: input.dueAt,
    confirmedAt: confirmed ? { ...input.dueAt, hours: 12 } : null,
    receivedAt: received ? { ...input.dueAt, hours: 18 } : null,
    refundedAt:
      input.status === "refunded" || input.status === "partially_refunded"
        ? { ...input.dueAt, days: input.dueAt.days + 3 }
        : null,
    chargebackAt:
      input.status === "chargeback_requested" ||
      input.status === "chargeback_dispute"
        ? { ...input.dueAt, days: input.dueAt.days + 5 }
        : null,
  };
}

function buildBilling(admin: SeedUser, clients: SeedUser[]) {
  const contracts: SeedContract[] = [];
  const payments: SeedPayment[] = [];

  const adminContract = baseContract({
    ownerOrdinal: 0,
    childOrdinal: 0,
    userId: admin.id,
    externalReference: "demo-admin-annual-active",
    status: "active",
    tuple: validPurchaseTuples[3],
    accessStartsAt: relativeTime(-12),
    accessEndsAt: relativeTime(1),
    createdAt: relativeTime(-12),
  });
  contracts.push(adminContract);
  payments.push(
    paymentFor({
      ownerOrdinal: 0,
      childOrdinal: 0,
      contract: adminContract,
      status: "received",
      dueAt: relativeTime(0, 1),
    }),
  );

  contractStatuses.forEach((status, index) => {
    const client = clients[index]!;
    const cancelStatus = status === "cancel_at_period_end";
    const contract = baseContract({
      ownerOrdinal: client.ordinal,
      childOrdinal: 0,
      userId: client.id,
      externalReference: `demo-status-${status}`,
      status,
      tuple: cancelStatus
        ? validPurchaseTuples[0]
        : validPurchaseTuples[index % validPurchaseTuples.length],
      accessStartsAt:
        status === "pending" || status === "pending_reconciliation"
          ? null
          : relativeTime(-4),
      accessEndsAt:
        status === "pending" || status === "pending_reconciliation"
          ? null
          : relativeTime(-3),
      createdAt: relativeTime(-4, index),
    });
    contracts.push(contract);
    payments.push(
      paymentFor({
        ownerOrdinal: client.ordinal,
        childOrdinal: 0,
        contract,
        status: paymentStatuses[index]!,
        dueAt: relativeTime(-1, index + 1),
      }),
    );
  });

  for (const client of clients.filter((user) => user.accessSource === "paid")) {
    const contract = baseContract({
      ownerOrdinal: client.ordinal,
      childOrdinal: 0,
      userId: client.id,
      externalReference: `demo-client-${client.ordinal}-active`,
      status: "active",
      tuple: validPurchaseTuples[client.ordinal % validPurchaseTuples.length],
      accessStartsAt: relativeTime(-12),
      accessEndsAt: relativeTime(1),
      createdAt: relativeTime(-6, client.ordinal % 20),
    });
    contracts.push(contract);
    payments.push(
      paymentFor({
        ownerOrdinal: client.ordinal,
        childOrdinal: 0,
        contract,
        status: client.ordinal % 2 === 0 ? "received" : "confirmed",
        dueAt: relativeTime(0, (client.ordinal % 20) + 1),
      }),
    );
  }

  for (const client of clients.filter((user) => user.accessSource === "courtesy")) {
    const contract = baseContract({
      ownerOrdinal: client.ordinal,
      childOrdinal: 0,
      userId: client.id,
      externalReference: `demo-client-${client.ordinal}-past-access`,
      status: "expired",
      tuple: validPurchaseTuples[1],
      accessStartsAt: relativeTime(-12),
      accessEndsAt: relativeTime(-1),
      createdAt: relativeTime(-12),
    });
    contracts.push(contract);
    payments.push(
      paymentFor({
        ownerOrdinal: client.ordinal,
        childOrdinal: 0,
        contract,
        status: "received",
        dueAt: relativeTime(-6, client.ordinal % 20),
      }),
    );
  }

  const powerUser = clients[95]!;
  const nonRevenueStatuses: SeedPaymentStatus[] = [
    "pending",
    "overdue",
    "capture_refused",
    "refunded",
    "partially_refunded",
    "chargeback_requested",
    "chargeback_dispute",
  ];
  for (let index = 0; index < 24; index += 1) {
    const months = -(index % 12);
    const contract = baseContract({
      ownerOrdinal: powerUser.ordinal,
      childOrdinal: index + 1,
      userId: powerUser.id,
      externalReference: `demo-power-history-${String(index + 1).padStart(2, "0")}`,
      status: "expired",
      tuple: index % 2 === 0 ? validPurchaseTuples[0] : validPurchaseTuples[1],
      accessStartsAt: relativeTime(months - 1),
      accessEndsAt: relativeTime(months),
      createdAt: relativeTime(months - 1),
    });
    contracts.push(contract);
    payments.push(
      paymentFor({
        ownerOrdinal: powerUser.ordinal,
        childOrdinal: index + 1,
        contract,
        status:
          index < 12
            ? index % 2 === 0
              ? "received"
              : "confirmed"
            : nonRevenueStatuses[(index - 12) % nonRevenueStatuses.length]!,
        dueAt: relativeTime(months, 1),
      }),
    );
  }

  return { contracts, payments };
}

function buildStatesAndEvents(
  admin: SeedUser,
  clients: SeedUser[],
): { states: SeedAdminUserState[]; events: SeedAdminUserEvent[] } {
  const states: SeedAdminUserState[] = [];
  const events: SeedAdminUserEvent[] = [];
  let markerOrdinal = 1;

  for (const client of clients.filter((user) => user.ordinal >= 69)) {
    const activeCourtesy = client.accessSource === "courtesy";
    const expiredCourtesy = client.ordinal >= 69 && client.ordinal <= 72;
    const state: SeedAdminUserState = {
      userId: client.id,
      blockedAt:
        client.accountState === "blocked" ? relativeTime(-1, 4) : null,
      deletedAt:
        client.accountState === "deleted" ? relativeTime(-1, 8) : null,
      courtesyExpiresAt: activeCourtesy
        ? relativeTime(2)
        : expiredCourtesy
          ? relativeTime(-1)
          : null,
      version: 1,
    };
    states.push(state);

    if (client.ordinal !== 96) {
      const action =
        client.accountState === "blocked"
          ? "blocked"
          : client.accountState === "deleted"
            ? "soft_deleted"
            : activeCourtesy
              ? "courtesy_granted"
              : "courtesy_ended";
      const marker = `[demo-seed:event-${String(markerOrdinal).padStart(4, "0")}]`;
      markerOrdinal += 1;
      events.push({
        userId: client.id,
        actorId: admin.id,
        action,
        marker,
        reason: `${marker} Histórico operacional fictício.`,
        beforeState: {},
        afterState: { action },
        createdAt: relativeTime(-1, client.ordinal % 20),
      });
    }
  }

  const powerUser = clients[95]!;
  const actions: SeedAdminUserEvent["action"][] = [
    "courtesy_granted",
    "courtesy_ended",
    "blocked",
    "unblocked",
    "soft_deleted",
    "restored",
  ];
  for (let index = 0; index < 24; index += 1) {
    const action = actions[index % actions.length]!;
    const marker = `[demo-seed:event-${String(markerOrdinal).padStart(4, "0")}]`;
    markerOrdinal += 1;
    events.push({
      userId: powerUser.id,
      actorId: admin.id,
      action,
      marker,
      reason: `${marker} Ciclo administrativo fictício do cliente de alto volume.`,
      beforeState: { sequence: index },
      afterState: { sequence: index + 1, action },
      createdAt: relativeTime(-6 + Math.floor(index / 4), index % 20, 12),
    });
  }

  return { states, events };
}

function buildDemoCatalog(): DemoSeedCatalog {
  const { admin, clients } = buildUsers();
  const reports = buildReports(admin, clients);
  const { contracts, payments } = buildBilling(admin, clients);
  const { states, events } = buildStatesAndEvents(admin, clients);
  return { admin, clients, reports, contracts, payments, states, events };
}

export {
  ANNUAL_PRICE_ID,
  MONTHLY_PRICE_ID,
  buildDemoCatalog,
  clientReportCount,
  contractStatuses,
  paymentStatuses,
  validPurchaseTuples,
};
