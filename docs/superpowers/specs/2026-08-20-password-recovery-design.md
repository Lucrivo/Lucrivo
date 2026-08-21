# Password Recovery Design

## Status

Approved for implementation design on 2026-08-20.

## Objective

Add a server-first password recovery flow to the existing Next.js and Supabase authentication module. A user who forgot their password must be able to request a recovery email, establish a short-lived recovery session through a verified OTP link, choose a new password, and then sign in again.

## Scope

This design includes:

- A public forgot-password page and request form.
- A recovery email template for local and hosted Supabase Auth.
- Server-side verification of recovery links.
- A public update-password page reached from a valid recovery link.
- Password update followed by global session sign-out.
- Alignment of application password validation with Supabase Auth configuration.
- Automated tests and a local Mailpit verification path.

This design does not include:

- A password-change screen for authenticated account settings.
- Immediate per-request revocation checks against `auth.sessions`.
- A database migration, RLS policy, service-role client, or custom Auth hook.
- Production SMTP provider selection or credential configuration.

## Decisions

- Use Supabase TokenHash verification in the existing `/auth/confirm` Route Handler.
- Keep Supabase calls behind server-only services and expose mutations through Server Actions.
- Accept only explicitly supported OTP types and map each type to a fixed destination.
- Return a neutral response after recovery requests to prevent account enumeration.
- Require a new login after a successful password update.
- Revoke refresh tokens across all sessions with `signOut({ scope: "global" })`.
- Keep strict immediate access-token revocation outside this feature's scope.

## Architecture

The flow extends the existing `auth` module rather than creating a separate subsystem.

### Public pages

`/forgot-password` renders an email form using the existing authentication page shell and shared form components. The login page links to it.

`/update-password` renders new-password and password-confirmation fields. It is intended to be reached after `/auth/confirm` establishes a valid recovery session. Direct access without a valid authenticated session cannot update a password.

### Server Actions

The forgot-password action parses the submitted email with a dedicated schema and delegates delivery to a server-only recovery service. Its public result does not reveal whether the address belongs to a user.

The update-password action parses both password fields, verifies that a valid session is present, delegates the password change to a server-only service, and coordinates global sign-out after the update succeeds.

Actions translate infrastructure failures into a small, typed set of presentation states. They do not expose Supabase error messages, tokens, or account-existence information.

### Server-only services

The request service calls `resetPasswordForEmail` with an application-owned callback URL. The update service calls `updateUser` and performs session termination. Both use the existing cookie-aware server Supabase client and contain no UI concerns.

### Recovery callback

The existing `/auth/confirm` handler becomes an explicit mapping:

| OTP type   | Success destination | Failure destination                              |
| ---------- | ------------------- | ------------------------------------------------ |
| `email`    | `/dashboard`        | `/login?error=confirmation_failed`               |
| `recovery` | `/update-password`  | `/forgot-password?error=invalid_or_expired_link` |

Missing tokens, unsupported types, verification errors, and thrown exceptions use the matching safe failure path. The handler does not accept a caller-provided `next` destination, which avoids an open redirect.

### Supabase configuration and template

Add a recovery template registration to `supabase/config.toml` and a Portuguese HTML template under `supabase/templates`. Its action link targets `/auth/confirm`, includes `TokenHash`, and fixes the OTP type to `recovery`.

Local development uses Mailpit. A hosted production environment must configure the site URL, allowed redirect URL, template, and a production SMTP provider. Supabase's default mail service is not treated as production infrastructure.

## Data Flow

### Requesting recovery

1. The user submits an email from `/forgot-password`.
2. The Server Action validates and normalizes the input.
3. Invalid input returns a field-level validation state without contacting Supabase.
4. Valid input is passed to the server-only request service.
5. The UI returns the same acknowledgement for an existing account, an unknown account, or a provider response that could disclose account existence: "Se existir uma conta para este e-mail, enviaremos as instruções."
6. A non-identifying operational failure is logged server-side without email addresses, tokens, or provider payloads.

### Verifying the email link

1. The user opens the TokenHash link.
2. `/auth/confirm` accepts `type=recovery` and calls `verifyOtp` with the token hash.
3. Supabase writes the resulting recovery session through the existing SSR cookie adapter.
4. Successful verification redirects to `/update-password`.
5. Invalid, expired, reused, or malformed links redirect to the forgot-password page with a safe error code.

### Updating the password

1. The user submits the new password and confirmation.
2. The action rejects mismatched or policy-invalid values before calling Supabase.
3. The action validates the server-side identity with the cookie-aware Supabase client.
4. The service calls `updateUser({ password })`.
5. After the password update succeeds, it calls `signOut({ scope: "global" })` to revoke refresh tokens for all sessions.
6. The local session is cleared and the user is redirected to `/login?status=password_updated`.
7. The user must authenticate with the new password.

The password update is a committed operation once `updateUser` succeeds. A later sign-out failure must never be presented as if the password update itself failed or invite the user to repeat it blindly.

## Password Policy

Application schemas and form hints must match the current Supabase Auth configuration:

- Minimum 10 characters.
- Maximum 72 characters in the application.
- At least one letter and one digit.
- New password and confirmation must match.

The existing registration schema, input constraints, and weak-password message currently describe an eight-character minimum. They are corrected as a targeted part of this work so signup and recovery do not enforce contradictory policies.

## Security Properties and Limitations

- No service-role or secret key is introduced.
- Recovery requests do not disclose account existence.
- Tokens and provider error details do not reach UI state or logs.
- OTP type handling is allow-listed.
- Redirect destinations are fixed by the application.
- Password mutation requires a server-observed authenticated session.
- Supabase's `secure_password_change` setting remains enabled.
- Existing email OTP expiry and resend-frequency controls remain authoritative.

Global sign-out invalidates refresh tokens but does not retroactively erase already-issued JWT access tokens. With the current `jwt_expiry = 3600`, another device can retain an access token for up to one hour. Strict immediate invalidation would require short-lived tokens and/or checking `session_id` against active sessions for sensitive requests. That is a separate security-hardening feature.

## Error and Partial-Failure Handling

### Recovery request

- Invalid email: show a validation error.
- Existing or unknown account: show the same acknowledgement.
- Rate limit or delivery response that could reveal existence: show the same acknowledgement.
- Unexpected operational exception: show a generic availability error only when it can be presented independently of account existence; log a sanitized server-side event.

### Recovery callback

- Missing or malformed parameters: safe failure redirect.
- Unsupported OTP type: safe failure redirect.
- Expired, reused, or rejected token: safe failure redirect.
- Client construction or network exception: safe failure redirect.

### Password update

- Invalid or mismatched password: remain on the form with a specific validation message.
- Missing or invalid session: redirect to the recovery request page.
- `updateUser` failure: remain on the form with a generic update failure.
- Password updated and global sign-out successful: redirect to login with success status.
- Password updated but global sign-out failed: attempt local sign-out, emit a sanitized security event, and redirect to login with a warning that other sessions might not have been ended. Do not claim complete revocation.

## Testing Strategy

Implementation follows TDD. Tests use mocked Supabase boundaries for deterministic unit behavior and preserve the existing Vitest conventions.

### Schema tests

- Accept a valid email and reject malformed input.
- Accept passwords that meet the configured policy.
- Reject passwords below 10 characters, without a letter, without a digit, above 72 characters, or different from confirmation.
- Confirm the registration schema uses the same rules.

### Request action and service tests

- Invalid input does not create or call a Supabase client.
- A valid request uses the expected fixed callback URL.
- Existing and unknown-account outcomes produce the same public state.
- Provider and thrown failures do not expose provider details.

### Callback tests

- Existing email-confirmation behavior remains unchanged.
- A valid recovery token verifies with `type: "recovery"` and redirects to `/update-password`.
- Invalid, missing, expired, and unsupported recovery inputs use safe failure redirects.
- No caller-controlled redirect destination is honored.

### Update action and service tests

- Invalid fields do not call Supabase.
- A missing valid session prevents password mutation.
- A valid password calls `updateUser` exactly once.
- Successful update calls global sign-out and redirects to login.
- Update failure does not call sign-out.
- Sign-out failure after a successful update is represented as partial success and attempts local cleanup.

### Page tests

- Login exposes the forgot-password link.
- Forgot-password renders validation, acknowledgement, and safe error states.
- Update-password renders both password fields and its action states.

### Verification

- Run the focused Vitest tests during development.
- Run the complete test suite, TypeScript check, targeted ESLint, and Prettier check before handoff.
- Start the local Supabase stack and verify the captured recovery email and full browser flow through Mailpit when the local services are available.

## Acceptance Criteria

- A user can request password recovery without the response revealing account existence.
- A valid recovery email establishes a server-side Supabase session and reaches the new-password form.
- Invalid or expired links fail safely and can be requested again.
- Password policy is consistent across Supabase config, registration, and recovery.
- A successful update revokes refresh tokens globally, clears the current session, and requires login with the new password.
- Partial session-revocation failure is not falsely reported as full success.
- Existing signup confirmation, login, registration, and logout tests continue to pass.
