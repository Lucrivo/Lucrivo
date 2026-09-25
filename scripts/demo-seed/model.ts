type SeedUuidKind =
  | "user"
  | "identity"
  | "contract"
  | "payment"
  | "submission"
  | "item"
  | "ingredient";

type SqlCast =
  | "uuid"
  | "text"
  | "boolean"
  | "smallint"
  | "integer"
  | "bigint"
  | "date"
  | "timestamptz"
  | "jsonb"
  | "public.business_category"
  | "public.service_pricing_method"
  | "public.service_work_hours_period";

type SeedSqlValue = string | number | boolean | null | object | unknown[];

type SeedSqlArgument = {
  name: string;
  value: SeedSqlValue;
  cast: SqlCast;
};

type SeedRpcCall = {
  functionName: string;
  arguments: SeedSqlArgument[];
};

type SeedAccountState = "active" | "blocked" | "deleted";
type SeedAccessSource = "free" | "paid" | "courtesy";
type SeedCreatedBucket =
  | "today"
  | "week"
  | "month"
  | `month-${1 | 2 | 3 | 4 | 5}`;

type SeedUser = {
  ordinal: number;
  id: string;
  identityId: string;
  email: string;
  isAdmin: boolean;
  accountState: SeedAccountState;
  accessSource: SeedAccessSource;
  reportCount: number;
  createdBucket: SeedCreatedBucket;
  lastSignInOffsetDays: number | null;
};

type SeedRelativeTime = {
  anchor: "now" | "month_start";
  months: number;
  days: number;
  hours: number;
};

type SeedContractStatus =
  | "pending"
  | "pending_reconciliation"
  | "active"
  | "cancel_at_period_end"
  | "expired"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed";

type SeedPaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "capture_refused"
  | "refunded"
  | "partially_refunded"
  | "chargeback_requested"
  | "chargeback_dispute";

type SeedAssignedReport = {
  ownerId: string;
  ownerOrdinal: number;
  reportOrdinal: number;
  templateKey: string;
  createdAt: SeedRelativeTime;
  deletedAt: SeedRelativeTime | null;
};

type SeedContract = {
  id: string;
  userId: string;
  priceId: string;
  externalReference: string;
  billingMode: "monthly" | "annual";
  paymentMethod: "credit_card" | "pix";
  chargeType: "recurring" | "installment" | "detached";
  amountCents: number;
  installmentLimit: number | null;
  accessMonths: 1 | 12;
  status: SeedContractStatus;
  accessStartsAt: SeedRelativeTime | null;
  accessEndsAt: SeedRelativeTime | null;
  cancelAtPeriodEnd: boolean;
  cancellationRequestedAt: SeedRelativeTime | null;
  cancellationConfirmedAt: SeedRelativeTime | null;
  canceledAt: SeedRelativeTime | null;
  createdAt: SeedRelativeTime;
};

type SeedPayment = {
  id: string;
  contractId: string;
  externalPaymentId: string;
  status: SeedPaymentStatus;
  valueCents: number;
  installmentNumber: number | null;
  dueAt: SeedRelativeTime;
  confirmedAt: SeedRelativeTime | null;
  receivedAt: SeedRelativeTime | null;
  refundedAt: SeedRelativeTime | null;
  chargebackAt: SeedRelativeTime | null;
};

type SeedAdminUserState = {
  userId: string;
  blockedAt: SeedRelativeTime | null;
  deletedAt: SeedRelativeTime | null;
  courtesyExpiresAt: SeedRelativeTime | null;
  version: number;
};

type SeedAdminUserEvent = {
  userId: string;
  actorId: string;
  action:
    | "courtesy_granted"
    | "courtesy_ended"
    | "blocked"
    | "unblocked"
    | "soft_deleted"
    | "restored";
  marker: string;
  reason: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: SeedRelativeTime;
};

type DemoSeedCatalog = {
  admin: SeedUser;
  clients: SeedUser[];
  reports: SeedAssignedReport[];
  contracts: SeedContract[];
  payments: SeedPayment[];
  states: SeedAdminUserState[];
  events: SeedAdminUserEvent[];
};

export type {
  DemoSeedCatalog,
  SeedAccountState,
  SeedAccessSource,
  SeedAdminUserEvent,
  SeedAdminUserState,
  SeedAssignedReport,
  SeedContract,
  SeedContractStatus,
  SeedCreatedBucket,
  SeedPayment,
  SeedPaymentStatus,
  SeedRelativeTime,
  SeedRpcCall,
  SeedSqlArgument,
  SeedSqlValue,
  SeedUuidKind,
  SeedUser,
  SqlCast,
};
