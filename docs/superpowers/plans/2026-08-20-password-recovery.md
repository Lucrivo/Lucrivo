# Password Recovery Implementation Plan

> Design source: `docs/superpowers/specs/2026-08-20-password-recovery-design.md`

## Goal

Implement the approved Supabase password recovery flow in small TDD checkpoints. Complete and verify only one task at a time, report its result, and wait for user approval before starting the next task.

## Constraints

- Keep authentication mutations server-first.
- Use the existing cookie-aware Supabase server client.
- Do not add a service-role client, database migration, RLS policy, or authenticated settings page.
- Never expose account existence, OTP tokens, Supabase error payloads, or email addresses in logs.
- Use a fixed application callback origin from `APP_URL`; do not derive security-sensitive redirects from request headers or form input.
- Preserve existing confirmation, login, registration, and logout behavior.
- Apply changes with TDD: write a failing test, run it, implement the minimum behavior, and rerun it.

## Task 1 — Centralize and align password validation

### Files

- Create: `src/schemas/auth/password.schema.ts`
- Create: `src/schemas/auth/password-recovery.schema.ts`
- Modify: `src/schemas/auth/register.schema.ts`
- Modify: `src/schemas/auth/auth-schemas.test.ts`
- Modify: `src/components/shared/auth/auth-form.tsx`
- Modify: `src/components/register/register-form.tsx`
- Modify: `src/components/register/register-form.test.tsx`

### Steps

1. Extend `auth-schemas.test.ts` with failing cases for:
   - Fewer than 10 characters.
   - No letter.
   - No digit.
   - More than 72 characters.
   - Mismatched confirmation.
   - A valid normalized recovery email.
   - A valid password containing letters and digits.
2. Run:

   ```bash
   pnpm test -- src/schemas/auth/auth-schemas.test.ts
   ```

   Confirm the new expectations fail for the current eight-character registration rule and missing recovery schemas.
3. Add a reusable password schema with the exact Supabase policy: 10–72 characters, at least one letter, and at least one digit.
4. Refactor `registerSchema` to use the shared password schema without changing its public input type.
5. Add:
   - `passwordRecoveryRequestSchema` for normalized email input.
   - `passwordUpdateSchema` for password plus confirmation, including the mismatch issue on `confirmPassword`.
6. Change `AuthPasswordField`'s HTML `minLength` from 8 to 10.
7. Update the registration weak-password copy to mention 10 characters, a letter, and a number.
8. Extend `register-form.test.tsx` to assert the corrected password constraint and copy.
9. Run the focused schema and registration form tests, TypeScript, ESLint on touched files, and Prettier check.

### Checkpoint

Report the aligned policy and test results. Wait for approval before Task 2.

## Task 2 — Implement the neutral recovery-request backend

### Files

- Create: `src/modules/auth/services/request-password-recovery.service.ts`
- Create: `src/modules/auth/services/request-password-recovery.service.test.ts`
- Create: `src/modules/auth/actions/request-password-recovery.action.ts`
- Create: `src/modules/auth/actions/request-password-recovery.action.test.ts`
- Modify: `.env.example`

### Contract

- Service input: normalized email.
- Service calls `resetPasswordForEmail(email, { redirectTo: `${APP_URL}/auth/confirm` })`.
- Public action states:
  - `null`
  - `{ status: "error"; error: "invalid_email" | "request_failed" }`
  - `{ status: "success"; outcome: "recovery_requested" }`
- Known provider outcomes that could disclose account existence return the same success state.
- Unexpected local/configuration failures return `request_failed` and emit only a sanitized server event.

### Steps

1. Write failing service tests for the exact callback URL, Supabase success, provider error normalization, and thrown exception sanitization.
2. Write failing action tests proving invalid input does not call the service and all accepted requests produce the neutral success state.
3. Run the two focused test files and confirm failure.
4. Add `APP_URL=http://localhost:3000` to `.env.example`; do not edit or commit `.env.local`.
5. Implement the service with `import "server-only"`, validate that `APP_URL` is present, and avoid returning provider messages.
6. Implement the thin Server Action using `passwordRecoveryRequestSchema`.
7. Run focused tests, TypeScript, targeted lint, and Prettier check.

### Checkpoint

Report the action/service contract and test results. Wait for approval before Task 3.

## Task 3 — Add the forgot-password page and login entry point

### Files

- Create: `src/components/forgot-password/forgot-password-form.tsx`
- Create: `src/components/forgot-password/forgot-password-form.test.tsx`
- Create: `src/app/(public)/forgot-password/page.tsx`
- Modify: `src/components/login/login-form.tsx`
- Modify: `src/components/login/login-form.test.tsx`
- Modify: `src/components/shared/auth/auth-form.tsx`

### Steps

1. Write failing component tests for:
   - Email submission.
   - Neutral success acknowledgement.
   - Invalid-email feedback.
   - Generic operational feedback.
   - A login link from the recovery page.
   - The forgot-password link from the login form.
2. Add an optional provider section to `AuthFormShell`; login and registration continue passing `providerLabel`, while recovery pages omit it.
3. Implement `ForgotPasswordForm` with `useActionState` and existing shared email, feedback, submit, and footer components.
4. Add the public page using `AuthPage` and `requestPasswordRecovery`.
5. Add a visible “Esqueci minha senha” link next to the login password field while preserving the registration footer.
6. Run focused component tests, TypeScript, targeted lint, and Prettier check.

### Checkpoint

Report the new page and entry point. Wait for approval before Task 4.

## Task 4 — Configure and test the Supabase recovery email

### Files

- Create: `supabase/templates/recovery.html`
- Modify: `supabase/config.toml`

### Steps

1. Register `[auth.email.template.recovery]` with a Portuguese subject and the repository-relative template path.
2. Build the recovery email from the existing confirmation template's visual language.
3. Use an escaped action URL equivalent to:

   ```text
   {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
   ```

4. State clearly that the recipient can ignore the message if they did not request it; do not include personal data.
5. Run `pnpm supabase --help` and the available config validation/start command discovered from CLI help rather than assuming flags.
6. Run Prettier check for the template and inspect the rendered URL in Mailpit if local Supabase is available.

### Checkpoint

Report configuration validation and whether Mailpit verification was available. Wait for approval before Task 5.

## Task 5 — Extend the OTP callback for recovery

### Files

- Modify: `src/app/auth/confirm/route.test.ts`
- Modify: `src/app/auth/confirm/route.ts`

### Steps

1. Replace the current test that rejects `recovery` with failing tests that require:
   - Valid `email` → `/dashboard`.
   - Valid `recovery` → `/update-password`.
   - Failed `email` → `/login?error=confirmation_failed`.
   - Failed `recovery` → `/forgot-password?error=invalid_or_expired_link`.
   - Missing token and unsupported type → a safe failure without calling Supabase.
   - Caller-provided `next` values are ignored.
   - Tokens never appear in redirect locations.
2. Run the route test and confirm recovery cases fail.
3. Implement a closed type-to-destination mapping for only `email` and `recovery`.
4. Pass the narrowed OTP type to `verifyOtp`; do not cast arbitrary query values.
5. Preserve the route's exception-safe behavior and removal of sensitive query data.
6. Run the focused route test, TypeScript, targeted lint, and Prettier check.

### Checkpoint

Report both supported callback paths. Wait for approval before Task 6.

## Task 6 — Implement password update and global revocation backend

### Files

- Create: `src/modules/auth/services/update-password.service.ts`
- Create: `src/modules/auth/services/update-password.service.test.ts`
- Create: `src/modules/auth/actions/update-password.action.ts`
- Create: `src/modules/auth/actions/update-password.action.test.ts`

### Contract

Service results distinguish:

- `updated`
- `invalid_session`
- `update_failed`
- `updated_revocation_failed`

The action returns validation/update errors for form rendering and redirects completed updates:

- Full success → `/login?status=password_updated`
- Password changed but revocation incomplete → `/login?status=password_updated&warning=sessions_not_revoked`
- Invalid session → `/forgot-password?error=invalid_or_expired_link`

### Steps

1. Write failing service tests for:
   - `getClaims()` failure or missing claims prevents mutation.
   - Valid identity calls `updateUser({ password })` once.
   - Update error does not call sign-out.
   - Successful update calls `signOut({ scope: "global" })`.
   - Global sign-out failure attempts `signOut({ scope: "local" })` and returns partial success.
   - Thrown errors do not leak provider details.
2. Write failing action tests for validation, mismatch classification, each service result, and exact safe redirects.
3. Run focused tests and confirm failure.
4. Implement the server-only service with one cookie-aware client per operation.
5. Verify identity with `getClaims()` before `updateUser`.
6. Treat `updateUser` success as committed even if later revocation fails.
7. Log the partial security event without user, email, password, token, or provider payload.
8. Implement the thin update action using `passwordUpdateSchema`.
9. Run focused tests, TypeScript, targeted lint, and Prettier check.

### Checkpoint

Report successful and partial-success behavior. Wait for approval before Task 7.

## Task 7 — Add the update-password interface

### Files

- Create: `src/components/update-password/update-password-form.tsx`
- Create: `src/components/update-password/update-password-form.test.tsx`
- Create: `src/app/(public)/update-password/page.tsx`
- Modify: `src/components/shared/auth/auth-form.tsx` only if an already-approved shared prop is required

### Steps

1. Write failing component tests for:
   - Both fields use `autocomplete="new-password"`.
   - Password visibility controls remain accessible.
   - Mismatch and policy feedback.
   - Generic update failure.
   - Form submission to the supplied action.
2. Implement the form with the shared password, feedback, and submit components and no provider block.
3. Add concise password-policy guidance without duplicating validation logic.
4. Add the public page using `AuthPage` and `updatePassword`.
5. Run focused component tests, TypeScript, targeted lint, and Prettier check.

### Checkpoint

Report the completed update UI. Wait for approval before Task 8.

## Task 8 — Full regression and local flow verification

### Files

- Modify only files required to fix defects directly caused by Tasks 1–7.

### Steps

1. Run the full automated suite:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm format:check
   ```

2. If repository-wide lint reports only pre-existing tooling files outside the application, also run ESLint against all touched application files and report both results explicitly.
3. Discover local Supabase commands with `pnpm supabase --help` and start/reset the local stack using only documented commands.
4. Through Mailpit, verify:
   - Recovery email is captured.
   - The action link contains a TokenHash and `type=recovery`.
   - The link reaches `/update-password`.
   - A valid new password succeeds.
   - The user reaches login and can authenticate with the new password.
   - Reusing or corrupting the link returns to the safe recovery error state.
5. If containers, ports, or SMTP infrastructure are unavailable, do not claim end-to-end success; report the exact unavailable check and retain automated verification evidence.
6. Review `git diff --check` and confirm no secrets or `.env.local` changes are staged.

### Checkpoint

Deliver the final verification summary, remaining production SMTP requirement, JWT revocation limitation, and changed-file list.

## Implementation Order

Tasks are intentionally ordered so each checkpoint leaves the repository coherent:

1. Password contract.
2. Recovery-request backend.
3. Recovery-request UI.
4. Email delivery configuration.
5. Recovery callback.
6. Password-update backend.
7. Password-update UI.
8. Regression and local integration verification.

Do not begin a later task before its preceding checkpoint is approved.
