# Admin MFA and Shell Design

**Date:** 2026-09-16
**Status:** Approved

## 1. Objective

Complete the first usable administrative access path for the single Lucrivo
administrator. The administrator is still provisioned exclusively through
Supabase Auth and the private database singleton; the application must never
offer a way to register, promote, replace, or revoke an administrator.

After a conventional sign-in, the configured administrator is sent to
`/admin`, completes mandatory TOTP multi-factor authentication, and enters a
minimal administrative shell. Regular users continue to `/dashboard`.

This phase proves the complete authentication and authorization boundary. It
does not yet expose real user, subscription, payment, report, or operational
data.

## 2. Scope

This phase includes:

- accepting Supabase invitation callbacks and allowing an invited user to set
  an initial password;
- resolving the authenticated home destination on the server;
- redirecting the configured administrator to `/admin` after login;
- enabling TOTP enrollment and verification locally;
- documenting the equivalent TOTP setting required in staging;
- an administrator-only TOTP setup flow;
- an administrator-only TOTP challenge flow;
- a server-side admin entry gateway that distinguishes setup, challenge, and
  authorized states;
- a reusable application shell configuration for regular and administrative
  navigation;
- minimal `/admin`, `/admin/users`, and `/admin/subscriptions` pages;
- focused tests for redirects, invitation handling, MFA state transitions,
  route protection, and navigation.

This phase excludes:

- any application interface for assigning or removing the administrator;
- SMS MFA, passkeys, recovery codes, or multiple-factor management;
- factor removal or replacement through the application;
- real dashboard metrics, charts, filters, tables, pagination, search, or
  administrative queries;
- listing, suspending, deleting, or impersonating users;
- reading or changing subscriptions, charges, refunds, or billing access;
- an application audit-log store.

The three administrative content pages are intentionally disposable
scaffolding: each contains only its route title and a short honest message about
the future module. No effort is spent polishing placeholder content that will
be replaced.

## 3. Security Invariants

1. Administrator assignment remains an operator-only database action against
   `private.app_administrator`.
2. A user cannot become an administrator by enrolling MFA.
3. Administrator identity is checked before any factor state is disclosed.
4. Administrative content requires both the singleton UUID match and a verified
   `aal2` session.
5. Every protected admin layout, Server Action, and Route Handler must enforce
   authorization independently; hiding navigation is never sufficient.
6. The request-scoped publishable-key client performs caller authorization.
   Secret/service-role clients never decide whether the caller is admin.
7. Missing claims, malformed responses, role-check failures, factor-list
   failures, and MFA API failures deny administrative access.
8. TOTP secrets, QR payloads, verification codes, access tokens, and JWTs are
   never written to server logs, browser logs, analytics, error messages, or
   persisted application storage.
9. Error messages do not reveal administrative factor state to regular users.
10. The application does not introduce authorization by email, environment
    variable, user metadata, or first-user rules.

## 4. Architecture

### 4.1 Authenticated destination resolver

Add a small server-only destination resolver with two fixed outcomes:

- literal `true` from `public.current_user_is_admin()` resolves to `/admin`;
- literal `false`, an RPC error, or an unusable response resolves to
  `/dashboard`.

Routing uncertainty must not block a regular authenticated user and must never
grant administrative access. Direct access to `/admin` still executes the
strict admin guards.

Use a fixed internal continuation endpoint such as `/auth/continue` so login,
email confirmation, and guest-only redirects share one decision path without
performing database role checks in the global proxy. The endpoint accepts no
external redirect target.

The password login action redirects to the continuation endpoint after a
successful `signInWithPassword()`. An already authenticated administrator who
visits a guest-only page is also routed through this endpoint instead of being
hard-coded to `/dashboard`.

### 4.2 Invitation completion

Extend `/auth/confirm` to accept the Supabase OTP type `invite` in addition to
the existing `email` and `recovery` types.

The invitation flow is:

1. A trusted operator sends the invitation from Supabase Dashboard.
2. The invitation template links to `/auth/confirm` with a TokenHash and
   `type=invite`.
3. The route verifies the token using the request-scoped Supabase client.
4. Successful verification creates the temporary authenticated session and
   redirects to `/update-password?flow=invite`.
5. The existing password-update service sets the initial password and revokes
   the temporary sessions.
6. The user returns to `/login` with an invitation-completed status.

Invalid, missing, or expired invitation tokens return to `/login` with a safe
invitation error and never retain the TokenHash in the destination URL.

Add a local invitation email template and register it in `supabase/config.toml`.
The deployment runbook must note that the equivalent template needs to be
configured in the hosted staging project. An invitation sent before the hosted
template is updated may need to be resent.

### 4.3 Admin identity and access-state services

Refactor the existing server guard into two composable levels:

- `requireAdminIdentity()` validates verified claims and the singleton role but
  permits `aal1`. It is used only by the MFA entry flow.
- `requireAdmin()` composes the identity check and still requires the verified
  JWT claim `aal2`. It remains the mandatory guard for privileged content and
  operations.

Add an admin entry-state resolver that calls the identity guard before reading
MFA factors. It returns one of these closed states:

- `setup`: the assigned admin has no verified TOTP factor;
- `challenge`: the assigned admin has a verified TOTP factor but the current
  session is not `aal2`;
- `authorized`: the assigned admin has an `aal2` session;
- `unavailable`: factor state could not be established safely.

Unauthenticated callers go to `/login`. Authenticated non-admin callers receive
a not-found response. The unavailable state renders a small retry surface; it
must not guess that enrollment is required, because doing so could create
duplicate factors.

### 4.4 Route boundaries

Use route groups or equivalent nested layouts so MFA entry pages and protected
admin pages share the `/admin` URL prefix without sharing the `aal2` layout.

- `/admin/mfa/setup` requires `requireAdminIdentity()` and a setup state.
- `/admin/mfa/challenge` requires `requireAdminIdentity()` and a challenge
  state.
- `/admin`, `/admin/users`, and `/admin/subscriptions` live below a layout that
  requires `requireAdmin()`.

Entering `/admin` acts as the gateway:

- setup state redirects to `/admin/mfa/setup`;
- challenge state redirects to `/admin/mfa/challenge`;
- authorized state renders the administrative dashboard;
- non-admin and unavailable states fail closed as described above.

## 5. TOTP Flow

### 5.1 Environment configuration

Change the local Supabase configuration to:

- enable TOTP enrollment;
- enable TOTP verification;
- keep phone MFA disabled.

Staging requires the equivalent App Authenticator enrollment and verification
settings in Supabase Dashboard before the UI is exercised. No database
migration is required.

### 5.2 Enrollment

The setup screen does not enroll automatically on render. The assigned admin
explicitly starts setup, preventing React development re-renders from creating
multiple factors.

The browser's session-bound Supabase client calls `auth.mfa.enroll()` with
`factorType: "totp"` and a stable Lucrivo-specific friendly name. The interface
shows:

- the QR code returned by Supabase;
- an accessible text alternative;
- the manual secret as a fallback, with an explicit copy action;
- a six-digit verification-code field;
- the primary action to activate MFA.

Activation uses `auth.mfa.challengeAndVerify()`. On success Supabase upgrades
the current session to `aal2`; the client replaces the route with `/admin` and
refreshes server-rendered state.

Only unverified factors created by an abandoned Lucrivo setup attempt may be
cleaned up before starting a replacement attempt. A verified factor is never
removed by this flow.

### 5.3 Challenge

When a verified TOTP factor exists but the session is `aal1`, the challenge
screen requests the current six-digit code and calls
`auth.mfa.challengeAndVerify()` for that factor.

On success, the browser replaces the route with `/admin` and refreshes the
server boundary. Invalid or expired codes keep the user on the form and display
a generic Portuguese error. Submissions are disabled while pending to prevent
accidental duplicate challenges.

The current phase creates and supports one Lucrivo TOTP factor. General factor
selection and management remain out of scope.

## 6. Interface Design

The MFA surfaces use an Operate-mode, task-focused presentation based on the
existing authenticated and authentication visual language.

They render without the application sidebar so the security task is
unambiguous. The setup and challenge screens use a centered card, concise
Portuguese instructions, familiar form controls, visible focus, and actions to
sign out or return to the regular financial area.

The code field uses numeric input hints and `autocomplete="one-time-code"`.
Loading, invalid-code, unavailable, and success transitions are communicated by
text in addition to color. Focus moves to the relevant heading or error summary
after a state transition. Reduced-motion preferences are preserved.

No ornamental MFA animation, security illustration, multi-step progress
ceremony, or modal is introduced.

## 7. Administrative Shell

Reuse the current sidebar, header, account menu, theme control, responsive
behavior, and spacing vocabulary. Extract only the configuration seam needed
to provide different navigation and heading copy; do not redesign the regular
application shell.

The administrative navigation contains:

- Dashboard → `/admin`;
- Usuários → `/admin/users`;
- Assinaturas → `/admin/subscriptions`;
- Área financeira → `/dashboard`, visually separated as a secondary
  destination.

The header identifies the context as `Administração`. Account and logout
controls remain unchanged. Mobile behavior continues to use the existing
collapsible sidebar primitives.

The three content pages contain only a semantic heading and one short message
describing the future module. They contain no invented data, fake metrics,
placeholder charts, empty tables, filters, or decorative polish.

## 8. Error Handling and Recovery

- Login credential, CAPTCHA, and rate-limit behavior remains unchanged.
- An admin-destination lookup failure falls back to the regular dashboard; it
  cannot grant admin access.
- A direct role-check failure under `/admin` is denied.
- A factor-list failure shows a retry state rather than enrollment or content.
- An enrollment or challenge failure is translated into a small stable set of
  Portuguese UI errors; provider details are not exposed.
- The application never logs the caught Supabase Auth payload for MFA calls.
- Losing the authenticator device is handled through the trusted operator
  procedure in the admin access runbook. This phase does not add a weaker
  recovery path or disable the `aal2` requirement.

## 9. Testing Strategy

### 9.1 Authentication and redirects

- a regular successful login resolves to `/dashboard`;
- the configured admin resolves to `/admin`;
- an admin-status RPC failure resolves safely to `/dashboard`;
- authenticated guest-only navigation uses the continuation endpoint;
- external redirect input is never accepted.

### 9.2 Invitation

- a valid invite TokenHash is verified with `type: "invite"`;
- a valid invite reaches the initial-password flow;
- missing, invalid, and expired invitations use the safe login error;
- the TokenHash is removed from every destination URL;
- the local invitation template contains the expected callback fields.

### 9.3 Server authorization state

- unauthenticated, malformed-claim, non-admin, RPC-error, setup, challenge,
  authorized, and factor-list-error cases are covered;
- factor state is never queried for a caller who has not passed the admin role
  check;
- `requireAdmin()` still rejects `aal1` and accepts only `aal2`.

### 9.4 MFA components

- enrollment starts only from an explicit action and only once per attempt;
- QR, manual secret, copy feedback, and accessible labels render correctly;
- invalid codes remain on the form with a generic error;
- successful setup and challenge navigate to `/admin` and refresh the server
  state;
- pending submissions cannot be duplicated;
- no secret or code appears in logged output.

### 9.5 Shell and routes

- every protected admin route invokes the server authorization boundary;
- the sidebar exposes the three admin destinations and the financial-area
  escape hatch;
- active navigation works for nested paths;
- placeholder pages contain no fabricated metrics or data controls;
- existing regular navigation behavior remains covered.

The complete application suite, typecheck, lint, formatting checks, and the
existing Supabase database suite remain part of the final verification.

## 10. Operational Handoff

Update the admin access and deployment runbooks with:

1. the local TOTP configuration;
2. the hosted Dashboard settings for App Authenticator enrollment and
   verification;
3. the invitation-template callback requirement;
4. the possibility of resending invitations issued before the template
   update;
5. first-login verification from invitation through password creation, TOTP
   enrollment, `aal2`, and `/admin`;
6. authenticator-loss recovery through a trusted operator, never through a
   public application flow.

The administrator UUID assignment remains the separate manual procedure
already documented in `docs/operations/admin-access-runbook.md`.
