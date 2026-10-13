# Admin User Management Design

**Date:** 2026-09-16
**Status:** Approved in conversation; awaiting written-spec review

## 1. Objective and scope

Replace the `/admin/users` placeholder with a real, MFA-protected user-management area. The administrator can find a user, inspect their account, diagnoses and billing history, grant or end complimentary access, block or unblock an account, and soft-delete or restore an account. Changes must be audited and must not silently alter payment-provider state.

This phase does not edit a user's email or profile, create new administrators, issue refunds, cancel subscriptions, permanently erase personal data, or fabricate a full login/activity history. The existing `/admin/subscriptions` page remains outside this scope.

## 2. Product rules

### 2.1 User identity and status

`auth.users` is the source for the user ID, email, registration time and last sign-in time. No separate name or avatar is inferred. The assigned administrator is excluded from the managed-user list and cannot be targeted by these actions.

An administrator-owned account-state record holds `blocked_at`, `deleted_at`, and the current complimentary-access expiry. The absence of a record means a normal account. Blocked and soft-deleted are distinct states; deletion wins in display and access decisions. Soft delete preserves the Auth identity, diagnoses, contracts and payments, so restoration is possible. It is **not** a legal erasure operation.

The user interface must clearly distinguish account state (active, blocked, excluded) from entitlement (free, paid subscription, complimentary). The primary entitlement label uses paid subscription first, then unexpired complimentary access, then free; an overlapping complimentary grant is still visible in the detail. Entitlement filters use that same primary classification. A paid subscription is derived only from a valid billing contract; a complimentary grant is never represented as a payment or contract.

### 2.2 Actions

All mutations require a confirmation dialog and an administrator-supplied reason. Reason text is non-empty, bounded, and stored in the audit event. Each mutation is atomic with its audit insertion.

- **Grant complimentary access:** requires a future expiry timestamp; the UI offers a date in `America/Sao_Paulo` and shows the exact expiry before confirmation. An existing unexpired grant may be replaced, with old/new values audited. A grant may coexist with paid access, but is visually labeled as complimentary and never changes billing records.
- **End complimentary access:** clears only the complimentary grant. If a paid contract still grants access, paid access continues uninterrupted.
- **Block / unblock:** block immediately denies app use and data access, including requests made with existing sessions. Unblock restores normal eligibility, but does not create a paid entitlement. Block is refused while a paid contract currently grants access; the UI explains that billing must be resolved first. The database repeats this check transactionally.
- **Soft-delete / restore:** soft delete immediately denies app use and data access, retains records, and removes the user from the default list. It is refused while a paid contract currently grants access. Restore returns the account to its pre-deletion blocked or unblocked state and does not change billing or complimentary expiry. A previously expired complimentary grant remains expired.

Revalidating the current state on every mutation is mandatory; stale dialogs cannot override a more recent administrative change. Repeating an already-applied action returns a defined no-op or conflict, never a misleading success. No action deletes rows from `auth.users` or calls the Asaas provider.

### 2.3 History

The history tab shows immutable administrative events with actor, timestamp, action, reason, and relevant before/after values. It can also display registration and latest sign-in as labeled account facts, not as a reconstructed session timeline. Only bounded, paginated history is fetched.

## 3. Pages and interaction

### 3.1 `/admin/users`

The desktop table uses the existing `Table` primitives and admin card styling. A focused, reusable admin list shell may own title, toolbar, empty state and pagination, but the dashboard's recent-subscriptions table remains a different data presentation and should not be forced into an over-generalized component.

Columns: user (email and visual initial), account state, access source, current subscription summary, diagnosis count, registered date, last sign-in, and actions. Unknown values display a neutral label, never an invented value. The responsive layout becomes compact cards on narrow screens rather than an unusable wide table.

Search matches email case-insensitively. Filters cover account state (active, blocked, excluded, all) and entitlement (free, paid, complimentary, all). Default scope omits excluded accounts. Results sort by registration time descending and ID descending, both deterministic. Pagination is server-side using a cursor, with previous/next controls, a page-size cap, and filter/search changes resetting the cursor. Query parameters preserve list context when navigating to and from detail.

The entire visual row is an apparent navigation target: pointer/hover/focus treatment, a permanent chevron, and one real keyboard-accessible link stretched across its non-action cells. The action-menu button remains a separate interactive target and never triggers navigation. The menu contains **Ver usuário**, **Ver histórico**, **Ver assinatura**, **Alterar acesso**, **Bloquear/Desbloquear**, and **Excluir/Restaurar** as applicable. The omitted **Editar** action does not appear. Menu labels and disabled states explain paid-access conflicts.

### 3.2 `/admin/users/[userId]`

The detail page uses a breadcrumb-like `Usuários / <email>` header and an explicit back link, with preserved list filters when available. Invalid IDs and absent users return a not-found state; an excluded user remains inspectable by direct admin URL.

Tabs use a URL-addressable `tab` parameter, so menu links can open them directly:

- **Perfil:** real Auth identity, registration and latest sign-in, account state, access source and expiry; applicable actions.
- **Diagnósticos:** paginated rows with type/category, creation time, and free/paid report marker. This phase shows report metadata, not report contents, and provides no dead-end link. Never expose raw report snapshots in the list payload.
- **Assinatura:** current and historical contracts, billing mode, payment method, status, access interval, cancellation state and relevant payment summary. No payment-provider identifiers, checkout URLs or raw webhook payloads are sent to the browser.
- **Histórico:** paginated admin audit events plus clearly labeled account dates.

Loading skeletons, empty results, retryable read errors and action errors are explicit. Mutations provide in-place success/error feedback, preserve current filters/tab, and revalidate list and detail data. All dialogs are keyboard accessible with focus restored after close.

## 4. Data and security architecture

Add private, indexed account-state and append-only audit tables. The state table references `auth.users` without cascading deletion; the audit table records user and actor IDs, event type, reason, timestamp, and a narrow structured before/after payload. It must not store secrets, provider payloads or entire user records. The implementation must use appropriate checks, `timestamptz`, foreign-key indexes, and least-privilege grants. Exposed-schema tables have RLS; private tables deny direct client reads and writes.

Versioned public RPCs provide a limited user-list projection, a user-detail projection, paginated child collections, and validated mutations. Every entrypoint checks `private.has_admin_access()` (administrator singleton plus `aal2`) inside the database, independent of the Next.js layout. Privileged functions use an empty `search_path`, schema-qualified objects, minimal grants and no unrestricted `service_role` exposure. Server services also run `requireAdmin`, validate arguments and RPC payloads, and map them into typed UI models. The browser never receives a service-role credential.

Account eligibility must be enforced below the page layer. Update the common app-user guard and audit all owner-facing RLS policies, report-creation/read functions, billing reads and server-only privileged read paths so a blocked or soft-deleted identity cannot keep using existing JWTs. Complimentary access extends paid-report eligibility only where existing paid access is checked; it does not create a billing contract, change invoices or alter dashboard revenue/subscription metrics. Free-first-report behavior stays unchanged. Admin authorization is not derived from user-editable metadata.

Mutations verify the target is not the administrator, lock the relevant state/target, check current paid entitlement under that transaction, then update state and append audit. The interface may pre-disable a conflicting action, but database checks are authoritative. No delete or block should race past a newly active paid interval without a defined conflict response.

The list avoids unbounded Auth-admin `listUsers` loops. It queries a database-side admin projection with bounded cursor pagination and an appropriate email-search strategy. Sorting, indexes and query plans must be reviewed against expected user volume. No generic public profile table is introduced merely to support this screen.

## 5. Verification

- Database authorization tests: anon, ordinary user, admin at `aal1`, and admin at `aal2`; direct table access denied; self-targeting denied.
- Mutation tests: reason/expiry validation, grant/end courtesy, block/unblock, delete/restore, audit atomicity, repeat/stale actions, active-paid conflicts, and concurrent mutation behavior.
- Access tests: blocked/deleted users denied with existing sessions across private pages, report reads/creation, billing paths and direct database calls; restoration and expired courtesy behave correctly.
- UI tests: list search/filters/cursor, empty/error states, clickable row versus menu, keyboard access, direct tab URLs, paid-conflict copy, and confirmation feedback.
- Run database tests, targeted component/service tests, typecheck, lint and formatting checks. Manually inspect desktop and mobile layout in both light and dark themes if a browser is available.

## 6. Non-goals and risk notes

This is administrative suspension and logical deletion, not account erasure under privacy law. Billing reconciliation, refunds and subscription cancellation require a separate workflow. If an account has paid access, block/delete must stop with an explanatory conflict instead of leaving a paying user locked out while charges continue. Administrative history begins when the audit table is introduced; older actions cannot be invented retroactively.
