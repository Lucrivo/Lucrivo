# Admin Authorization Foundation Design

**Date:** 2026-09-15
**Status:** Awaiting written review

## 1. Objective

Create the authorization foundation for exactly one Lucrivo application
administrator. The administrator remains a normal Supabase Auth user and may
continue using the regular product area, but administrative access is granted
separately by the database and requires a session at Authenticator Assurance
Level 2 (`aal2`).

This phase delivers the security boundary only. It does not expose user lists,
subscription lists, administrative mutations, or a finished admin dashboard.
Those features must build on this foundation in later phases.

## 2. Scope

This phase includes:

- a private singleton record that identifies the sole administrator by
  `auth.users.id`;
- a database helper that resolves whether the current authenticated user is the
  administrator;
- a database helper that resolves whether the administrator also has an `aal2`
  session;
- a narrowly scoped public RPC that reports only whether the current caller is
  the administrator;
- a server-only `requireAdmin()` guard that fails closed and requires `aal2`;
- local seed data assigning the existing development user as administrator;
- database and TypeScript tests for authentication, authorization, MFA, grants,
  and the one-admin invariant;
- an operations runbook for initial assignment, replacement, recovery, and
  revocation of the administrator.

This phase excludes:

- MFA enrollment and challenge screens;
- admin navigation and pages;
- queries over all users, subscriptions, payments, or reports;
- user suspension, deletion, refunds, subscription changes, or other privileged
  mutations;
- application audit-log storage.

Until an MFA flow and admin pages are implemented, `requireAdmin()` may report
that an administrator needs MFA, but no administrative data or mutation becomes
available through the application.

## 3. Security Invariants

1. The application has zero or one administrator, never two.
2. The administrator is referenced by immutable Auth user UUID, never by email.
3. The Auth JWT Postgres role remains `authenticated`; no custom Postgres login
   or superuser role represents the application administrator.
4. `raw_user_meta_data` and other user-editable metadata never participate in
   authorization.
5. The database record is the source of truth. JWT custom claims are not needed
   in this phase and cannot grant administrative access.
6. A regular authenticated user cannot read, create, update, or delete the
   administrator assignment.
7. The secret/service-role client is never used to decide whether the caller is
   an administrator.
8. Administrative access requires both the singleton assignment and an `aal2`
   claim in the current verified session.
9. Authentication, database errors, missing claims, and malformed RPC responses
   all deny access.
10. UI visibility is never treated as an authorization boundary.

## 4. Approaches Considered

### 4.1 Private singleton table and database helpers — chosen

A one-row table in the existing `private` schema references `auth.users(id)`.
A hardened `security definer` helper reads it using the caller's `auth.uid()`.
RLS policies can call that helper directly, while the application uses a safe
public invoker wrapper that returns only a boolean.

This gives immediate assignment and revocation, enforces the one-admin rule in
Postgres, follows the repository's existing private-helper pattern, and avoids
duplicating authorization state in JWTs.

### 4.2 `app_metadata` or a custom access-token claim

Supabase supports application roles in `raw_app_meta_data` and custom access
token hooks. This is appropriate for larger role/permission matrices, but token
claims remain stale until token refresh. For one administrator, it adds a second
synchronization concern without improving the database invariant.

This approach is not selected as the authorization source. A claim may later be
introduced as a UI optimization, but the database record must remain
authoritative.

### 4.3 Public role table protected by RLS

A public table would let the session-bound client query its own role directly.
It would also place authorization data in an exposed schema and require careful
recursive-policy handling as role features grow.

This approach is not selected because the repository already has a hardened
`private` schema convention and only needs to expose a caller-specific boolean.

## 5. Database Design

### 5.1 Singleton assignment

Create `private.app_administrator` with:

- `singleton smallint primary key default 1` and `check (singleton = 1)`;
- `user_id uuid not null unique references auth.users(id) on delete restrict`;
- `created_at timestamptz not null default statement_timestamp()`.

The checked primary key permits only the value `1`, which makes a second row
impossible. The unique foreign key provides a direct indexed lookup by user ID.
`on delete restrict` prevents an operator from silently deleting the sole admin
Auth account before deliberately replacing or clearing the assignment.

The table receives no grants for `anon`, `authenticated`, or `service_role`.
Row-level security is enabled as defense in depth, with no direct client
policies. Operational assignment is performed by a trusted database operator,
not by the application or Data API.

### 5.2 Private authorization helpers

`private.is_admin()`:

- returns `boolean`;
- is `stable` and `security definer`;
- has `search_path = ''` and schema-qualifies every referenced object;
- returns false when `auth.uid()` is null;
- returns true only when the caller UUID matches the singleton row;
- lives outside exposed Data API schemas;
- has default execution privileges revoked, then execution granted only to the
  `authenticated` role because RLS policies and the public invoker wrapper must
  evaluate it for signed-in callers.

`private.has_admin_access()`:

- returns true only when `private.is_admin()` is true and the current JWT `aal`
  is exactly `aal2`;
- is `stable`, uses `search_path = ''`, and is callable only by
  `authenticated`;
- is the helper future sensitive RLS policies must use.

Both helpers are invoked through scalar `select` wrappers inside future RLS
policies so Postgres can evaluate them once per statement rather than once per
row.

### 5.3 Public caller-status RPC

Create `public.current_user_is_admin()` as a `security invoker`, stable,
zero-argument function that returns `private.is_admin()`.

The function intentionally reveals only whether the current caller is the
administrator. It accepts no target user ID and cannot enumerate assignments.
Execution is revoked from `PUBLIC`, `anon`, and `service_role`, then granted to
`authenticated`. Because the wrapper is not `security definer`, privileged
table access remains confined to the private helper.

The public function is required because the `private` schema is not exposed
through PostgREST. Future RLS policies do not use the public wrapper; they call
the private helpers directly.

## 6. Server Authorization Guard

Add `src/modules/auth/services/require-admin.ts` with these interfaces:

- `AdminRequiredError`: authenticated caller is not the configured admin, or
  the database check could not be completed safely;
- `AdminMfaRequiredError`: configured admin has a verified session that is not
  currently `aal2`;
- `requireAdmin()`: returns `{ userId, supabase }` using the session-bound server
  client already used by `requireUser()`.

The guard performs operations in this order:

1. Create a request-scoped Supabase server client.
2. Call `auth.getClaims()` and reject missing, invalid, or empty `sub` claims as
   `AuthRequiredError`.
3. Call `current_user_is_admin()` with the same session-bound client.
4. Treat an RPC error or any result other than literal `true` as
   `AdminRequiredError`.
5. Check the verified JWT `aal` claim and throw `AdminMfaRequiredError` unless it
   is exactly `aal2`.
6. Return the caller UUID and session-bound client.

Role validation happens before the MFA error so a regular user cannot use the
guard to infer an administrative MFA state. The service-role client is not
created anywhere in this flow.

Future admin layouts may convert `AuthRequiredError` to `/login`,
`AdminMfaRequiredError` to an MFA challenge page, and `AdminRequiredError` to a
not-found or access-denied response. Every privileged Route Handler and Server
Action must still call `requireAdmin()` independently.

## 7. Provisioning and Recovery

The existing local seed user is assigned as the local administrator after its
Auth identity is created. This assignment is for local development only.

Production assignment is an explicit operator procedure:

1. Create or identify a permanent, email-confirmed Supabase Auth user.
2. Confirm its UUID and identity provider in Supabase Auth.
3. Enroll and verify an MFA factor before exposing any admin page.
4. Insert the UUID into `private.app_administrator` using the SQL editor or a
   trusted database connection.
5. Verify `current_user_is_admin()` as that signed-in user and verify that an
   `aal1` session still fails `has_admin_access()`.

Replacement happens in one transaction by updating the singleton row from the
old UUID to the new UUID. Clearing the assignment is allowed only as an
intentional recovery action and leaves the application with zero admins.

No environment variable, email comparison, public signup behavior, or “first
user wins” rule may provision an administrator.

## 8. Testing Strategy

### 8.1 Database tests

Add a pgTAP test file that proves:

- the singleton table exists in `private` with its primary key, check, unique,
  and Auth foreign-key constraints;
- direct table privileges are absent for `anon`, `authenticated`, and
  `service_role`;
- anonymous and ordinary authenticated callers receive false;
- the assigned administrator receives true from `is_admin()`;
- the assigned administrator at `aal1` receives false from
  `has_admin_access()`;
- the assigned administrator at `aal2` receives true from
  `has_admin_access()`;
- an attempt to insert a second singleton row fails;
- the public status RPC is executable by `authenticated` but not by `anon`;
- the public status RPC returns only the current caller's boolean result.

Tests set local JWT claims and Postgres roles in the same style as the existing
Supabase database tests, then reset role and claims after each access scenario.

### 8.2 TypeScript tests

Unit tests for `requireAdmin()` cover:

- missing or invalid claims;
- a non-admin result;
- an authorization RPC error;
- an admin with a missing or `aal1` assurance level;
- an admin with `aal2` returning the user ID and the same Supabase client.

The generated database types must contain `current_user_is_admin` before the
TypeScript implementation is accepted.

### 8.3 Verification

The phase is complete only after:

- a clean local database reset applies the migration and seed;
- the focused pgTAP and Vitest suites pass;
- generated database types are current;
- database lint and advisors report no new actionable security errors;
- project typecheck, lint, formatting check, and full test suite pass.

## 9. Failure Handling

- Database or RPC errors deny access and are never converted to admin success.
- A deleted or missing Auth user cannot remain assigned because of the foreign
  key and `on delete restrict` behavior.
- An admin without `aal2` receives a distinct server error so a future UI can
  start the MFA flow without weakening authorization.
- A non-admin receives no information about who the administrator is.
- The runbook documents recovery through trusted Supabase/database operations;
  the application never contains a self-promotion endpoint.

## 10. Future Phases

After this foundation is approved and implemented, subsequent designs may add:

1. MFA enrollment and challenge UX;
2. a reusable admin shell and navigation;
3. read-only admin dashboard metrics;
4. paginated user and subscription views;
5. audited, explicitly authorized administrative mutations.

Each data-access phase must add table-specific RLS or a narrow server boundary.
The existence of `requireAdmin()` alone never authorizes broad service-role use.
