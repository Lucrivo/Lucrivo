import { z } from "zod";

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const monthPeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00.000Z`);

    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().startsWith(value)
    );
  });

const historyPointSchema = z.strictObject({
  period: monthPeriodSchema,
  valueCents: countSchema,
});

const growthPointSchema = z.strictObject({
  period: monthPeriodSchema,
  value: countSchema,
});

const contractStatusSchema = z.enum([
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
]);

const adminDashboardSnapshotSchema = z.strictObject({
  generatedAt: z.iso.datetime({ offset: true }),
  metrics: z.strictObject({
    newUsers: z.strictObject({
      today: countSchema,
      week: countSchema,
      month: countSchema,
    }),
    activeUsers: countSchema,
    freeDiagnoses: countSchema,
    activeSubscriptions: countSchema,
    canceledSubscriptions: countSchema,
    monthlyRevenueCents: countSchema,
    cancellationOpeningBase: countSchema,
    cancellationRateBasisPoints: z.number().int().nonnegative().nullable(),
  }),
  revenueHistory: z.array(historyPointSchema).length(12),
  userGrowth: z.array(growthPointSchema).length(6),
  recentSubscriptions: z
    .array(
      z.strictObject({
        id: z.uuid(),
        email: z.email().nullable(),
        billingMode: z.enum(["monthly", "annual"]),
        status: contractStatusSchema,
        createdAt: z.iso.datetime({ offset: true }),
      }),
    )
    .max(5),
});

type AdminDashboardSnapshot = z.infer<typeof adminDashboardSnapshotSchema>;
type ContractStatus = z.infer<typeof contractStatusSchema>;

export {
  adminDashboardSnapshotSchema,
  contractStatusSchema,
  type AdminDashboardSnapshot,
  type ContractStatus,
};
