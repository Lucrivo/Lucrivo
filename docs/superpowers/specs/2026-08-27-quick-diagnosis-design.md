# Quick Diagnosis — Design

**Date:** 2026-08-27

**Status:** Design approved; awaiting specification review

## 1. Context

Lucrivo helps people understand how to price products, services, and other
commercial activities. The first domain feature is a quick diagnosis for
service businesses. It captures the user's current financial and work context
without calculating or explaining a recommended price yet.

Product and production diagnoses are intentionally excluded. They have
different questions and rules and will receive independent designs and data
models.

## 2. Use case

**Name:** Create service diagnosis

**Actor:** Authenticated user

**Result:** A completed, immutable service diagnosis is persisted

The user completes a multi-step wizard, reviews all answers, and explicitly
confirms the submission. Nothing is persisted before that final confirmation.

Each completed submission creates a historical record. This version does not
provide a history screen, calculations, recommendations, editing, or deletion.

## 3. Scope

### Included

- A private `/quick-diagnosis` route.
- A visible "Diagnóstico rápido" sidebar entry.
- A seven-step service diagnosis wizard.
- Pricing methods `hour`, `minute`, and `appointment`.
- Review before submission and a success state after submission.
- Server-side authentication and validation.
- A service-specific Postgres table with constraints, explicit grants, and
  row-level security.
- Idempotent creation.
- Database, schema, service, action, and interface tests.
- Database policy tests in CI.

### Excluded

- Product and production diagnosis flows.
- Draft persistence or recovery after refresh.
- Diagnosis calculations, recommendations, or explanatory text.
- Diagnosis history, details, editing, or deletion interfaces.
- Public HTTP API or Route Handler.
- Realtime, Storage, background jobs, or external integrations.
- Multi-currency support.

## 4. Terminology and naming

Technical identifiers, route segments, module names, database objects, and
field names are in English. User-facing copy remains in Brazilian Portuguese.

- Business category: `service`.
- Pricing methods: `hour`, `minute`, and `appointment`.
- All monetary values use Brazilian real (`BRL`).
- `appointment` means a service sold as one appointment or session. The term
  avoids the clinical implication of `treatment` and the ambiguity of reusing
  `service`.

## 5. Data model

### 5.1 Enum types

The migration creates:

- `public.business_category`, initially containing only `service`.
- `public.service_pricing_method`, containing `hour`, `minute`, and
  `appointment`.

Future categories can extend the category enum without forcing their fields
into the service table.

### 5.2 Table

The aggregate is stored in `public.service_diagnoses`.

| Column                         | Type                     | Rules                                                |
| ------------------------------ | ------------------------ | ---------------------------------------------------- |
| `id`                           | `bigint identity`        | Primary key                                          |
| `submission_id`                | `uuid`                   | Required; idempotency key supplied by the wizard     |
| `user_id`                      | `uuid`                   | Required; references `auth.users(id)`                |
| `business_category`            | `business_category`      | Required; defaults to `service`                      |
| `pricing_method`               | `service_pricing_method` | Required                                             |
| `desired_monthly_income_cents` | `bigint`                 | Required; defaults to `0`; non-negative              |
| `fixed_monthly_expenses_cents` | `bigint`                 | Required; defaults to `0`; non-negative              |
| `monthly_work_minutes`         | `integer`                | Required; defaults to `0`; between `0` and `44,640`  |
| `weekly_work_days`             | `smallint`               | Required; defaults to `0`; integer from `0` to `7`   |
| `hourly_rate_cents`            | `bigint`                 | Required; defaults to `0`; method-dependent          |
| `minute_rate_cents`            | `bigint`                 | Required; defaults to `0`; method-dependent          |
| `appointment_rate_cents`       | `bigint`                 | Required; defaults to `0`; method-dependent          |
| `appointment_duration_minutes` | `integer`                | Required; defaults to `0`; method-dependent          |
| `tax_rate_basis_points`        | `integer`                | Required; defaults to `0`; between `0` and `10,000`  |
| `card_fee_rate_basis_points`   | `integer`                | Required; defaults to `0`; between `0` and `10,000`  |
| `created_at`                   | `timestamptz`            | Required; defaults to the current database timestamp |

`user_id` uses `on delete cascade`, so deleting an authentication user also
deletes their diagnoses.

A table-level check also fixes `business_category` to `service`. This remains
true when the shared enum gains future categories.

There is no `status`: persisted rows are completed diagnoses. There is no
`updated_at`: authenticated application users cannot update a diagnosis.

### 5.3 Method-dependent constraint

A table-level check constraint enforces exactly one valid pricing shape:

- `hour`: `hourly_rate_cents > 0`; all minute and appointment fields are `0`.
- `minute`: `minute_rate_cents > 0`; all hour and appointment fields are `0`.
- `appointment`: `appointment_rate_cents > 0` and
  `appointment_duration_minutes > 0`; hour and minute rates are `0`.

All monetary fields are non-negative. Optional empty inputs normalize to zero
before insertion.

### 5.4 Indexes and uniqueness

- A unique constraint on `(user_id, submission_id)` provides idempotency.
- An index on `(user_id, created_at desc)` supports RLS ownership lookups and a
  future chronological history.
- The ownership index also covers the `user_id` foreign key.

### 5.5 Units

- BRL values are stored as integer cents.
- Percentages are stored as integer basis points; `100` basis points equals
  `1%`.
- Work time is stored in whole minutes.
- The UI may accept decimal monthly hours. The server converts them to minutes,
  rounding to the nearest whole minute after validation.
- Money and percentage parsing must use decimal-string conversion rather than
  binary floating-point multiplication.

## 6. Database authorization

`public.service_diagnoses` is in an exposed schema and must be protected in the
same migration that creates it.

### Grants

- Revoke all table privileges from `anon` and `authenticated` first.
- Grant only `select` and `insert` to `authenticated`.
- Grant nothing to `anon`.
- Do not grant `update` or `delete` to application roles.

### RLS

Enable RLS and create separate policies:

- Select: `to authenticated using ((select auth.uid()) = user_id)`.
- Insert: `to authenticated with check ((select auth.uid()) = user_id)`.

There are no update or delete policies. The server still authenticates and
authorizes explicitly; RLS is the final database barrier.

## 7. Application architecture

The module is organized by feature:

```text
src/modules/quick-diagnosis/
├── actions/
│   ├── create-service-diagnosis.action.ts
│   └── create-service-diagnosis.action.test.ts
├── components/
│   ├── quick-diagnosis-wizard.tsx
│   ├── quick-diagnosis-wizard.test.tsx
│   └── steps/
├── schemas/
│   ├── service-diagnosis.schema.ts
│   └── service-diagnosis.schema.test.ts
├── services/
│   ├── create-service-diagnosis.service.ts
│   └── create-service-diagnosis.service.test.ts
└── types.ts
```

The private route only composes the feature:

```text
src/app/(private)/quick-diagnosis/page.tsx
```

Authentication gains one reusable server-only primitive:

```text
src/modules/auth/services/require-user.ts
src/modules/auth/services/require-user.test.ts
```

No repository interface or persistence mapper is introduced. The service uses
the generated Supabase database types directly and returns a small application
result.

## 8. Data flow

```text
QuickDiagnosisWizard
  -> createServiceDiagnosis Server Action
  -> requireUser()
  -> Zod validation and normalization
  -> createServiceDiagnosisService()
  -> authenticated Supabase server client
  -> Postgres grants, constraints, and RLS
```

The client never sends `user_id` or chooses `business_category`. The service
sets `business_category` to `service` and obtains `user_id` from the verified
session.

The Server Action is the only mutation entrypoint in this version. A Route
Handler will be added only when an external, mobile, webhook, or other HTTP
consumer exists. A Server Action must not call an internal API route.

## 9. Input contract and normalization

The server-side schema validates the complete submission again, regardless of
client validation. It accepts the selected pricing method, the generated
`submission_id`, and user-facing numeric strings.

Validation rules:

- `submission_id` must be a UUID.
- `pricing_method` must be one of the three enum values.
- Optional empty numeric fields normalize to zero.
- Monetary values must be valid BRL decimals and non-negative.
- Percentages must be between `0` and `100`, with at most two decimal places.
- Weekly work days must be an integer between `0` and `7`.
- Monthly work hours must be between `0` and `744` and may be decimal.
- The price field selected by `pricing_method` must be greater than zero.
- Appointment duration must be a positive whole number of minutes for
  `appointment`.
- Fields unrelated to the selected method normalize to zero.

The normalized service command contains only database units: cents, minutes,
basis points, enum values, and the idempotency key.

## 10. Idempotency

The wizard generates one `submission_id` and retains it while retrying the
final submission.

The first valid request inserts the diagnosis. If insertion returns a unique
violation for the named `(user_id, submission_id)` constraint, the service
selects the existing diagnosis owned by that user and returns its ID as a
successful result. Other unique violations are not treated as idempotent
successes.

The final button is disabled while submission is pending. Database uniqueness,
not the disabled state, is the authoritative duplicate protection.

## 11. Action result and errors

The action returns a discriminated result:

```text
success: { diagnosisId }
error: unauthorized | invalid_input | create_failed
```

For `invalid_input`, the result includes field errors that the wizard maps back
to the appropriate step. Cross-field validation attaches errors to the fields
the user must correct. Supabase and Postgres error details never reach the
browser.

- `unauthorized`: show that the session expired and offer navigation to login.
- `invalid_input`: focus the first invalid field and allow correction.
- `create_failed`: remain on review, show a generic retryable message, and keep
  all answers and the same `submission_id`.

## 12. Wizard experience

The `/quick-diagnosis` page shows one step at a time in a focused, responsive
layout inspired by the provided references. The step heading receives focus
when navigation changes.

### Steps

1. **Pricing method** — selectable cards for hour, minute, or appointment.
2. **Monthly goal** — desired monthly personal income.
3. **Fixed expenses** — monthly fixed business expenses.
4. **Work routine** — monthly hours and weekly work days together.
5. **Current price** — conditional fields:
   - hour: hourly value;
   - minute: per-minute value;
   - appointment: duration and appointment value together.
6. **Fees** — tax and card fee percentages together.
7. **Review** — all normalized user-facing answers grouped by section.

After successful persistence, the wizard displays a separate success state;
the success state is not counted as a step.

### Navigation and state

- The progress indicator displays `N de 7`.
- Continue validates the current step before advancing.
- Back preserves previous answers.
- Changing the pricing method clears values from the previously selected
  method.
- Review sections provide an Edit action that navigates to their source step.
- Final submission is available only from review.
- Refreshing or closing the page before submission discards the local state.
- "Iniciar outro diagnóstico" resets answers and creates a new
  `submission_id`.
- "Voltar ao dashboard" navigates to `/dashboard`.

### Accessibility

- Selection cards use an accessible radio-group or equivalent fieldset and
  legend semantics.
- Every input has a visible label and associated error message.
- The progress indicator exposes its current value and total.
- Step changes move focus to the heading without causing unexpected scrolling.
- Keyboard navigation and visible focus states are preserved.
- Motion respects `prefers-reduced-motion`.

## 13. Testing strategy

### Database tests

Add a pgTAP file under `supabase/tests/` that verifies:

- Table shape and required constraints.
- `anon` cannot select or insert.
- An authenticated user can insert and select their own diagnosis.
- A user cannot insert or select another user's diagnosis.
- Authenticated users cannot update or delete.
- Every numeric bound is enforced.
- Every pricing-method shape accepts valid rows and rejects invalid ones.
- Duplicate `(user_id, submission_id)` values are rejected.

### Application tests

- `requireUser`: authenticated and unauthenticated outcomes.
- Schema: optional-zero normalization, unit conversion, bounds, and all three
  conditional pricing methods.
- Service: correct insert payload, idempotent retry, ownership-scoped lookup,
  and technical failure translation.
- Action: authentication, invalid input, successful creation, and safe error
  contract.
- Wizard: step navigation, conditional fields, back preservation, method
  clearing, review editing, pending state, retry behavior, success reset, and
  accessible names.
- Sidebar: new route and active state.

## 14. CI and delivery

The Database CI job must run `supabase test db` after rebuilding the local
database. The normal validation sequence is:

```text
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
pnpm supabase:lint
pnpm supabase:advisors
pnpm check
pnpm build
```

The generated `database.types.ts` file is committed and a second generation
must produce no diff. The feature introduces no environment variables, remote
service configuration, or production seed data.

The additive migration reaches staging first through the existing deployment
workflow. Functional validation in staging covers all three pricing methods,
retry behavior, ownership isolation, mobile layout, and keyboard navigation.

## 15. Rollback

Before production release, application rollback means removing or reverting the
sidebar entry and route while leaving the additive table unused. No destructive
down migration is required.

Removing database objects or data requires a separate forward migration and
explicit approval. Production data must not be deleted as part of an ordinary
application rollback.

## 16. Acceptance criteria

- Only authenticated users can access and submit the flow.
- The sidebar exposes "Diagnóstico rápido" at `/quick-diagnosis`.
- Exactly one wizard step is visible at a time.
- All seven steps and review editing work on desktop and mobile.
- Selected-method fields are required and irrelevant method values are cleared.
- Optional empty values persist as zero in canonical database units.
- Review is required before final submission.
- No row exists before final confirmation.
- A successful confirmation creates one immutable, user-owned diagnosis.
- Retrying the same submission cannot create a duplicate.
- Users cannot read or create diagnoses for another user.
- The success state offers dashboard navigation and a clean new diagnosis.
- Database and application checks pass locally and in CI.
