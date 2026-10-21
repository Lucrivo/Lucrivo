# Admin User Insights Design

**Date:** 2026-10-21
**Status:** Approved in conversation; awaiting written-spec review

## 1. Objective and scope

Improve `/admin/users` so an administrator can identify a client, understand how
that client uses Lucrivo, inspect access and billing state, and review a useful
cross-domain history without exposing raw provider or report payloads.

This change:

- adds the onboarding name and business context to the user detail;
- enriches and translates diagnosis metadata, including AI usage;
- reorganizes subscription information with semantic status presentation;
- replaces the administrative-only history with a unified user timeline;
- renames and streamlines complimentary-access management with duration presets;
- fixes reads for blocked and soft-deleted users;
- adds total-item and total-page metadata to the administrative user and
  onboarding-contact tables; and
- removes the `/admin/subscriptions` placeholder route and its navigation item.

The deleted subscriptions URL receives no redirect and falls through to the
application's normal 404 behavior. Client-facing report pagination, billing
mutations, refunds, subscription cancellation, user impersonation, profile
editing, and raw report inspection are outside this scope.

## 2. Product and security rules

All administrative reads remain protected twice: the App Router boundary calls
`requireAdmin()`, and every database RPC calls `private.has_admin_access()`,
which requires the assigned administrator and AAL2. Browser code never receives
service-role credentials.

Blocked and soft-deleted users remain unavailable to themselves, but their data
must remain inspectable by an authorized administrator. Admin read functions
therefore use narrowly scoped `security definer` projections and must not depend
on the target user's `private.account_is_eligible()` result or owner-facing RLS
policies. Direct table access remains denied. Tests cover active, blocked, and
soft-deleted targets for every detail collection.

RPCs expose only the fields required by the interface. They must not return raw
report snapshots, AI questions or answers, Asaas identifiers, checkout URLs,
webhook payloads, WhatsApp numbers, or other unrelated personal data.

Unknown or malformed database values fail closed at the service schema boundary
and produce the existing retryable admin error state. A collection read error is
never converted into a successful empty list.

## 3. User detail experience

### 3.1 Header and profile

When `onboarding_profiles.full_name` exists, the detail header uses it as the
primary title and the email as secondary identification. Without a completed
onboarding, the title falls back to the email. The **Perfil** tab always contains
a `Nome` field; absent data is presented as `Nome ainda não informado`.

The profile groups information into:

- identity: full name, email and internal ID;
- activity: registration, onboarding completion, last sign-in and diagnosis
  count;
- business context: segment and selected/custom subcategory when available; and
- account/access state: active, blocked or excluded; free, paid or courtesy;
  courtesy expiry; block/deletion timestamps; and the current paid interval.

Dates use `America/Sao_Paulo`. Missing facts use explicit neutral copy rather
than invented values.

### 3.2 Diagnoses

The diagnoses collection remains paginated and ordered by creation date and ID,
both descending. Each entry includes:

- category, scenario and analysis mode with Portuguese labels;
- creation date, report version and logical-deletion state;
- whether the report consumed the free-report allowance;
- verdict and priority using the same presentation vocabulary as the client
  dashboard;
- quick-report values: current price, unit profit and real margin; or
- detailed-report values: monthly gross revenue, monthly result, item count and
  partial/complete-data state.

AI usage is aggregated per diagnosis and report version from completed
`report_ai_turns`. It shows completed-turn count, input tokens, cached-input
tokens, output tokens and the last AI-use timestamp. Pending and failed turns do
not contribute token or cost totals, but a failed-turn count may be shown as an
operational fact. No prompts, answers or conversation summaries are exposed.

All enum-like values are validated in TypeScript and translated by shared
formatters. The interface never prints a raw category, scenario, verdict,
priority, billing status, payment method or administrative action as fallback
copy. An unsupported value makes the response unavailable so contract drift is
visible during development and monitoring.

### 3.3 AI cost estimate

Token counts are exact persisted usage. Cost is explicitly labeled as an
estimate in USD, because the provider bills in USD and an exchange-rate
conversion would introduce a second, unstable estimate.

A focused application module owns an immutable, versioned price catalog and
integer-safe calculation. The initial catalog entry records the standard
`gpt-6-luna` prices published by the official OpenAI API pricing page and
consulted on 2026-10-21: US$0.10 per million input tokens, US$0.01 per million
cached-input tokens, and US$0.50 per million output tokens. The calculation is:

```text
uncached input = max(input tokens - cached input tokens, 0)
estimate = uncached input * input rate
         + cached input * cached-input rate
         + output tokens * output rate
```

The UI states that the estimate uses the price-table version, not an invoice or
historical billed amount. If any completed turn uses an unknown model, has
incomplete usage, or cannot be priced, token totals remain visible and the
aggregate cost reads `Estimativa indisponível`; the interface must not show a
partial value that looks complete. Regional, Fast, Batch/Flex, Ultrafast, tools,
taxes and currency conversion are not inferred because the current persistence
does not record those billing dimensions.

### 3.4 Subscription

The **Assinatura** tab starts with a compact current-access summary: source of
access, plan when applicable, current state and access end. Historical contracts
follow as responsive cards or rows showing plan, charged amount, payment method,
translated status, access interval and cancellation/refund facts.

Semantic presentation uses success for currently valid access, warning for
pending or scheduled changes, destructive treatment for failed/refunded/
chargeback states, and neutral treatment for naturally expired or canceled
records. Color is always paired with text and, where useful, an icon. No visual
state relies on color alone.

### 3.5 Unified history

The **Histórico** tab becomes a single reverse-chronological timeline backed by
one bounded database RPC. It composes facts from existing authoritative sources
at query time, rather than introducing a duplicate event store. This preserves
historical visibility for records created before this feature.

Timeline event kinds and sources are:

- registration from `auth.users.created_at`;
- onboarding completion from `onboarding_profiles.completed_at`;
- latest profile update when `updated_at` is later than `completed_at`;
- WhatsApp consent decisions from `private.whatsapp_consent_events`;
- each quick or detailed diagnosis from `diagnoses.created_at`, including the
  diagnosis's AI-use aggregate and cost estimate metadata;
- subscription/contract creation from `billing_contracts.created_at`;
- initial activation from the first confirmed or received payment;
- monthly renewal from later confirmed or received payments on a recurring
  monthly contract;
- cancellation requested and confirmed from their dedicated contract
  timestamps;
- expiration only after `access_ends_at <= statement_timestamp()` and when the
  contract state represents ended access;
- refund requested and confirmed from `billing_refund_requests`;
- payment failure, refund and chargeback from the corresponding payment state
  and timestamps; and
- courtesy, block/unblock and soft-delete/restore events from
  `private.admin_user_events`.

Semiannual installments are payment events, not renewals. A renewal label is
reserved for a subsequent payment on a recurring monthly contract. When
multiple sources describe the same business transition, the RPC emits one
canonical event with a deterministic event key. Every event has a stable kind,
occurrence timestamp, source ID, title and narrow typed payload. Ordering uses
`occurred_at desc, event_key desc`.

Suggested events beyond the original request are included because they explain
access changes or user behavior: cancellation, payment failure, chargeback,
courtesy, block/unblock, delete/restore, profile update and marketing-consent
change.

## 4. Complimentary-access workflow

The menu label becomes **Gerenciar cortesia**. The dialog offers `1 dia`, `7
dias`, `30 dias` and a custom date/time. Presets calculate from the server-side
confirmation instant, not from the time the dialog opened, and the confirmation
copy displays the exact expiry in `America/Sao_Paulo`.

The existing reason remains mandatory and bounded to 500 characters. Granting
or replacing a courtesy continues to use optimistic concurrency and the atomic
`change_admin_user_v1` mutation with audit insertion. Ending a current courtesy
remains available in the same workflow. Presets do not change paid contracts or
billing metrics.

The client submits a duration preset rather than a client-computed authoritative
timestamp. The database derives the preset expiry from `statement_timestamp()`.
A custom absolute timestamp remains accepted after validation. The database
continues to be authoritative for future-date, current-version and target-state
checks.

## 5. Administrative pagination

Only the `/admin/users` table and the onboarding contacts table change in this
branch. Client-facing pagination is intentionally untouched.

Both administrative RPCs use page-number pagination with a fixed page size of
20 and return:

```ts
type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: 20;
  totalCount: number;
  totalPages: number;
};
```

Page numbers are one-based. Invalid, negative, non-integer or excessively large
page input normalizes to page 1 at the URL parsing boundary. Database functions
repeat validation, cap the page size, count after authorized filters, and return
an empty `items` array with truthful totals when a concurrent deletion makes the
requested page exceed the new last page. Search or filter changes omit `page`
and therefore return to page 1.

A shared `AdminPagination` presentation component receives the page contract and
a URL builder. It displays `1–20 de 96 itens · Página 1 de 5`, with localized
entity labels supplied by the caller, and provides accessible previous/next and
nearby page links. Empty results display `0 itens · Página 0 de 0` and no page
links. The mobile layout remains compact and does not introduce horizontal
scrolling.

Exact counts are acceptable for the current administrative dataset. The new
queries retain deterministic ordering and appropriate filter/order indexes;
query plans and Supabase advisors are reviewed before delivery.

## 6. Data and interface architecture

A new migration replaces the existing admin read RPC signatures with new
versioned RPCs rather than mutating a deployed function's return contract in
place. The application switches atomically to the new versions. Old RPC execute
grants are revoked after no application caller remains.

The read boundary is divided by responsibility:

- user list and onboarding contacts return `AdminPage<T>`;
- user detail returns identity, profile/business and current-access facts;
- diagnoses return typed operational/financial fields plus per-report AI usage;
- subscriptions return current summary and historical contract facts; and
- history returns typed timeline events.

The existing generic `Record<string, unknown>` detail-item handling is replaced
with a discriminated union. Each tab consumes its own inferred schema type and
focused renderer. Shared formatters own Portuguese labels, dates, BRL values,
USD estimates and semantic tones.

The diagnosis and timeline SQL may use lateral aggregates and `union all`, but
each branch remains bounded by the selected user. New indexes are added only
when an `EXPLAIN`/advisor review demonstrates they serve these access paths.

## 7. Navigation and route removal

`Assinaturas` is removed from the admin sidebar and its navigation tests. The
placeholder file at `/admin/subscriptions` and its scaffold test are deleted.
No redirect, alias or replacement route is added; a direct request uses the
normal Next.js 404 behavior. Subscription metrics and recent subscriptions on
the admin dashboard remain in place because they provide aggregate operational
value and are not the redundant placeholder page.

## 8. Error handling and observability

The currently reported `AdminUsersUnavailableError` is reproduced against local
seed states before changing the implementation. The fix must identify the exact
RPC or schema mismatch and add a regression test; broad schema relaxation is not
an acceptable fix.

Server services preserve database errors internally for structured server-side
logging without sending sensitive details to the browser. User-facing errors
remain concise, retryable and in Portuguese. Invalid IDs and genuinely absent
users return not found; blocked and soft-deleted targets do not.

Tabs remain URL-addressable. A tab read failure uses the route's explicit error
state and never silently falls back to profile or empty content. Mutations retain
in-place success/error feedback and restore focus after dialogs close.

## 9. Accessibility and responsive behavior

The existing design language, spacing scale, components and light/dark themes
remain authoritative. Changes emphasize hierarchy and semantic state rather
than introducing a new visual system.

- Tabs, pagination and menus remain keyboard accessible with visible focus.
- Touch targets remain at least 44 by 44 CSS pixels where practical.
- Statuses use text in addition to color.
- Tables become existing compact card layouts at narrow widths.
- Long names, emails, IDs and labels wrap or truncate without horizontal page
  overflow, while full values remain accessible where needed.
- Loading, empty, error and unsupported-data states have explicit copy.

## 10. Verification

Database tests cover:

- MFA-protected access and denied ordinary/anonymous callers;
- active, blocked and soft-deleted target reads;
- exact filtered counts and page boundaries for users and onboarding contacts;
- translated-source enum shapes and diagnosis aggregates;
- timeline event derivation, de-duplication and deterministic ordering;
- first payment versus monthly renewal and semiannual installment behavior;
- expiration only after the access end; and
- courtesy preset expiry calculated from the transaction time.

Application tests cover:

- name present, missing-onboarding fallback and business context;
- strict parsing and Portuguese formatting for diagnoses and billing;
- token aggregation and integer-safe cost estimation, including cached tokens,
  unknown models and incomplete usage;
- semantic subscription states in light and dark-compatible tokens;
- typed timeline renderers;
- admin pagination summaries, links, empty state and filter reset;
- courtesy presets, custom expiry, validation and feedback;
- blocked/deleted regression cases;
- removal of the sidebar item and `/admin/subscriptions` route; and
- desktop/mobile accessibility behavior supported by component tests.

Delivery validation runs targeted Vitest and pgTAP suites, the full application
test suite, typecheck, lint, formatting checks, Supabase schema lint/advisors and
the production build. Database types are regenerated after the migration and a
second generation must produce no diff.

## 11. Source note

The initial `gpt-6-luna` estimate uses the standard per-million-token prices on
the official OpenAI API pricing page as consulted on 2026-10-21:
<https://developers.openai.com/api/docs/pricing>. The implementation records the
source URL and consultation date beside the catalog entry so a later pricing
update is explicit and reviewable.
