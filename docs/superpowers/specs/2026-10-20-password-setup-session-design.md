# Password Setup Session Confinement

## Status

Approved in conversation on 2026-10-20.

## Problem

`/auth/confirm` verifies a recovery or invite token with `verifyOtp` and stores a real Supabase session before a new password exists. Supabase records that login in the signed `amr` claim as `recovery` or `invite`.

When the account has a verified authenticator, that session is `aal1`. `updateUser({ password })` then returns `401 insufficient_aal` and the password stays unchanged. The application keeps the session and tells the person to request another link. `/forgot-password` is a guest-only route, so the proxy sends any session to `/auth/continue`, then to `/admin`, then to the authenticator challenge. Confirming that code opens the admin panel without a password login.

## Decision

A session whose `amr` contains `recovery` or `invite` is a password-setup session until the password is saved and the existing success path signs out. The client cannot remove `amr` without invalidating the token. `aal2` does not remove the restriction: confirming the authenticator allows the password change and still does not open the product.

Invite uses the same confinement. Both flows authenticate before a password exists.

No production session is revoked as an operational step. After deployment, an existing password-setup token is confined by the same `amr` check.

## Session classification

`passwordSetupFlow` reads `amr` entries as strings or `{ method }` objects.

- `invite` wins when both methods are present.
- `recovery` is the other password-setup flow.
- Any other claim, including a missing `amr`, is a normal session.

## Request confinement

The session proxy allows a password-setup session only on `/update-password` and `/auth/confirm`. Every other path redirects to `/update-password`, with `?flow=invite` for an invite session. Refreshed auth cookies are copied onto that redirect.

This check runs before the guest-only redirect. A password-setup session that opens `/forgot-password`, `/login`, `/admin`, or `/auth/continue` returns to the password page.

`/auth/continue` also resolves a password-setup session to that same password path before any admin or client destination.

`requireUser` and `requireAdminIdentity` reject a password-setup session with `PasswordSetupRequiredError`, a subclass of `AuthRequiredError`, before role or eligibility lookups. Existing callers already treat `AuthRequiredError` as unauthenticated: pages send the browser to `/login`, and APIs return 401. The proxy then sends the still-present password-setup session back to `/update-password`.

## Password page

The page asks for a verified authenticator code when the session is not yet `aal2` and a verified TOTP factor exists. The code is confirmed in the browser and the page refreshes in place. It does not navigate to `/admin`.

The password form is shown when there is no session, when there is no verified factor, or when the session is already `aal2`. Saving still uses the current service: success signs out globally and returns to login.

`insufficient_aal` stays on the page as a request to confirm the authenticator. Other update failures stay on the page. They do not send the person to `/forgot-password` while the session exists.

Leaving the attempt signs out only the local session, then opens `/forgot-password` or `/login`. If that local sign-out fails, the page stays on `/update-password`.

## Out of scope

- Revoking sessions that already exist in production.
- A password-change screen for an ordinary signed-in account.
- Changes to Supabase `secure_password_change` or to the recovery email template.

## Tests

- `amr` classification for strings, objects, invite precedence, and unrelated methods.
- Proxy allowlist, invite query, guest-route isolation, and preserved cookies.
- Authenticated-home and auth guards reject password-setup sessions before other lookups.
- Password update maps `insufficient_aal` without signing out.
- The password page shows the authenticator step, and leaving signs out locally before the next public page.
