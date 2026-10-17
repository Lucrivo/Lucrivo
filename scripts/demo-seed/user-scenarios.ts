import { seedUuid } from "./ids";
import type {
  DemoSeedCatalog,
  SeedAdminUserEvent,
  SeedAdminUserState,
  SeedAssignedReport,
  SeedBonusGrant,
  SeedContract,
  SeedContractStatus,
  SeedCreatedBucket,
  SeedOnboardingProfile,
  SeedPayment,
  SeedPaymentStatus,
  SeedRelativeTime,
  SeedUser,
} from "./model";
import { currentReportTemplates } from "./report-scenarios";

const priceIds = {
  launch: {
    monthly: "20000000-0000-4000-8000-000000000001",
    semiannual: "20000000-0000-4000-8000-000000000002",
  },
  standard: {
    monthly: "20000000-0000-4000-8000-000000000003",
    semiannual: "20000000-0000-4000-8000-000000000004",
  },
} as const;
const consentReplacementOrdinals = new Set([1, 3, 5, 7]);

const segmentCatalog = [
  ["Alimentação", "Confeitaria"],
  ["Beleza", "Salão de beleza"],
  ["Vestuário", "Loja de roupas"],
  ["Tecnologia", "Assistência técnica"],
  ["Educação", "Curso online"],
  ["Construção", null],
  ["Saúde", null],
  ["Comércio", null],
] as const;

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

const statusFixturePayments = [
  "pending",
  "confirmed",
  "received",
  "partially_refunded",
  "overdue",
  "confirmed",
  "refunded",
  "chargeback_requested",
  "capture_refused",
] as const satisfies readonly SeedPaymentStatus[];

const validPurchaseTuples = [
  ["monthly", "credit_card", "recurring"],
  ["monthly", "pix", "detached"],
  ["semiannual", "credit_card", "installment"],
  ["semiannual", "pix", "detached"],
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
    throw new RangeError(
      "Client ordinal must be an integer from 1 through 96.",
    );
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
    reportCount: 29,
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

function profileCompletedAt(client: SeedUser): SeedRelativeTime {
  if (client.createdBucket === "today") {
    return relativeTime(0, 0, -(client.ordinal % 12) + 0.5, "now");
  }
  if (client.createdBucket === "week") {
    return relativeTime(0, -((client.ordinal % 5) + 1), -1, "now");
  }
  if (client.createdBucket === "month") {
    return relativeTime(0, -((client.ordinal - 17) % 10), -1, "now");
  }

  const months = -Number(client.createdBucket.slice("month-".length));
  return relativeTime(months, (client.ordinal % 20) + 1, 10);
}

function buildProfiles(clients: SeedUser[]): SeedOnboardingProfile[] {
  return clients.map((client) => {
    const [segmentName, subcategoryName] =
      segmentCatalog[(client.ordinal - 1) % segmentCatalog.length]!;
    const suffix = String(client.ordinal).padStart(3, "0");

    return {
      userId: client.id,
      fullName: `Cliente Demonstração ${suffix}`,
      whatsappE164: `+5511900000${suffix}`,
      segmentName,
      subcategoryName,
      customSubcategory:
        subcategoryName === null ? `Atendimento especializado ${suffix}` : null,
      marketingConsent:
        client.accountState !== "deleted" &&
        (client.ordinal % 2 === 0 ||
          consentReplacementOrdinals.has(client.ordinal)),
      completedAt: profileCompletedAt(client),
    };
  });
}

function buildReports(
  admin: SeedUser,
  clients: SeedUser[],
): SeedAssignedReport[] {
  const quickReportTemplates = currentReportTemplates.filter(
    (template) => template.analysisMode === "quick",
  );
  const reports: SeedAssignedReport[] = currentReportTemplates.map(
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
    for (
      let reportOrdinal = 0;
      reportOrdinal < client.reportCount;
      reportOrdinal += 1
    ) {
      const template =
        reportOrdinal === 0
          ? quickReportTemplates[client.ordinal % quickReportTemplates.length]!
          : currentReportTemplates[
              (client.ordinal + reportOrdinal) % currentReportTemplates.length
            ]!;
      const months =
        client.accessSource === "courtesy"
          ? -(2 + (reportOrdinal % 5))
          : -(reportOrdinal % 6);
      const createdAt = relativeTime(
        months,
        (client.ordinal + reportOrdinal) % 20,
        10,
      );
      reports.push({
        ownerId: client.id,
        ownerOrdinal: client.ordinal,
        reportOrdinal,
        templateKey: template.key,
        createdAt,
        deletedAt:
          client.ordinal >= 81 && client.ordinal <= 88 && reportOrdinal < 2
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
  catalogCode?: SeedContract["catalogCode"];
  renewalAdjustmentStatus?: SeedContract["renewalAdjustmentStatus"];
  renewalAdjustmentAttemptCount?: number;
  renewalAdjustedAt?: SeedRelativeTime | null;
  renewalAdjustmentLastErrorCode?: SeedContract["renewalAdjustmentLastErrorCode"];
  accessStartsAt?: SeedRelativeTime | null;
  accessEndsAt?: SeedRelativeTime | null;
  createdAt?: SeedRelativeTime;
}): SeedContract {
  const tuple = input.tuple ?? validPurchaseTuples[0];
  const [billingMode, paymentMethod, chargeType] = tuple;
  const catalogCode = input.catalogCode ?? "standard";
  const launch = catalogCode === "launch";
  const requiresRenewalAdjustment =
    launch &&
    billingMode === "monthly" &&
    paymentMethod === "credit_card" &&
    chargeType === "recurring";
  const cancelAtPeriodEnd = input.status === "cancel_at_period_end";
  return {
    id: seedUuid("contract", input.ownerOrdinal, input.childOrdinal),
    userId: input.userId,
    priceId: priceIds[catalogCode][billingMode],
    externalReference: input.externalReference,
    billingMode,
    paymentMethod,
    chargeType,
    amountCents:
      billingMode === "semiannual"
        ? launch
          ? 17_940
          : 23_940
        : launch
          ? 3_990
          : 4_990,
    installmentLimit: billingMode === "semiannual" ? 6 : null,
    catalogCode,
    bonusMonths: launch ? (billingMode === "semiannual" ? 6 : 1) : 0,
    accessMonths:
      billingMode === "semiannual" ? (launch ? 12 : 6) : launch ? 2 : 1,
    renewalAdjustmentStatus:
      input.renewalAdjustmentStatus ??
      (requiresRenewalAdjustment ? "pending" : "not_required"),
    renewalAdjustmentAttemptCount: input.renewalAdjustmentAttemptCount ?? 0,
    renewalAdjustedAt: input.renewalAdjustedAt ?? null,
    renewalAdjustmentLastErrorCode:
      input.renewalAdjustmentLastErrorCode ?? null,
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
      input.contract.billingMode === "semiannual"
        ? input.contract.amountCents / 6
        : input.contract.amountCents,
    installmentNumber: input.contract.billingMode === "semiannual" ? 1 : null,
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
    externalReference: "demo-admin-semiannual-active",
    status: "active",
    tuple: validPurchaseTuples[3],
    catalogCode: "launch",
    accessStartsAt: relativeTime(-6),
    accessEndsAt: relativeTime(1),
    createdAt: relativeTime(-6),
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
        status: statusFixturePayments[index]!,
        dueAt: relativeTime(-1, index + 1),
      }),
    );
  });

  for (const client of clients.filter((user) => user.accessSource === "paid")) {
    const completedLaunchRenewal = client.ordinal === 45;
    const reconciliationLaunchRenewal = client.ordinal === 46;
    const launchMonthly = completedLaunchRenewal || reconciliationLaunchRenewal;
    const contract = baseContract({
      ownerOrdinal: client.ordinal,
      childOrdinal: 0,
      userId: client.id,
      externalReference: `demo-client-${client.ordinal}-active`,
      status: "active",
      tuple: launchMonthly
        ? validPurchaseTuples[0]
        : validPurchaseTuples[client.ordinal % validPurchaseTuples.length],
      catalogCode: launchMonthly ? "launch" : "standard",
      renewalAdjustmentStatus: completedLaunchRenewal
        ? "completed"
        : reconciliationLaunchRenewal
          ? "pending_reconciliation"
          : undefined,
      renewalAdjustmentAttemptCount: launchMonthly ? 1 : undefined,
      renewalAdjustedAt: completedLaunchRenewal ? relativeTime(0, -2) : null,
      renewalAdjustmentLastErrorCode: reconciliationLaunchRenewal
        ? "provider_ambiguous"
        : null,
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

  for (const client of clients.filter(
    (user) => user.accessSource === "courtesy",
  )) {
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
        status: client.ordinal === 85 ? "pending" : "received",
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

function buildBonusGrants(
  contracts: SeedContract[],
  payments: SeedPayment[],
): SeedBonusGrant[] {
  const contractById = new Map(
    contracts.map((contract) => [contract.id, contract]),
  );
  const grants: SeedBonusGrant[] = [];

  for (const payment of payments) {
    if (["pending", "overdue", "capture_refused"].includes(payment.status)) {
      continue;
    }

    const contract = contractById.get(payment.contractId);
    if (!contract) {
      throw new Error(`Missing demo contract for payment ${payment.id}.`);
    }

    const fullRefund = payment.status === "refunded";
    const chargeback =
      payment.status === "chargeback_requested" ||
      payment.status === "chargeback_dispute";
    const revokedAt = fullRefund
      ? payment.refundedAt
      : chargeback
        ? payment.chargebackAt
        : null;

    if ((fullRefund || chargeback) && revokedAt === null) {
      throw new Error(`Missing revocation time for payment ${payment.id}.`);
    }

    grants.push({
      id: seedUuid("bonusGrant", grants.length),
      userId: contract.userId,
      contractId: contract.id,
      grantedAt: payment.confirmedAt ?? payment.receivedAt ?? payment.dueAt,
      revokedAt,
      revocationReason: fullRefund
        ? "full_refund"
        : chargeback
          ? "chargeback"
          : null,
    });
  }

  return grants;
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
      blockedAt: client.accountState === "blocked" ? relativeTime(-1, 4) : null,
      deletedAt: client.accountState === "deleted" ? relativeTime(-1, 8) : null,
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
  const profiles = buildProfiles(clients);
  const reports = buildReports(admin, clients);
  const { contracts, payments } = buildBilling(admin, clients);
  const bonusGrants = buildBonusGrants(contracts, payments);
  const { states, events } = buildStatesAndEvents(admin, clients);
  return {
    admin,
    clients,
    profiles,
    reports,
    contracts,
    payments,
    bonusGrants,
    states,
    events,
  };
}

export {
  buildDemoCatalog,
  clientReportCount,
  contractStatuses,
  paymentStatuses,
  priceIds,
  validPurchaseTuples,
};
