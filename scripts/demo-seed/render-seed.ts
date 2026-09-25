import type {
  DemoSeedCatalog,
  SeedContract,
  SeedCreatedBucket,
  SeedRelativeTime,
  SeedSqlValue,
  SeedUser,
  SqlCast,
} from "./model";
import { allAdminReportTemplates } from "./historical-report-scenarios";
import { buildSeedReportIds, currentReportTemplates } from "./report-scenarios";
import {
  renderBatchInsert,
  renderRpcCall,
  sqlExpression,
  sqlLiteral,
} from "./sql";

const PASSWORD = "LucrivoSeed2026AA";
const INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

function relativeTimeSql(value: SeedRelativeTime) {
  const base =
    value.anchor === "now"
      ? "pg_catalog.statement_timestamp()"
      : "pg_catalog.date_trunc('month', pg_catalog.statement_timestamp())";
  const parts = [
    value.months === 0 ? "" : ` + interval '${value.months} months'`,
    value.days === 0 ? "" : ` + interval '${value.days} days'`,
    value.hours === 0 ? "" : ` + interval '${value.hours} hours'`,
  ];
  return sqlExpression(`${base}${parts.join("")}`);
}

function createdAtFor(user: SeedUser) {
  const ordinal = user.ordinal;
  const byBucket: Record<SeedCreatedBucket, SeedRelativeTime> = {
    today: { anchor: "now", months: 0, days: 0, hours: -(ordinal % 12) },
    week: { anchor: "now", months: 0, days: -((ordinal % 5) + 1), hours: -2 },
    month: {
      anchor: "month_start",
      months: 0,
      days: (ordinal % 18) + 1,
      hours: 9,
    },
    "month-1": {
      anchor: "month_start",
      months: -1,
      days: (ordinal % 20) + 1,
      hours: 9,
    },
    "month-2": {
      anchor: "month_start",
      months: -2,
      days: (ordinal % 20) + 1,
      hours: 9,
    },
    "month-3": {
      anchor: "month_start",
      months: -3,
      days: (ordinal % 20) + 1,
      hours: 9,
    },
    "month-4": {
      anchor: "month_start",
      months: -4,
      days: (ordinal % 20) + 1,
      hours: 9,
    },
    "month-5": {
      anchor: "month_start",
      months: -5,
      days: (ordinal % 20) + 1,
      hours: 9,
    },
  };
  return relativeTimeSql(byBucket[user.createdBucket]);
}

function uuidArray(userIds: string[]): string {
  return `array[${userIds.map((id) => sqlLiteral(id, "uuid")).join(", ")}]::uuid[]`;
}

function cleanupSql(seedUsers: string): string {
  return [
    `delete from public.detailed_diagnosis_ingredients where user_id = any(${seedUsers});`,
    `delete from public.detailed_diagnosis_items where user_id = any(${seedUsers});`,
    `delete from public.detailed_diagnoses where user_id = any(${seedUsers});`,
    `delete from public.service_diagnoses where user_id = any(${seedUsers});`,
    `delete from public.product_diagnoses where user_id = any(${seedUsers});`,
    `delete from public.production_diagnoses where user_id = any(${seedUsers});`,
    `delete from public.diagnoses where user_id = any(${seedUsers});`,
    `delete from public.billing_payments where contract_id in (select id from public.billing_contracts where user_id = any(${seedUsers}));`,
    `delete from public.billing_contracts where user_id = any(${seedUsers});`,
    `delete from public.billing_customers where user_id = any(${seedUsers});`,
    `delete from private.admin_user_state where user_id = any(${seedUsers});`,
  ].join("\n");
}

function renderAuthUsers(users: SeedUser[]): string {
  const columns = [
    "instance_id",
    "id",
    "aud",
    "role",
    "email",
    "encrypted_password",
    "email_confirmed_at",
    "confirmation_token",
    "recovery_token",
    "email_change_token_new",
    "email_change",
    "raw_app_meta_data",
    "raw_user_meta_data",
    "created_at",
    "updated_at",
    "last_sign_in_at",
    "is_sso_user",
    "is_anonymous",
  ];
  const casts: SqlCast[] = [
    "uuid",
    "uuid",
    "text",
    "text",
    "text",
    "text",
    "timestamptz",
    "text",
    "text",
    "text",
    "text",
    "jsonb",
    "jsonb",
    "timestamptz",
    "timestamptz",
    "timestamptz",
    "boolean",
    "boolean",
  ];
  const rows: SeedSqlValue[][] = users.map((user) => {
    const createdAt = createdAtFor(user);
    const lastSignInAt =
      user.lastSignInOffsetDays === null
        ? null
        : relativeTimeSql({
            anchor: "now",
            months: 0,
            days: -user.lastSignInOffsetDays,
            hours: -(user.ordinal % 12),
          });
    return [
      INSTANCE_ID,
      user.id,
      "authenticated",
      "authenticated",
      user.email,
      sqlExpression(
        `extensions.crypt('${PASSWORD}', extensions.gen_salt('bf'))`,
      ),
      createdAt,
      "",
      "",
      "",
      "",
      { provider: "email", providers: ["email"] },
      { email_verified: true },
      createdAt,
      sqlExpression("pg_catalog.statement_timestamp()"),
      lastSignInAt,
      false,
      false,
    ];
  });
  return renderBatchInsert({
    table: "auth.users",
    columns,
    rows,
    casts,
    suffix: `on conflict (id) do update set
  instance_id = excluded.instance_id,
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  last_sign_in_at = excluded.last_sign_in_at,
  deleted_at = null,
  is_sso_user = false,
  is_anonymous = false`,
  });
}

function renderIdentities(users: SeedUser[]): string {
  return renderBatchInsert({
    table: "auth.identities",
    columns: [
      "id",
      "provider_id",
      "user_id",
      "identity_data",
      "provider",
      "last_sign_in_at",
      "created_at",
      "updated_at",
    ],
    rows: users.map((user) => {
      const createdAt = createdAtFor(user);
      const lastSignInAt =
        user.lastSignInOffsetDays === null
          ? null
          : relativeTimeSql({
              anchor: "now",
              months: 0,
              days: -user.lastSignInOffsetDays,
              hours: -(user.ordinal % 12),
            });
      return [
        user.identityId,
        user.id,
        user.id,
        {
          sub: user.id,
          email: user.email,
          email_verified: true,
          phone_verified: false,
        },
        "email",
        lastSignInAt,
        createdAt,
        sqlExpression("pg_catalog.statement_timestamp()"),
      ];
    }),
    casts: [
      "uuid",
      "text",
      "uuid",
      "jsonb",
      "text",
      "timestamptz",
      "timestamptz",
      "timestamptz",
    ],
    suffix: `on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  last_sign_in_at = excluded.last_sign_in_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at`,
  });
}

function renderBillingCustomers(catalog: DemoSeedCatalog): string {
  const usersById = new Map(
    [catalog.admin, ...catalog.clients].map((user) => [user.id, user]),
  );
  const customerIds = [
    ...new Set(catalog.contracts.map((contract) => contract.userId)),
  ];
  return renderBatchInsert({
    table: "public.billing_customers",
    columns: ["user_id", "asaas_customer_id", "created_at", "updated_at"],
    rows: customerIds.map((userId) => {
      const user = usersById.get(userId)!;
      return [
        userId,
        `cus_demo_${String(user.ordinal).padStart(3, "0")}`,
        createdAtFor(user),
        sqlExpression("pg_catalog.statement_timestamp()"),
      ];
    }),
    casts: ["uuid", "text", "timestamptz", "timestamptz"],
    suffix: `on conflict (user_id) do update set
  asaas_customer_id = excluded.asaas_customer_id,
  updated_at = excluded.updated_at`,
  });
}

const contractColumns = [
  "id",
  "user_id",
  "price_id",
  "external_reference",
  "billing_mode",
  "payment_method",
  "charge_type",
  "amount_cents",
  "currency",
  "installment_limit",
  "access_months",
  "status",
  "access_starts_at",
  "access_ends_at",
  "cancel_at_period_end",
  "cancellation_requested_at",
  "cancellation_confirmed_at",
  "canceled_at",
  "created_at",
  "updated_at",
] as const;

const contractCasts: SqlCast[] = [
  "uuid",
  "uuid",
  "uuid",
  "text",
  "text",
  "text",
  "text",
  "bigint",
  "text",
  "integer",
  "integer",
  "text",
  "timestamptz",
  "timestamptz",
  "boolean",
  "timestamptz",
  "timestamptz",
  "timestamptz",
  "timestamptz",
  "timestamptz",
];

function initialContractRow(contract: SeedContract): SeedSqlValue[] {
  return [
    contract.id,
    contract.userId,
    contract.priceId,
    contract.externalReference,
    contract.billingMode,
    contract.paymentMethod,
    contract.chargeType,
    contract.amountCents,
    "BRL",
    contract.installmentLimit,
    contract.accessMonths,
    "active",
    relativeTimeSql({ anchor: "month_start", months: -24, days: 0, hours: 0 }),
    relativeTimeSql({ anchor: "month_start", months: 1, days: 0, hours: 0 }),
    false,
    null,
    null,
    null,
    relativeTimeSql(contract.createdAt),
    sqlExpression("pg_catalog.statement_timestamp()"),
  ];
}

function renderInitialContracts(contracts: SeedContract[]): string {
  return renderBatchInsert({
    table: "public.billing_contracts",
    columns: [...contractColumns],
    rows: contracts.map(initialContractRow),
    casts: contractCasts,
    suffix: `on conflict (id) do update set
  user_id = excluded.user_id,
  price_id = excluded.price_id,
  external_reference = excluded.external_reference,
  billing_mode = excluded.billing_mode,
  payment_method = excluded.payment_method,
  charge_type = excluded.charge_type,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  installment_limit = excluded.installment_limit,
  access_months = excluded.access_months,
  status = excluded.status,
  access_starts_at = excluded.access_starts_at,
  access_ends_at = excluded.access_ends_at,
  cancel_at_period_end = false,
  cancellation_requested_at = null,
  cancellation_confirmed_at = null,
  canceled_at = null,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at`,
  });
}

function renderReports(catalog: DemoSeedCatalog): {
  calls: string;
  timestamps: string;
} {
  const templates = new Map(
    [...allAdminReportTemplates, ...currentReportTemplates].map((template) => [
      template.key,
      template,
    ]),
  );
  const users = [catalog.admin, ...catalog.clients];
  const calls: string[] = [];
  const timestampRows: string[] = [];

  for (const user of users) {
    const assigned = catalog.reports.filter(
      (report) => report.ownerId === user.id,
    );
    if (assigned.length === 0) continue;
    calls.push(
      `select set_config('request.jwt.claim.sub', ${sqlLiteral(user.id, "text")}, true);`,
    );
    for (const report of assigned) {
      const template = templates.get(report.templateKey);
      if (!template)
        throw new Error(`Unknown report template ${report.templateKey}.`);
      const materialized = template.materialize(
        buildSeedReportIds(report.ownerOrdinal, report.reportOrdinal),
      );
      calls.push(renderRpcCall(materialized.rpc));
      timestampRows.push(
        `  (${sqlLiteral(materialized.submissionId, "uuid")}, ${sqlLiteral(relativeTimeSql(report.createdAt), "timestamptz")}, ${sqlLiteral(report.deletedAt === null ? null : relativeTimeSql(report.deletedAt), "timestamptz")})`,
      );
    }
  }

  return {
    calls: calls.join("\n\n"),
    timestamps: `update public.diagnoses as diagnosis
set created_at = seed.created_at,
    updated_at = seed.created_at,
    deleted_at = seed.deleted_at
from (values
${timestampRows.join(",\n")}
) as seed(submission_id, created_at, deleted_at)
where diagnosis.submission_id = seed.submission_id;`,
  };
}

function renderFinalContractState(contracts: SeedContract[]): string {
  const rows = contracts.map(
    (contract) =>
      `  (${[
        sqlLiteral(contract.id, "uuid"),
        sqlLiteral(contract.status, "text"),
        sqlLiteral(
          contract.accessStartsAt === null
            ? null
            : relativeTimeSql(contract.accessStartsAt),
          "timestamptz",
        ),
        sqlLiteral(
          contract.accessEndsAt === null
            ? null
            : relativeTimeSql(contract.accessEndsAt),
          "timestamptz",
        ),
        sqlLiteral(contract.cancelAtPeriodEnd, "boolean"),
        sqlLiteral(
          contract.cancellationRequestedAt === null
            ? null
            : relativeTimeSql(contract.cancellationRequestedAt),
          "timestamptz",
        ),
        sqlLiteral(
          contract.cancellationConfirmedAt === null
            ? null
            : relativeTimeSql(contract.cancellationConfirmedAt),
          "timestamptz",
        ),
        sqlLiteral(
          contract.canceledAt === null
            ? null
            : relativeTimeSql(contract.canceledAt),
          "timestamptz",
        ),
      ].join(", ")})`,
  );
  return `update public.billing_contracts as contract
set status = seed.status,
    access_starts_at = seed.access_starts_at,
    access_ends_at = seed.access_ends_at,
    cancel_at_period_end = seed.cancel_at_period_end,
    cancellation_requested_at = seed.cancellation_requested_at,
    cancellation_confirmed_at = seed.cancellation_confirmed_at,
    canceled_at = seed.canceled_at,
    updated_at = pg_catalog.statement_timestamp()
from (values
${rows.join(",\n")}
) as seed(id, status, access_starts_at, access_ends_at, cancel_at_period_end, cancellation_requested_at, cancellation_confirmed_at, canceled_at)
where contract.id = seed.id;`;
}

function renderPayments(catalog: DemoSeedCatalog): string {
  return renderBatchInsert({
    table: "public.billing_payments",
    columns: [
      "id",
      "contract_id",
      "asaas_payment_id",
      "status",
      "value_cents",
      "installment_number",
      "due_date",
      "confirmed_at",
      "received_at",
      "refunded_at",
      "chargeback_at",
      "created_at",
      "updated_at",
    ],
    rows: catalog.payments.map((payment) => [
      payment.id,
      payment.contractId,
      payment.externalPaymentId,
      payment.status,
      payment.valueCents,
      payment.installmentNumber,
      relativeTimeSql(payment.dueAt),
      payment.confirmedAt === null
        ? null
        : relativeTimeSql(payment.confirmedAt),
      payment.receivedAt === null ? null : relativeTimeSql(payment.receivedAt),
      payment.refundedAt === null ? null : relativeTimeSql(payment.refundedAt),
      payment.chargebackAt === null
        ? null
        : relativeTimeSql(payment.chargebackAt),
      relativeTimeSql(payment.dueAt),
      sqlExpression("pg_catalog.statement_timestamp()"),
    ]),
    casts: [
      "uuid",
      "uuid",
      "text",
      "text",
      "bigint",
      "integer",
      "date",
      "timestamptz",
      "timestamptz",
      "timestamptz",
      "timestamptz",
      "timestamptz",
      "timestamptz",
    ],
    suffix: `on conflict (id) do update set
  contract_id = excluded.contract_id,
  asaas_payment_id = excluded.asaas_payment_id,
  status = excluded.status,
  value_cents = excluded.value_cents,
  installment_number = excluded.installment_number,
  due_date = excluded.due_date,
  confirmed_at = excluded.confirmed_at,
  received_at = excluded.received_at,
  refunded_at = excluded.refunded_at,
  chargeback_at = excluded.chargeback_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at`,
  });
}

function renderStates(catalog: DemoSeedCatalog): string {
  return renderBatchInsert({
    table: "private.admin_user_state",
    columns: [
      "user_id",
      "blocked_at",
      "deleted_at",
      "courtesy_expires_at",
      "version",
      "updated_at",
    ],
    rows: catalog.states.map((state) => [
      state.userId,
      state.blockedAt === null ? null : relativeTimeSql(state.blockedAt),
      state.deletedAt === null ? null : relativeTimeSql(state.deletedAt),
      state.courtesyExpiresAt === null
        ? null
        : relativeTimeSql(state.courtesyExpiresAt),
      state.version,
      sqlExpression("pg_catalog.statement_timestamp()"),
    ]),
    casts: [
      "uuid",
      "timestamptz",
      "timestamptz",
      "timestamptz",
      "bigint",
      "timestamptz",
    ],
    suffix: `on conflict (user_id) do update set
  blocked_at = excluded.blocked_at,
  deleted_at = excluded.deleted_at,
  courtesy_expires_at = excluded.courtesy_expires_at,
  version = excluded.version,
  updated_at = excluded.updated_at`,
  });
}

function renderEvents(catalog: DemoSeedCatalog): string {
  const rows = catalog.events.map(
    (event) =>
      `  (${[
        sqlLiteral(event.userId, "uuid"),
        sqlLiteral(event.actorId, "uuid"),
        sqlLiteral(event.action, "text"),
        sqlLiteral(event.marker, "text"),
        sqlLiteral(event.reason, "text"),
        sqlLiteral(event.beforeState, "jsonb"),
        sqlLiteral(event.afterState, "jsonb"),
        sqlLiteral(relativeTimeSql(event.createdAt), "timestamptz"),
      ].join(", ")})`,
  );
  return `insert into private.admin_user_events (
  user_id, actor_id, action, reason, before_state, after_state, created_at
)
select seed.user_id, seed.actor_id, seed.action, seed.reason,
       seed.before_state, seed.after_state, seed.created_at
from (values
${rows.join(",\n")}
) as seed(user_id, actor_id, action, marker, reason, before_state, after_state, created_at)
where not exists (
  select 1
  from private.admin_user_events as existing
  where existing.user_id = seed.user_id
    and existing.actor_id = seed.actor_id
    and pg_catalog.strpos(existing.reason, seed.marker) > 0
);`;
}

function invariantsSql(seedUsers: string, adminId: string): string {
  return `do $assert$
declare
  seeded_user_count bigint;
  client_count bigint;
  report_count bigint;
  admin_report_count bigint;
  client_report_count bigint;
  paid_client_count bigint;
  courtesy_client_count bigint;
  blocked_client_count bigint;
  deleted_client_count bigint;
begin
  select count(*) into seeded_user_count from auth.users where id = any(${seedUsers});
  select count(*) into client_count from auth.users where id = any(${seedUsers}) and id <> ${sqlLiteral(adminId, "uuid")};
  select count(*) into report_count from public.diagnoses where user_id = any(${seedUsers});
  select count(*) into admin_report_count from public.diagnoses where user_id = ${sqlLiteral(adminId, "uuid")};
  select count(*) into client_report_count from public.diagnoses where user_id = any(${seedUsers}) and user_id <> ${sqlLiteral(adminId, "uuid")};
  select count(distinct contract.user_id) into paid_client_count
  from public.billing_contracts as contract
  where contract.user_id = any(${seedUsers})
    and contract.user_id <> ${sqlLiteral(adminId, "uuid")}
    and contract.status in ('active', 'cancel_at_period_end')
    and contract.access_starts_at <= pg_catalog.statement_timestamp()
    and contract.access_ends_at > pg_catalog.statement_timestamp();
  select count(*) into courtesy_client_count
  from private.admin_user_state as state
  where state.user_id = any(${seedUsers})
    and state.user_id <> ${sqlLiteral(adminId, "uuid")}
    and state.courtesy_expires_at > pg_catalog.statement_timestamp();
  select count(*) into blocked_client_count
  from private.admin_user_state as state
  where state.user_id = any(${seedUsers}) and state.blocked_at is not null;
  select count(*) into deleted_client_count
  from private.admin_user_state as state
  where state.user_id = any(${seedUsers}) and state.deleted_at is not null;

  if seeded_user_count <> 97
    or client_count <> 96
    or report_count <> 295
    or admin_report_count <> 36
    or client_report_count <> 259
    or paid_client_count <> 40
    or courtesy_client_count <> 12
    or blocked_client_count <> 8
    or deleted_client_count <> 8
    or not exists (
      select 1
      from public.billing_contracts as contract
      where contract.user_id = ${sqlLiteral(adminId, "uuid")}
        and contract.billing_mode = 'annual'
        and contract.status = 'active'
        and contract.amount_cents = 47880
        and contract.access_starts_at <= pg_catalog.statement_timestamp()
        and contract.access_ends_at > pg_catalog.statement_timestamp()
    )
  then
    raise exception using errcode = 'P0001', message = 'demo_seed_invariant_failed';
  end if;
end
$assert$;`;
}

function renderDemoSeed(catalog: DemoSeedCatalog): string {
  const users = [catalog.admin, ...catalog.clients];
  const seedUsers = uuidArray(users.map((user) => user.id));
  const { calls, timestamps } = renderReports(catalog);
  const sections = [
    "-- GENERATED FILE. DO NOT EDIT. Run `pnpm seed:generate`.",
    `-- Login: ${catalog.admin.email} / ${PASSWORD}`,
    "-- Fictional demo data for local development and guarded staging only.",
    "",
    "begin;\nset local lock_timeout = '5s';\nset local statement_timeout = '5min';",
    "select pg_catalog.pg_advisory_xact_lock(\n  pg_catalog.hashtextextended('lucrivo-demo-seed-v1', 0)\n);",
    `do $guard$
begin
  if exists (
    select 1
    from private.app_administrator
    where singleton = 1
      and user_id <> ${sqlLiteral(catalog.admin.id, "uuid")}
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'demo_seed_refuses_to_replace_administrator';
  end if;
end
$guard$;`,
    cleanupSql(seedUsers),
    renderAuthUsers(users),
    renderIdentities(users),
    `insert into private.app_administrator (singleton, user_id)
values (1, ${sqlLiteral(catalog.admin.id, "uuid")})
on conflict (singleton) do update set
  user_id = excluded.user_id,
  created_at = pg_catalog.statement_timestamp();`,
    renderBillingCustomers(catalog),
    renderInitialContracts(catalog.contracts),
    calls,
    timestamps,
    renderFinalContractState(catalog.contracts),
    renderPayments(catalog),
    renderStates(catalog),
    renderEvents(catalog),
    invariantsSql(seedUsers, catalog.admin.id),
    "select set_config('request.jwt.claim.sub', '', true);",
    "commit;",
  ];
  return `${sections.join("\n\n")}\n`;
}

export { PASSWORD, renderDemoSeed };
