import { z } from "zod";

import { adminPageSchema, pageNumberSchema } from "@/modules/admin/admin-page";

const uuid = z.uuid();
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const safeNonnegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const nullableSafeIntegerSchema = safeNonnegativeIntegerSchema.nullable();
const signedSafeIntegerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const nullableSignedSafeIntegerSchema = signedSafeIntegerSchema.nullable();

const cursorSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    id: z.string().min(1).max(200),
  })
  .strict();

function adminCursorPageSchema<T extends z.ZodType>(item: T) {
  return z
    .object({
      items: z.array(item),
      nextCursor: cursorSchema.nullable(),
    })
    .strict();
}

const accountStateSchema = z.enum(["active", "blocked", "deleted"]);
const accessSchema = z.enum(["free", "paid", "courtesy"]);
const billingModeSchema = z.enum(["monthly", "semiannual"]);
const paymentMethodSchema = z.enum(["credit_card", "pix"]);
const chargeTypeSchema = z.enum(["recurring", "installment", "detached"]);
const contractStatusSchema = z.enum([
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "refund_pending",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
]);
const refundStatusSchema = z.enum([
  "processing",
  "submitted",
  "confirmed",
  "rejected",
  "pending_reconciliation",
]);
const categorySchema = z.enum(["service", "product", "production"]);
const scenarioSchema = z.enum([
  "minute",
  "hour",
  "appointment",
  "day",
  "week",
  "month",
  "resale",
  "digital",
  "manufacturing",
]);
const analysisModeSchema = z.enum(["quick", "detailed"]);
const verdictSchema = z.enum([
  "missing_price",
  "direct_loss",
  "incomplete_volume",
  "no_sales",
  "operational_loss",
  "break_even",
  "positive_result",
  "tight_margin",
  "adequate_margin",
  "above_target",
]);
const prioritySchema = z.enum(["cost", "price", "margin", "volume"]);

const currentSubscriptionSchema = z
  .object({
    billingMode: billingModeSchema,
    status: contractStatusSchema,
    accessEndsAt: isoDateTimeSchema,
  })
  .strict()
  .nullable();

const adminUserSchema = z
  .object({
    id: uuid,
    email: z.string().min(1).max(320),
    createdAt: isoDateTimeSchema,
    lastSignInAt: isoDateTimeSchema.nullable(),
    state: accountStateSchema,
    access: accessSchema,
    courtesyExpiresAt: isoDateTimeSchema.nullable(),
    subscription: currentSubscriptionSchema,
    diagnosisCount: safeNonnegativeIntegerSchema,
    version: safeNonnegativeIntegerSchema,
    hasPaidAccess: z.boolean(),
  })
  .strict();

const segmentSchema = z
  .object({
    id: safeNonnegativeIntegerSchema,
    name: z.string().min(1).max(60),
  })
  .strict();
const subcategorySchema = z
  .object({
    id: safeNonnegativeIntegerSchema.nullable(),
    name: z.string().min(1).max(80),
    customName: z.string().min(1).max(80).nullable(),
  })
  .strict();

const adminUserListSchema = adminPageSchema(adminUserSchema);
const adminUserDetailSchema = adminUserSchema
  .extend({
    fullName: z.string().min(1).max(120).nullable(),
    onboardingCompletedAt: isoDateTimeSchema.nullable(),
    segment: segmentSchema.nullable(),
    subcategory: subcategorySchema.nullable(),
    blockedAt: isoDateTimeSchema.nullable(),
    deletedAt: isoDateTimeSchema.nullable(),
  })
  .strict();

const aiModelUsageSchema = z
  .object({
    model: z.string().min(1).max(100),
    inputTokens: safeNonnegativeIntegerSchema,
    cachedInputTokens: safeNonnegativeIntegerSchema,
    outputTokens: safeNonnegativeIntegerSchema,
  })
  .strict();
const aiUsageSchema = z
  .object({
    completedTurns: safeNonnegativeIntegerSchema,
    failedTurns: safeNonnegativeIntegerSchema,
    inputTokens: safeNonnegativeIntegerSchema,
    cachedInputTokens: safeNonnegativeIntegerSchema,
    outputTokens: safeNonnegativeIntegerSchema,
    lastUsedAt: isoDateTimeSchema,
    models: z.array(aiModelUsageSchema),
  })
  .strict();

const adminUserDiagnosisSchema = z
  .object({
    id: z.string().regex(/^\d+$/),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    version: safeNonnegativeIntegerSchema,
    category: categorySchema,
    scenario: scenarioSchema,
    analysisMode: analysisModeSchema,
    isFreeReport: z.boolean(),
    currentPriceCents: nullableSafeIntegerSchema,
    realMarginBasisPoints: nullableSignedSafeIntegerSchema,
    unitProfitCents: nullableSignedSafeIntegerSchema,
    monthlyGrossRevenueCents: nullableSafeIntegerSchema,
    monthlyResultCents: nullableSignedSafeIntegerSchema,
    itemCount: nullableSafeIntegerSchema,
    isPartial: z.boolean().nullable(),
    verdict: verdictSchema,
    priority: prioritySchema,
    aiUsage: aiUsageSchema.nullable(),
  })
  .strict();

const paymentSummarySchema = z
  .object({
    confirmedCount: safeNonnegativeIntegerSchema,
    receivedCents: safeNonnegativeIntegerSchema,
    lastPaymentAt: isoDateTimeSchema.nullable(),
  })
  .strict();
const refundSummarySchema = z
  .object({
    status: refundStatusSchema,
    requestedAt: isoDateTimeSchema,
    refundConfirmedAt: isoDateTimeSchema.nullable(),
  })
  .strict()
  .nullable();
const adminUserSubscriptionSchema = z
  .object({
    id: uuid,
    createdAt: isoDateTimeSchema,
    catalogCode: z.enum(["launch", "launch_price", "standard"]),
    billingMode: billingModeSchema,
    paymentMethod: paymentMethodSchema,
    chargeType: chargeTypeSchema,
    amountCents: safeNonnegativeIntegerSchema,
    currency: z.literal("BRL"),
    installmentLimit: safeNonnegativeIntegerSchema.nullable(),
    accessMonths: safeNonnegativeIntegerSchema,
    bonusMonths: safeNonnegativeIntegerSchema,
    status: contractStatusSchema,
    accessStartsAt: isoDateTimeSchema.nullable(),
    accessEndsAt: isoDateTimeSchema.nullable(),
    cancelAtPeriodEnd: z.boolean(),
    cancellationRequestedAt: isoDateTimeSchema.nullable(),
    cancellationConfirmedAt: isoDateTimeSchema.nullable(),
    canceledAt: isoDateTimeSchema.nullable(),
    payment: paymentSummarySchema,
    refund: refundSummarySchema,
  })
  .strict();

const historyBaseShape = {
  eventKey: z.string().min(1).max(200),
  occurredAt: isoDateTimeSchema,
  title: z.string().min(1).max(120),
};
const profileEventPayloadSchema = z
  .object({
    fullName: z.string().min(1).max(120),
    segment: segmentSchema,
    subcategory: subcategorySchema,
  })
  .strict();
const paymentEventPayloadSchema = z
  .object({
    contractId: uuid,
    paymentId: uuid,
    billingMode: billingModeSchema,
    paymentMethod: paymentMethodSchema,
    amountCents: safeNonnegativeIntegerSchema,
    installmentNumber: safeNonnegativeIntegerSchema.nullable(),
  })
  .strict();
const contractEventPayloadSchema = z
  .object({
    contractId: uuid,
    accessEndsAt: isoDateTimeSchema.nullable(),
  })
  .strict();
const refundEventPayloadSchema = z
  .object({
    contractId: uuid,
    status: refundStatusSchema,
    requestedAt: isoDateTimeSchema,
    refundConfirmedAt: isoDateTimeSchema.nullable(),
  })
  .strict();
const adminStateChangeSchema = z
  .object({
    field: z.enum(["blockedAt", "deletedAt", "courtesyExpiresAt"]),
    before: isoDateTimeSchema.nullable(),
    after: isoDateTimeSchema.nullable(),
  })
  .strict();

const accountEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.literal("account_registered"),
    payload: z.object({}).strict(),
  })
  .strict();
const profileEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum(["onboarding_completed", "profile_updated"]),
    payload: profileEventPayloadSchema,
  })
  .strict();
const consentEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum([
      "whatsapp_consent_granted",
      "whatsapp_consent_declined",
      "whatsapp_consent_revoked",
    ]),
    payload: z
      .object({
        source: z.enum(["onboarding", "account"]),
        copyVersion: z.string().min(1).max(64),
      })
      .strict(),
  })
  .strict();
const diagnosisEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.literal("diagnosis_created"),
    payload: z
      .object({
        diagnosisId: z.string().regex(/^\d+$/),
        category: categorySchema,
        scenario: scenarioSchema,
        analysisMode: analysisModeSchema,
        isFreeReport: z.boolean(),
        verdict: verdictSchema,
        priority: prioritySchema,
        aiUsage: aiUsageSchema.nullable(),
      })
      .strict(),
  })
  .strict();
const subscriptionCreatedEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.literal("subscription_created"),
    payload: z
      .object({
        contractId: uuid,
        billingMode: billingModeSchema,
        paymentMethod: paymentMethodSchema,
        chargeType: chargeTypeSchema,
        amountCents: safeNonnegativeIntegerSchema,
        status: contractStatusSchema,
        accessStartsAt: isoDateTimeSchema.nullable(),
        accessEndsAt: isoDateTimeSchema.nullable(),
      })
      .strict(),
  })
  .strict();
const paymentEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum([
      "subscription_activated",
      "subscription_renewed",
      "payment_failed",
      "payment_refunded",
      "payment_chargeback",
    ]),
    payload: paymentEventPayloadSchema,
  })
  .strict();
const contractEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum([
      "cancellation_requested",
      "cancellation_confirmed",
      "subscription_expired",
    ]),
    payload: contractEventPayloadSchema,
  })
  .strict();
const refundEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum(["refund_requested", "refund_confirmed"]),
    payload: refundEventPayloadSchema,
  })
  .strict();
const adminActionEventSchema = z
  .object({
    ...historyBaseShape,
    kind: z.enum([
      "admin_courtesy_granted",
      "admin_courtesy_ended",
      "admin_blocked",
      "admin_unblocked",
      "admin_soft_deleted",
      "admin_restored",
    ]),
    payload: z
      .object({
        actorEmail: z.string().min(1).max(320),
        reason: z.string().min(1).max(500),
        changes: z.array(adminStateChangeSchema).max(3),
      })
      .strict(),
  })
  .strict();

const adminUserHistoryEventSchema = z.union([
  accountEventSchema,
  profileEventSchema,
  consentEventSchema,
  diagnosisEventSchema,
  subscriptionCreatedEventSchema,
  paymentEventSchema,
  contractEventSchema,
  refundEventSchema,
  adminActionEventSchema,
]);

const adminUserDiagnosesPageSchema = adminCursorPageSchema(
  adminUserDiagnosisSchema,
);
const adminUserSubscriptionsPageSchema = adminCursorPageSchema(
  adminUserSubscriptionSchema,
);
const adminUserHistoryPageSchema = adminCursorPageSchema(
  adminUserHistoryEventSchema,
);

const itemSchemas = {
  diagnoses: adminUserDiagnosisSchema,
  subscriptions: adminUserSubscriptionSchema,
  history: adminUserHistoryEventSchema,
};

const listFilterSchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    state: z
      .enum(["current", "active", "blocked", "deleted", "all"])
      .default("current"),
    access: z.enum(["all", "free", "paid", "courtesy"]).default("all"),
    page: pageNumberSchema.default(1),
  })
  .strict();

const actionSchema = z
  .object({
    userId: uuid,
    action: z.enum([
      "courtesy_granted",
      "courtesy_ended",
      "blocked",
      "unblocked",
      "soft_deleted",
      "restored",
    ]),
    reason: z.string().trim().min(1).max(500),
    courtesyExpiresAt: isoDateTimeSchema.nullable(),
    expectedVersion: safeNonnegativeIntegerSchema,
  })
  .strict()
  .refine(
    (input) =>
      input.action === "courtesy_granted"
        ? input.courtesyExpiresAt !== null &&
          new Date(input.courtesyExpiresAt) > new Date()
        : input.courtesyExpiresAt === null,
    { message: "Validade de cortesia inválida" },
  );

type AdminUser = z.infer<typeof adminUserSchema>;
type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
type AdminUserList = z.infer<typeof adminUserListSchema>;
type AdminUserDiagnosis = z.infer<typeof adminUserDiagnosisSchema>;
type AdminUserSubscription = z.infer<typeof adminUserSubscriptionSchema>;
type AdminUserHistoryEvent = z.infer<typeof adminUserHistoryEventSchema>;
type AdminUserDiagnosesPage = z.infer<typeof adminUserDiagnosesPageSchema>;
type AdminUserSubscriptionsPage = z.infer<
  typeof adminUserSubscriptionsPageSchema
>;
type AdminUserHistoryPage = z.infer<typeof adminUserHistoryPageSchema>;
type AdminUserKind = keyof typeof itemSchemas;
type AdminUserFilters = z.infer<typeof listFilterSchema>;
type AdminUserAction = z.infer<typeof actionSchema>;

export {
  accountStateSchema,
  actionSchema,
  adminCursorPageSchema,
  adminStateChangeSchema,
  adminUserDetailSchema,
  adminUserDiagnosesPageSchema,
  adminUserDiagnosisSchema,
  adminUserHistoryEventSchema,
  adminUserHistoryPageSchema,
  adminUserListSchema,
  adminUserSubscriptionsPageSchema,
  adminUserSubscriptionSchema,
  aiModelUsageSchema,
  aiUsageSchema,
  analysisModeSchema,
  billingModeSchema,
  categorySchema,
  chargeTypeSchema,
  contractStatusSchema,
  cursorSchema,
  isoDateTimeSchema,
  itemSchemas,
  listFilterSchema,
  paymentMethodSchema,
  prioritySchema,
  refundStatusSchema,
  scenarioSchema,
  uuid,
  verdictSchema,
  type AdminUser,
  type AdminUserAction,
  type AdminUserDetail,
  type AdminUserDiagnosis,
  type AdminUserDiagnosesPage,
  type AdminUserFilters,
  type AdminUserHistoryEvent,
  type AdminUserHistoryPage,
  type AdminUserKind,
  type AdminUserList,
  type AdminUserSubscription,
  type AdminUserSubscriptionsPage,
};
