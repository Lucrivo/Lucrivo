import { z } from "zod";

const uuid = z.uuid();
const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.string().min(1),
});
const accountStateSchema = z.enum(["active", "blocked", "deleted"]);
const accessSchema = z.enum(["free", "paid", "courtesy"]);
const subscriptionSchema = z
  .object({
    billingMode: z.enum(["monthly", "annual"]),
    status: z.string(),
    accessEndsAt: z.iso.datetime({ offset: true }),
  })
  .nullable();
const userSchema = z.object({
  id: uuid,
  email: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  lastSignInAt: z.iso.datetime({ offset: true }).nullable(),
  state: accountStateSchema,
  access: accessSchema,
  courtesyExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  subscription: subscriptionSchema,
  diagnosisCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  hasPaidAccess: z.boolean(),
});
const adminUserListSchema = z.object({
  items: z.array(userSchema),
  nextCursor: cursorSchema.nullable(),
});
const adminUserDetailSchema = userSchema.extend({
  blockedAt: z.iso.datetime({ offset: true }).nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
const diagnosisSchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  category: z.string(),
  scenario: z.string(),
  isFreeReport: z.boolean(),
});
const contractSchema = z.object({
  id: uuid,
  createdAt: z.iso.datetime({ offset: true }),
  billingMode: z.string(),
  paymentMethod: z.string(),
  status: z.string(),
  amountCents: z.number(),
  accessStartsAt: z.iso.datetime({ offset: true }).nullable(),
  accessEndsAt: z.iso.datetime({ offset: true }).nullable(),
  cancelAtPeriodEnd: z.boolean(),
  cancellationConfirmedAt: z.iso.datetime({ offset: true }).nullable(),
});
const eventStateSchema = z.object({
  blockedAt: z.iso.datetime({ offset: true }).nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  courtesyExpiresAt: z.iso.datetime({ offset: true }).nullable(),
});
const historySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  actorEmail: z.string(),
  action: z.string(),
  reason: z.string(),
  before: eventStateSchema,
  after: eventStateSchema,
});
const itemSchemas = {
  diagnoses: diagnosisSchema,
  subscriptions: contractSchema,
  history: historySchema,
};
const listFilterSchema = z.object({
  q: z.string().trim().max(120).default(""),
  state: z
    .enum(["current", "active", "blocked", "deleted", "all"])
    .default("current"),
  access: z.enum(["all", "free", "paid", "courtesy"]).default("all"),
  cursor: z.string().optional(),
  back: z.string().max(8000).optional(),
});
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
    courtesyExpiresAt: z.iso.datetime({ offset: true }).nullable(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .refine(
    (input) =>
      input.action === "courtesy_granted"
        ? input.courtesyExpiresAt !== null &&
          new Date(input.courtesyExpiresAt) > new Date()
        : input.courtesyExpiresAt === null,
    { message: "Validade de cortesia inválida" },
  );

type AdminUser = z.infer<typeof userSchema>;
type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
type AdminUserList = z.infer<typeof adminUserListSchema>;
type AdminUserKind = keyof typeof itemSchemas;
type AdminUserFilters = z.infer<typeof listFilterSchema>;
type AdminUserAction = z.infer<typeof actionSchema>;

export {
  actionSchema,
  adminUserDetailSchema,
  adminUserListSchema,
  cursorSchema,
  itemSchemas,
  listFilterSchema,
  uuid,
  type AdminUser,
  type AdminUserAction,
  type AdminUserDetail,
  type AdminUserFilters,
  type AdminUserKind,
  type AdminUserList,
};
