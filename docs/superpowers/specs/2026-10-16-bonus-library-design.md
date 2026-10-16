# Bonus Library Design

**Date:** 2026-10-16
**Status:** Awaiting final review

## 1. Objective

Add a private client page named **Bônus** that presents three downloadable
materials:

- one e-book available to every authenticated client;
- one practical guide reserved for eligible paying customers;
- one cash-flow control spreadsheet reserved for eligible paying customers.

The guide and spreadsheet become permanently available after a qualifying paid
subscription. Normal cancellation, access expiration, and failure to renew do
not remove them. A confirmed full refund revokes only the grant created by the
refunded contract; another non-refunded qualifying contract keeps access
available.

Clients who already have active paid access when this feature is released
receive the permanent materials through a migration backfill. Courtesy access
does not qualify.

The feature may be deployed before the final files are uploaded. The interface
must represent missing objects as materials in preparation. Uploading the
objects later at their canonical paths makes them available without another
application deployment.

## 2. Product Rules

### 2.1 Material visibility

All three materials are visible on the page for every authenticated client.
Visibility is not authorization: protected material URLs are issued only after
a server-side access check.

- The e-book is unlocked for every authenticated client.
- The guide and spreadsheet are unlocked when the client has at least one
  non-revoked qualifying grant.
- A free client sees the protected cards with a lock and an explanation of how
  to unlock them.
- An unlocked client sees the protected materials as **Seus para sempre**.
- Administrators using the financial area follow the same client rule; admin
  status alone does not unlock protected bonuses.

### 2.2 Qualifying events

A grant is created idempotently for a billing contract when verified provider
processing first confirms paid access. It is not created for Checkout creation,
pending or rejected payments, courtesy access, or administrator status.

At release, the migration creates one grant for each existing contract that
satisfies the application's current paid-access predicate at migration time.
The backfill uses database time and the same contract states and access dates
that authorize paid product access.

### 2.3 Retention and revocation

- Cancellation at period end preserves the grant.
- Expiration and non-renewal preserve the grant.
- Account blocking does not delete the grant, although the blocked account
  cannot use authenticated product routes while blocked.
- A confirmed full refund or chargeback revokes the grant associated with that
  contract.
- A rejected, processing, or ambiguous refund does not revoke it.
- If another non-refunded contract has a grant, access remains unlocked.
- Partial refunds and chargeback disputes without a confirmed chargeback remain
  billing reconciliation cases and do not silently change the bonus
  entitlement.

## 3. Chosen Architecture

Use a per-contract entitlement ledger plus a private Supabase Storage bucket:

1. A `bonus_access_grants` table records one grant per qualifying billing
   contract, with grant and optional revocation facts.
2. Existing active paid contracts are backfilled during the migration.
3. The existing transactional Asaas webhook reducer creates the grant when it
   activates paid access. Confirmed full-refund or chargeback processing revokes
   only the matching contract's grant.
4. The Bônus page reads a safe server-side projection: whether protected
   materials are unlocked and whether each configured object currently exists.
5. A server-only download route accepts an allow-listed material slug,
   authenticates the client, checks the relevant entitlement, and creates a
   short-lived signed Storage URL.
6. Final files are uploaded operationally to fixed object paths after the
   implementation. They are never committed to Git or served from `public/`.

This is preferred over deriving access from billing history on every request
because the entitlement is an explicit, auditable product fact that survives
future billing-model changes. It is preferred over a boolean on the user because
per-contract grants can explain access, support multiple purchases, and revoke
only a refunded purchase without erasing another valid grant.

## 4. Data Model

Create `public.bonus_access_grants` with:

- `id uuid primary key`;
- `user_id uuid not null references auth.users(id) on delete cascade`;
- `contract_id uuid not null unique references billing_contracts(id)`;
- `granted_at timestamptz not null`;
- `revoked_at timestamptz null`;
- `revocation_reason text null`, constrained to `full_refund` or `chargeback`
  when present;
- `created_at timestamptz not null`;
- a consistency check requiring `revoked_at` and `revocation_reason` to be both
  null or both present.

Index `user_id` only for currently valid rows with a partial index on
`revoked_at is null`, because the primary read is whether the current user has
at least one live grant. The unique contract key is the idempotency boundary.

The authenticated role may read only its own grant rows. It cannot insert,
update, or delete grants. Billing mutations use existing trusted server and
database boundaries. Every exposed table uses RLS and explicit grants.

Extend the existing transactional `private.apply_asaas_webhook_event_v1`
reducer. A `CHECKOUT_PAID` or first qualifying `PAYMENT_CONFIRMED` transition
inserts the contract grant with `on conflict (contract_id) do nothing`. A
`PAYMENT_REFUNDED` or confirmed chargeback transition revokes the matching
grant idempotently. This keeps contract, payment, webhook-ledger, and bonus
state in one database transaction. No separate trigger or best-effort
application write is used. Duplicate and out-of-order webhooks must converge on
the same result.

## 5. Storage and Delivery

Create one private bucket named `bonus-materials`. The application catalog maps
three immutable slugs to canonical objects:

| Slug        | Canonical object             | Access rule          | Delivery        |
| ----------- | ---------------------------- | -------------------- | --------------- |
| `ebook`     | `ebook/ebook.pdf`            | authenticated client | open in new tab |
| `guide`     | `guide/guide.pdf`            | valid bonus grant    | open in new tab |
| `cash-flow` | `spreadsheet/cash-flow.xlsx` | valid bonus grant    | download        |

The object keys and bucket name are server-owned constants. The browser cannot
provide an arbitrary bucket or object path. Display names and descriptions also
live in the application catalog so the initial feature does not need an
administrative content manager.

The bucket remains private and grants no broad client listing or mutation
permission. The server creates a short-lived signed URL only after authorization
and requests download disposition for the spreadsheet. PDF links open in a new
tab, where browser-native controls allow reading or downloading. Signed URLs are
bearer links and therefore use the shortest practical lifetime.

Object presence is checked without disclosing Storage errors. A missing object,
Storage outage, or signing failure returns a stable unavailable outcome and does
not expose bucket internals.

## 6. Interface Design

Add **Bônus** to the financial sidebar, using a gift icon and the route
`/bonus`. The page extends the existing Lucrivo application shell, tokens,
typography, dark mode, and interaction language rather than introducing a new
visual system.

### 6.1 Page hierarchy

- A concise header introduces the materials as practical support for managing
  the business.
- A small access summary states either **1 de 3 materiais liberados** or
  **3 de 3 materiais liberados**.
- A responsive three-card grid presents the e-book, guide, and spreadsheet.
- Each card includes material type, title, short outcome-focused description,
  access status, a consistent illustration or icon treatment, and one primary
  action.

Working labels may be replaced when the final assets arrive without changing
the access architecture:

- **E-book de gestão financeira**;
- **Guia prático para organizar o negócio**;
- **Planilha de controle de fluxo de caixa**.

### 6.2 Unlocked states

- Available e-book and guide actions use **Ler e baixar** and open a new tab.
- The available spreadsheet uses **Baixar planilha** and starts a download.
- Protected bonuses carry the status **Seu para sempre** for an entitled
  client, including after subscription expiration.
- A configured material whose object is missing uses **Material em preparação**
  and a disabled action with an explanatory message.

### 6.3 Locked state and upgrade dialog

Guide and spreadsheet remain fully legible for free clients but display a lock
status. Their action is **Desbloquear bônus**. Activating it opens an accessible
dialog that explains:

- both materials are included when the client becomes a paying subscriber;
- they remain available after normal cancellation or expiration;
- the primary action **Conhecer os planos** leads to `/billing`;
- a secondary action closes the dialog and returns focus to its trigger.

The interface must not imply that courtesy access qualifies or that merely
starting a Checkout unlocks the files.

### 6.4 Responsive and accessible behavior

- Cards stack in one column on small screens and form a balanced grid when
  space permits, without horizontal scrolling.
- All actions have at least a 44-by-44-pixel target and visible keyboard focus.
- Lock and availability states use text and iconography in addition to color.
- Decorative icons are hidden from assistive technology; meaningful status
  text remains announced.
- New-tab actions disclose that behavior in their accessible name.
- Motion is restrained and honors reduced-motion preferences.

## 7. Server Flow and Failure Handling

Page request:

1. Require the existing authenticated client access contract.
2. Query whether at least one non-revoked grant belongs to the current user.
3. Resolve object availability for the three allow-listed catalog entries.
4. Render only booleans and display-safe metadata; never return storage paths or
   provider identifiers to client components.

Material request:

1. Authenticate the current client and reject anonymous or blocked accounts.
2. Resolve the slug from the fixed catalog or return not found.
3. For protected slugs, require at least one non-revoked grant.
4. Verify that the canonical object exists.
5. Create a short-lived signed URL with the appropriate delivery disposition.
6. Redirect to that URL with no-store response semantics.

Stable outcomes cover unauthenticated, forbidden, unknown material, material in
preparation, and temporary service failure. Expected conditions use plain
Portuguese copy. Internal Storage details and signed URLs are not logged.

## 8. Security and Privacy

- Authentication alone unlocks only the e-book.
- Protected bonuses require a current database entitlement check on every URL
  issuance; UI state is never trusted as authorization.
- The download route accepts only an allow-listed slug and cannot sign arbitrary
  Storage paths.
- The bucket is private. Client roles cannot upload, replace, delete, or list
  bonus objects.
- Service-role or secret credentials remain server-only and never use a
  `NEXT_PUBLIC_` variable.
- RLS uses ownership predicates with `(select auth.uid()) = user_id` and does
  not rely on user-editable metadata.
- Responses containing access decisions or redirects use `Cache-Control:
private, no-store` as appropriate.
- The feature stores no new personal information beyond user and contract
  references already required to audit the grant.

## 9. Testing

### 9.1 Database tests

Cover:

- migration backfill for active paid contracts and exclusion of expired,
  pending, refunded, free, and courtesy-only users;
- one idempotent grant per contract;
- multiple grants for one user;
- preservation after cancellation and expiration;
- revocation only after confirmed full refund or chargeback;
- continued access when another non-revoked grant exists;
- ownership reads plus denial of cross-user reads and all client mutations;
- partial index and consistency constraints.

### 9.2 Service and route tests

Cover:

- all three allow-listed slugs and rejection of arbitrary paths;
- authenticated e-book access for free clients;
- denial of guide and spreadsheet for free and courtesy-only clients;
- protected access for active, expired, and normally canceled subscribers with
  a valid grant;
- PDF new-tab redirects and spreadsheet download disposition;
- missing object, signing failure, unauthenticated, blocked, forbidden, and
  unknown-material outcomes;
- no-store headers and absence of sensitive path or provider data in errors.

### 9.3 Interface tests

Cover:

- sidebar route and active state;
- `1 de 3` and `3 de 3` summaries;
- locked, unlocked, and material-in-preparation cards;
- upgrade-dialog copy, billing link, keyboard behavior, and focus return;
- visible statuses that do not rely on color;
- representative desktop and 390-pixel mobile layouts.

### 9.4 Release verification

- Rebuild the local Supabase database and run database tests, lint, and
  advisors.
- Regenerate database types and confirm a second generation has no diff.
- Update deterministic demo data so free, active, expired, canceled, refunded,
  and courtesy-only scenarios exercise the feature.
- Run targeted tests, the full application check, and the production build.
- Upload the three final objects to staging using the canonical paths and test
  all access states before production release.
- Upload production objects through the Supabase Storage API or Dashboard; do
  not manipulate `storage.objects` metadata directly.

## 10. Documentation Impact

Update:

- `PRODUCT.md` with material availability and permanent-entitlement rules;
- the billing runbook with grant, refund-revocation, reconciliation, and
  verification procedures;
- deployment or operations documentation with the private-bucket object paths
  and upload checklist;
- deterministic seed documentation if scenario coverage changes.

## 11. Out of Scope

- Creating or editing the e-book, guide, or spreadsheet content.
- An administrative CMS for bonus catalog metadata or uploads.
- Tracking reading progress, download analytics, or per-file version history.
- Granting protected bonuses for courtesy access alone.
- Public sharing links, email delivery, or WhatsApp delivery.
- Revoking bonuses after ordinary cancellation, expiration, or non-renewal.
