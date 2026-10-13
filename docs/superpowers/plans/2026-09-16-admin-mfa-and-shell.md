# Admin MFA and Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete, secure entry path for the single Supabase-provisioned Lucrivo administrator: invitation completion, direct `/admin` routing, mandatory TOTP, and a minimal protected admin shell.

**Architecture:** A fixed server-side continuation route resolves authenticated users to `/admin` or `/dashboard`. The existing singleton UUID remains the only role source; a role-only guard admits the administrator into the MFA setup/challenge boundary, while `requireAdmin()` continues to protect privileged content with `aal2`. Browser-bound Supabase MFA APIs handle TOTP secrets only in memory, and route-group layouts keep MFA entry outside the protected admin shell.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase Auth/PostgREST, `@supabase/ssr`, `@supabase/supabase-js`, Vitest 4, Testing Library, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-mfa-and-shell-design.md`

## Global Constraints

- Never add an application route, form, action, or RPC that assigns or promotes an administrator.
- Continue to authorize by the UUID in `private.app_administrator`; never use email, metadata, an environment variable, or MFA enrollment as the role source.
- Verify the role before calling `auth.mfa.listFactors()` so regular users cannot discover factor state through this flow.
- Require both the singleton match and `aal2` on every protected admin server boundary. Navigation visibility is not authorization.
- Keep the continuation route closed: it accepts no `next`, callback, or arbitrary redirect target.
- Never log or persist a TOTP secret, QR payload, challenge code, access token, refresh token, or JWT.
- Keep QR and secret state in the setup component only. Do not put either value in a URL, Server Action, server component prop, analytics event, or storage API.
- Only remove an unverified TOTP factor whose `friendly_name` is exactly `Lucrivo Admin`; never remove a verified factor from the application.
- Keep phone MFA disabled.
- Make `/admin`, `/admin/users`, and `/admin/subscriptions` honest structural placeholders only; do not add fake metrics, tables, charts, filters, or invented data.
- Do not read or modify `.env.local`.
- Follow TDD for every task: run the focused test and observe the expected failure before implementing.

---

### Task 1: Fixed authenticated destination resolver

**Files:**

- Create: `src/modules/auth/services/resolve-authenticated-home.ts`
- Create: `src/modules/auth/services/resolve-authenticated-home.test.ts`
- Create: `src/app/auth/continue/route.ts`
- Create: `src/app/auth/continue/route.test.ts`

**Contract:**

- Missing or unusable verified claims resolve to `/login`.
- A literal `true` from `current_user_is_admin` resolves to `/admin`.
- A literal `false`, an RPC error, an unexpected value, or a thrown RPC call resolves to `/dashboard`.
- `/auth/continue` ignores all query-string redirect attempts and returns only one of those fixed destinations.

- [ ] **Step 1: Write the failing resolver tests**

Create tests with the request-scoped client mocked at the module boundary:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims, rpc } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { resolveAuthenticatedHome } from "./resolve-authenticated-home";

describe("resolveAuthenticatedHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { getClaims }, rpc });
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });
  });

  it("resolves the configured administrator to /admin", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(resolveAuthenticatedHome()).resolves.toBe("/admin");
  });

  it("resolves a regular user to /dashboard", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it.each([
    { data: null, error: { message: "unavailable" } },
    { data: "true", error: null },
    { data: null, error: null },
  ])("falls back to /dashboard for an unusable role result", async (result) => {
    rpc.mockResolvedValue(result);
    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it("falls back to /dashboard when the role RPC throws", async () => {
    rpc.mockRejectedValue(new Error("unavailable"));
    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it("resolves unusable claims to /login without calling the RPC", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
    await expect(resolveAuthenticatedHome()).resolves.toBe("/login");
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the resolver tests and verify the missing-module failure**

Run: `pnpm test -- src/modules/auth/services/resolve-authenticated-home.test.ts`

Expected: FAIL because `resolve-authenticated-home.ts` does not exist.

- [ ] **Step 3: Implement the closed resolver**

```ts
import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type AuthenticatedHome = "/login" | "/dashboard" | "/admin";

async function resolveAuthenticatedHome(): Promise<AuthenticatedHome> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;

  if (claimsError || typeof subject !== "string" || subject.length === 0) {
    return "/login";
  }

  try {
    const { data, error } = await supabase.rpc("current_user_is_admin");
    return !error && data === true ? "/admin" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export { resolveAuthenticatedHome, type AuthenticatedHome };
```

- [ ] **Step 4: Add failing continuation-route tests**

Test `/auth/continue?next=https://attacker.example` with the resolver returning `/admin`, assert the `Location` is exactly `http://localhost:3000/admin`, and cover `/login` and `/dashboard` in the same table-driven test. Mock only `resolveAuthenticatedHome`.

- [ ] **Step 5: Implement the fixed continuation route**

```ts
import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthenticatedHome } from "@/modules/auth/services/resolve-authenticated-home";

export async function GET(request: NextRequest) {
  const destination = await resolveAuthenticatedHome();
  return NextResponse.redirect(new URL(destination, request.url));
}
```

- [ ] **Step 6: Run focused tests**

Run: `pnpm test -- src/modules/auth/services/resolve-authenticated-home.test.ts src/app/auth/continue/route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/auth/services/resolve-authenticated-home.ts src/modules/auth/services/resolve-authenticated-home.test.ts src/app/auth/continue/route.ts src/app/auth/continue/route.test.ts
git commit -m "feat: resolve authenticated home securely"
```

---

### Task 2: Route successful authentication through the continuation endpoint

**Files:**

- Modify: `src/modules/auth/actions/login.action.ts`
- Modify: `src/modules/auth/actions/login.action.test.ts`
- Modify: `src/modules/auth/actions/register.action.ts`
- Modify: `src/modules/auth/actions/register.action.test.ts`
- Modify: `src/app/auth/confirm/route.ts`
- Modify: `src/app/auth/confirm/route.test.ts`
- Modify: `src/infrastructure/auth/supabase/update-session.ts`
- Modify: `src/infrastructure/auth/supabase/update-session.test.ts`

- [ ] **Step 1: Tighten the failing redirect assertions**

Add these expectations to the existing successful paths:

```ts
expect(redirect).toHaveBeenCalledWith("/auth/continue");
```

For email confirmation, change the expected `Location` to:

```ts
expect(response.headers.get("location")).toBe(
  "http://localhost:3000/auth/continue",
);
```

For an authenticated visitor to `/login`, `/register`, or `/forgot-password`, expect `/auth/continue` instead of `/dashboard`. Preserve the renewed-cookie assertion.

- [ ] **Step 2: Run the existing focused suites and verify the assertions fail**

Run: `pnpm test -- src/modules/auth/actions/login.action.test.ts src/modules/auth/actions/register.action.test.ts src/app/auth/confirm/route.test.ts src/infrastructure/auth/supabase/update-session.test.ts`

Expected: FAIL with the old `/dashboard` destinations.

- [ ] **Step 3: Replace only the successful hard-coded destinations**

Use `redirect("/auth/continue")` after password login and immediate-session signup. Set the `email.successPath` entry in `/auth/confirm` to `/auth/continue`. In `updateSession`, set the cloned destination pathname to `/auth/continue` and continue clearing its search string.

Do not call the role RPC from proxy middleware and do not change recovery behavior.

- [ ] **Step 4: Re-run focused tests**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/actions/login.action.ts src/modules/auth/actions/login.action.test.ts src/modules/auth/actions/register.action.ts src/modules/auth/actions/register.action.test.ts src/app/auth/confirm/route.ts src/app/auth/confirm/route.test.ts src/infrastructure/auth/supabase/update-session.ts src/infrastructure/auth/supabase/update-session.test.ts
git commit -m "feat: route authenticated users by role"
```

---

### Task 3: Accept invitation callbacks and complete the initial password flow

**Files:**

- Modify: `src/app/auth/confirm/route.ts`
- Modify: `src/app/auth/confirm/route.test.ts`
- Modify: `src/modules/auth/actions/update-password.action.ts`
- Modify: `src/modules/auth/actions/update-password.action.test.ts`
- Modify: `src/components/update-password/update-password-form.tsx`
- Modify: `src/components/update-password/update-password-form.test.tsx`
- Modify: `src/app/(public)/update-password/page.tsx`
- Modify: `src/app/(public)/login/page.tsx`
- Modify: `src/app/(public)/login/page.test.tsx`
- Modify: `src/components/login/login-form.tsx`
- Modify: `src/components/login/login-form.test.tsx`
- Create: `supabase/templates/invite.html`
- Modify: `supabase/config.toml`

**Flow values:** `recovery` is the safe default; only the literal `invite` selects invitation copy and destinations.

- [ ] **Step 1: Add failing invitation callback tests**

Add tests proving:

```ts
expect(verifyOtp).toHaveBeenCalledWith({
  token_hash: "invite-token",
  type: "invite",
});
expect(response.headers.get("location")).toBe(
  "http://localhost:3000/update-password?flow=invite",
);
```

An absent, expired, or rejected invite token must resolve to `/login?error=invalid_or_expired_invite`, and the location must not contain the token.

- [ ] **Step 2: Extend the closed OTP flow table**

Add exactly this entry and supported type:

```ts
invite: {
  successPath: "/update-password",
  successQuery: { flow: "invite" },
  failurePath: "/login",
  failureCode: "invalid_or_expired_invite",
},
```

Extend `safeRedirect` to accept a small `Record<string, string>` query object created by the local flow table. Do not forward request query parameters.

- [ ] **Step 3: Add failing action tests for invitation-specific destinations**

Extend the form-data helper with `flow = "recovery"`, set it as a hidden field, and assert:

```ts
formData.set("flow", "invite");

// Complete update
expect(redirect).toHaveBeenCalledWith("/login?status=invite_accepted");

// Invalid temporary session
expect(redirect).toHaveBeenCalledWith("/login?error=invalid_or_expired_invite");

// Revocation warning
expect(redirect).toHaveBeenCalledWith(
  "/login?status=invite_accepted&warning=sessions_not_revoked",
);
```

Also prove an unknown `flow` value retains recovery destinations.

- [ ] **Step 4: Implement the narrow flow parser and destinations**

```ts
type PasswordFlow = "recovery" | "invite";

function passwordFlow(value: FormDataEntryValue | null): PasswordFlow {
  return value === "invite" ? "invite" : "recovery";
}
```

Read it before calling `updatePassword`. Keep password validation and the update service unchanged. Derive only these redirect values:

```ts
const invalidSessionPath =
  flow === "invite"
    ? "/login?error=invalid_or_expired_invite"
    : "/forgot-password?error=invalid_or_expired_link";
const successStatus =
  flow === "invite" ? "invite_accepted" : "password_updated";
```

- [ ] **Step 5: Add failing form/page tests for invitation copy**

Render `UpdatePasswordForm` with `flow="invite"` and assert the title `Crie sua senha`, the button `Criar senha`, a hidden input `flow=invite`, and a `Voltar ao login` link. Render recovery without a flow and preserve the current copy and recovery link.

Test the page with `searchParams: Promise.resolve({ flow: "invite" })`; an unknown value must pass `recovery`.

- [ ] **Step 6: Implement flow-aware presentation without duplicating the form**

Give `UpdatePasswordForm` a `flow?: PasswordFlow` prop that defaults to `recovery`, render `<input type="hidden" name="flow" value={flow} />`, and select copy from a constant object. In the page, await Next.js 16 search params:

```ts
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const { flow } = await searchParams;
  const safeFlow = flow === "invite" ? "invite" : "recovery";

  return (
    <AuthPage>
      <UpdatePasswordForm action={submitPasswordUpdate} flow={safeFlow} />
    </AuthPage>
  );
}
```

- [ ] **Step 7: Display safe completion feedback on login**

Make the login page accept `searchParams`, mapping only `invite_accepted` and `password_updated` to fixed Portuguese success messages. Pass a `notice?: string` prop to `LoginForm` and render it with `<AuthFeedback variant="success">`. Do not echo query values. Keep warnings generic and do not expose session details.

- [ ] **Step 8: Add the local invitation template and configuration**

Create `supabase/templates/invite.html` using the same complete document/table structure and inline styling as the existing confirmation template. Use invitation-specific Portuguese copy and this exact safe link:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite"
>
  Aceitar convite
</a>
```

Register it beside the existing templates:

```toml
[auth.email.template.invite]
subject = "Você foi convidado para o Lucrivo"
content_path = "./supabase/templates/invite.html"
```

- [ ] **Step 9: Run focused tests and formatting check**

Run:

```bash
pnpm test -- src/app/auth/confirm/route.test.ts src/modules/auth/actions/update-password.action.test.ts src/components/update-password/update-password-form.test.tsx src/app/\(public\)/login/page.test.tsx src/components/login/login-form.test.tsx
pnpm exec prettier --check supabase/templates/invite.html supabase/config.toml
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/auth/confirm/route.ts src/app/auth/confirm/route.test.ts src/modules/auth/actions/update-password.action.ts src/modules/auth/actions/update-password.action.test.ts src/components/update-password/update-password-form.tsx src/components/update-password/update-password-form.test.tsx src/app/'(public)'/update-password/page.tsx src/app/'(public)'/login/page.tsx src/app/'(public)'/login/page.test.tsx src/components/login/login-form.tsx src/components/login/login-form.test.tsx supabase/templates/invite.html supabase/config.toml
git commit -m "feat: complete invited admin onboarding"
```

---

### Task 4: Split admin identity from MFA and resolve the closed access state

**Files:**

- Modify: `src/modules/auth/services/require-admin.ts`
- Modify: `src/modules/auth/services/require-admin.test.ts`
- Create: `src/modules/auth/services/resolve-admin-access-state.ts`
- Create: `src/modules/auth/services/resolve-admin-access-state.test.ts`

**Interfaces:**

```ts
type AdminIdentity = {
  userId: string;
  aal: unknown;
  email: string;
  supabase: SupabaseClient<Database>;
};

type AdminAccessState =
  | { status: "setup"; identity: AdminIdentity }
  | { status: "challenge"; identity: AdminIdentity; factorId: string }
  | { status: "authorized"; identity: AdminIdentity }
  | { status: "unavailable"; identity: AdminIdentity };
```

- [ ] **Step 1: Add failing guard tests for the two levels**

Keep all existing fail-closed claim and RPC cases. Change the `aal1` test to expect `requireAdminIdentity()` to resolve. Verify `requireAdmin()` rejects the same identity with `AdminMfaRequiredError`. Verify the identity result contains only sanitized claims needed by the server:

```ts
await expect(requireAdminIdentity()).resolves.toMatchObject({
  userId: "admin-123",
  aal: "aal1",
  email: "admin@example.com",
  supabase,
});
```

Do not include the full JWT claims object in the return value.

- [ ] **Step 2: Refactor the guard without weakening strict callers**

Implement `requireAdminIdentity()` from the current claims/RPC body. Normalize a missing/non-string email to `Sua conta`. Implement `requireAdmin()` as:

```ts
async function requireAdmin() {
  const { userId, aal, supabase } = await requireAdminIdentity();

  if (aal !== "aal2") throw new AdminMfaRequiredError();

  return { userId, supabase };
}
```

Export the new function and type. Keep error names/messages stable.

- [ ] **Step 3: Add failing access-state tests**

Mock `requireAdminIdentity` and `listFactors`. Cover all branches:

- it does not call `listFactors` when identity checking throws;
- list failure, thrown call, missing `totp`, or malformed data returns `unavailable`;
- no verified TOTP factor returns `setup` even when unverified factors exist;
- a verified factor plus `aal1` returns `challenge` with that factor ID;
- a verified factor plus `aal2` returns `authorized`;
- it never selects an unverified factor for a challenge.

Use representative data:

```ts
listFactors.mockResolvedValue({
  data: {
    all: [],
    phone: [],
    totp: [
      {
        id: "factor-1",
        factor_type: "totp",
        status: "verified",
        friendly_name: "Lucrivo Admin",
      },
    ],
  },
  error: null,
});
```

- [ ] **Step 4: Implement the fail-closed state resolver**

```ts
import "server-only";

import {
  requireAdminIdentity,
  type AdminIdentity,
} from "@/modules/auth/services/require-admin";

type AdminAccessState =
  | { status: "setup"; identity: AdminIdentity }
  | { status: "challenge"; identity: AdminIdentity; factorId: string }
  | { status: "authorized"; identity: AdminIdentity }
  | { status: "unavailable"; identity: AdminIdentity };

async function resolveAdminAccessState(): Promise<AdminAccessState> {
  const identity = await requireAdminIdentity();

  try {
    const { data, error } = await identity.supabase.auth.mfa.listFactors();
    if (error || !Array.isArray(data?.totp)) {
      return { status: "unavailable", identity };
    }

    const verified = data.totp.find(
      (factor) => factor.status === "verified" && factor.id.length > 0,
    );
    if (!verified) return { status: "setup", identity };
    if (identity.aal === "aal2") return { status: "authorized", identity };

    return { status: "challenge", identity, factorId: verified.id };
  } catch {
    return { status: "unavailable", identity };
  }
}

export { resolveAdminAccessState, type AdminAccessState };
```

- [ ] **Step 5: Run focused tests**

Run: `pnpm test -- src/modules/auth/services/require-admin.test.ts src/modules/auth/services/resolve-admin-access-state.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/services/require-admin.ts src/modules/auth/services/require-admin.test.ts src/modules/auth/services/resolve-admin-access-state.ts src/modules/auth/services/resolve-admin-access-state.test.ts
git commit -m "feat: resolve admin mfa access state"
```

---

### Task 5: Enable local TOTP and build the explicit setup component

**Files:**

- Modify: `supabase/config.toml`
- Create: `src/modules/auth/components/admin-mfa-frame.tsx`
- Create: `src/modules/auth/components/admin-mfa-setup.tsx`
- Create: `src/modules/auth/components/admin-mfa-setup.test.tsx`

- [ ] **Step 1: Enable only authenticator-app MFA locally**

Change:

```toml
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

Leave `[auth.mfa.phone]` enrollment and verification false.

- [ ] **Step 2: Add failing setup interaction tests**

Mock the browser `createClient` and `next/navigation`. Prove:

- render does not call `enroll`;
- `Configurar aplicativo` first lists factors;
- only unverified `Lucrivo Admin` TOTP factors are passed to `unenroll`;
- verified, differently named, and phone factors are never removed;
- enrollment calls `enroll({ factorType: "totp", friendlyName: "Lucrivo Admin" })`;
- returned QR and manual secret are rendered only after enrollment;
- the code is normalized to six digits;
- activation calls `challengeAndVerify({ factorId, code })`;
- success calls `router.replace("/admin")` and `router.refresh()`;
- API errors produce fixed Portuguese feedback and never render provider messages;
- copy uses `navigator.clipboard.writeText(secret)` and exposes a text success/failure status.

Representative enrollment mock:

```ts
enroll.mockResolvedValue({
  data: {
    id: "new-factor",
    type: "totp",
    totp: {
      qr_code: "data:image/svg+xml;base64,PHN2Zy8+",
      secret: "SECRET123",
      uri: "otpauth://totp/Lucrivo",
    },
  },
  error: null,
});
```

- [ ] **Step 3: Create the minimal reusable MFA frame**

`AdminMfaFrame` renders a centered semantic `<main>`, the Lucrivo logo, a card with title/subtitle, children, a `/dashboard` link labelled `Ir para a área financeira`, and a form bound to the existing `logout` action. Keep it a server-compatible presentational component; do not include QR state in it.

- [ ] **Step 4: Implement explicit setup state**

Use this state boundary:

```ts
type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

const friendlyName = "Lucrivo Admin";
```

On the start button:

1. call `listFactors()`;
2. fail generically if it errors or `data.all` is malformed;
3. sequentially `unenroll` only matching `factor_type === "totp"`, `status === "unverified"`, and exact friendly name;
4. call `enroll`;
5. validate non-empty `id`, `totp.qr_code`, and `totp.secret` before setting component state.

Use `next/image` with `unoptimized`, fixed dimensions, and alt `QR Code para configurar o autenticador`. Render the secret as text with an explicit copy button. Never call `console.*`.

Normalize input with:

```ts
const normalized = event.target.value.replace(/\D/g, "").slice(0, 6);
```

Disable start/activation while pending and require six digits before `challengeAndVerify`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
pnpm test -- src/modules/auth/components/admin-mfa-setup.test.tsx
pnpm typecheck
```

Expected: PASS. If installed Supabase types differ from a mocked factor shape, adapt property access to the installed `@supabase/supabase-js` declarations without widening to `any`.

- [ ] **Step 6: Commit**

```bash
git add supabase/config.toml src/modules/auth/components/admin-mfa-frame.tsx src/modules/auth/components/admin-mfa-setup.tsx src/modules/auth/components/admin-mfa-setup.test.tsx
git commit -m "feat: add admin totp setup"
```

---

### Task 6: Build the existing-factor TOTP challenge

**Files:**

- Create: `src/modules/auth/components/admin-mfa-challenge.tsx`
- Create: `src/modules/auth/components/admin-mfa-challenge.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Render with `factorId="verified-factor"`. Assert numeric input semantics, `autoComplete="one-time-code"`, `inputMode="numeric"`, `maxLength={6}`, non-digit stripping, and disabled submit before six digits. Assert:

```ts
expect(challengeAndVerify).toHaveBeenCalledWith({
  factorId: "verified-factor",
  code: "123456",
});
```

On success, assert `replace("/admin")` and `refresh()`. On returned or thrown failure, keep the code input available and render `Não foi possível confirmar o código. Verifique e tente novamente.` without the provider message.

- [ ] **Step 2: Run and verify the missing component failure**

Run: `pnpm test -- src/modules/auth/components/admin-mfa-challenge.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement the small client component**

Use the same code normalization and pending/error conventions as setup. Accept only `factorId: string`; do not list factors again in the browser. Render it inside `AdminMfaFrame` from the server route rather than importing the server logout action into this client module.

- [ ] **Step 4: Re-run the focused test**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/components/admin-mfa-challenge.tsx src/modules/auth/components/admin-mfa-challenge.test.tsx
git commit -m "feat: add admin totp challenge"
```

---

### Task 7: Add the admin entry routes and fail-closed server boundaries

**Files:**

- Create: `src/modules/auth/services/map-admin-route-state.ts`
- Create: `src/modules/auth/services/map-admin-route-state.test.ts`
- Create: `src/components/admin/admin-access-unavailable.tsx`
- Create: `src/app/(admin-mfa)/admin/mfa/setup/page.tsx`
- Create: `src/app/(admin-mfa)/admin/mfa/setup/page.test.tsx`
- Create: `src/app/(admin-mfa)/admin/mfa/challenge/page.tsx`
- Create: `src/app/(admin-mfa)/admin/mfa/challenge/page.test.tsx`
- Create: `src/app/(admin-panel)/admin/layout.tsx`
- Create: `src/app/(admin-panel)/admin/layout.test.tsx`

**Route behavior:**

| State           | `/admin/mfa/setup` | `/admin/mfa/challenge` | protected admin layout     |
| --------------- | ------------------ | ---------------------- | -------------------------- |
| `setup`         | render setup       | redirect setup         | redirect setup             |
| `challenge`     | redirect challenge | render challenge       | redirect challenge         |
| `authorized`    | redirect `/admin`  | redirect `/admin`      | render children            |
| `unavailable`   | retry surface      | retry surface          | retry surface, no children |
| unauthenticated | redirect `/login`  | redirect `/login`      | redirect `/login`          |
| non-admin       | `notFound()`       | `notFound()`           | `notFound()`               |

- [ ] **Step 1: Write failing route-state mapping tests**

Keep framework effects in one server-only helper so every route uses the same mapping. Mock `resolveAdminAccessState`, `redirect`, and `notFound`; assert `AuthRequiredError` maps to `/login`, `AdminRequiredError` maps to not-found, and unexpected errors are rethrown. The helper must return the closed state on success.

- [ ] **Step 2: Implement the shared route-state mapper**

```ts
import "server-only";

import { notFound, redirect } from "next/navigation";

import { AuthRequiredError } from "@/modules/auth/services/require-user";
import { AdminRequiredError } from "@/modules/auth/services/require-admin";
import { resolveAdminAccessState } from "@/modules/auth/services/resolve-admin-access-state";

async function getAdminRouteState() {
  try {
    return await resolveAdminAccessState();
  } catch (error) {
    if (error instanceof AuthRequiredError) redirect("/login");
    if (error instanceof AdminRequiredError) notFound();
    throw error;
  }
}

export { getAdminRouteState };
```

- [ ] **Step 3: Implement MFA route pages with exhaustive state switches**

Each page calls `getAdminRouteState()` once. The setup page renders `<AdminMfaFrame><AdminMfaSetup /></AdminMfaFrame>` only for `setup`. The challenge page renders `<AdminMfaFrame><AdminMfaChallenge factorId={state.factorId} /></AdminMfaFrame>` only for `challenge`. Use `redirect` for the other known destinations and render `AdminAccessUnavailable` for `unavailable`.

- [ ] **Step 4: Test every MFA page state**

Mock `getAdminRouteState`, `redirect`, and the client components. For both pages, cover all four resolved states from the behavior table. Assert the challenge component receives only the selected verified `factorId`; assert unavailable never renders setup or challenge content. These tests must run before proceeding to the protected layout.

- [ ] **Step 5: Write failing protected-layout tests**

Mock the mapper and assert:

- setup/challenge redirect to their exact routes;
- unavailable renders retry UI and never renders a secret child marker;
- authorized renders the child marker;
- authorized calls `requireAdmin()` before rendering;
- `AdminMfaRequiredError` from the strict guard redirects back to `/admin/mfa/challenge` (the session may have changed between the state read and strict check).

- [ ] **Step 6: Implement the protected layout gateway**

For an `authorized` state, call `requireAdmin()` immediately before rendering content. Use the email already sanitized in `state.identity`. Catch only `AdminMfaRequiredError` from that final time-of-check guard and redirect to the challenge. Render no children for `unavailable`.

At this task, return a plain wrapper around authorized children; Task 8 replaces it with the shared shell.

- [ ] **Step 7: Implement retry UI**

`AdminAccessUnavailable` is a tiny client component with heading `Não foi possível verificar o acesso`, generic text, a button that calls `router.refresh()`, and a link to `/dashboard`. Accept the existing server `logout` action as a prop for a sign-out form when rendered outside `AdminMfaFrame`. Do not suggest enrolling again and do not show raw errors.

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm test -- src/modules/auth/services/map-admin-route-state.test.ts src/app/\(admin-mfa\)/admin/mfa/setup/page.test.tsx src/app/\(admin-mfa\)/admin/mfa/challenge/page.test.tsx src/app/\(admin-panel\)/admin/layout.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/modules/auth/services/map-admin-route-state.ts src/modules/auth/services/map-admin-route-state.test.ts src/components/admin/admin-access-unavailable.tsx src/app/'(admin-mfa)'/admin/mfa/setup/page.tsx src/app/'(admin-mfa)'/admin/mfa/setup/page.test.tsx src/app/'(admin-mfa)'/admin/mfa/challenge/page.tsx src/app/'(admin-mfa)'/admin/mfa/challenge/page.test.tsx src/app/'(admin-panel)'/admin/layout.tsx src/app/'(admin-panel)'/admin/layout.test.tsx
git commit -m "feat: protect admin entry routes"
```

---

### Task 8: Reuse the application shell and add minimal admin destinations

**Files:**

- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/app-shell.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`
- Modify: `src/app/(private)/layout.tsx`
- Modify: `src/app/(admin-panel)/admin/layout.tsx`
- Create: `src/app/(admin-panel)/admin/page.tsx`
- Create: `src/app/(admin-panel)/admin/users/page.tsx`
- Create: `src/app/(admin-panel)/admin/subscriptions/page.tsx`
- Create: `src/app/(admin-panel)/admin/pages.test.tsx`

- [ ] **Step 1: Add failing sidebar variant tests**

Keep every current financial-sidebar assertion. Add `render(<AppSidebar variant="admin" />)` and assert these exact links:

```ts
[
  ["Dashboard", "/admin"],
  ["Usuários", "/admin/users"],
  ["Assinaturas", "/admin/subscriptions"],
  ["Área financeira", "/dashboard"],
];
```

With pathname `/admin/users`, only `Usuários` is active. Avoid the prefix trap where `/admin` would otherwise remain active for every nested page: make the admin dashboard item exact-match while the other items accept nested paths.

- [ ] **Step 2: Refactor navigation behind one narrow variant prop**

Use:

```ts
type AppSidebarVariant = "financial" | "admin";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};
```

Keep the existing financial array unchanged. Add the three admin primary items and render `Área financeira` in a visually separated secondary group. Set the logo destination and subtitle from the variant (`/admin` + `Administração` for admin; current values for financial). Default the prop to `financial` to avoid churn in existing callers.

- [ ] **Step 3: Add failing reusable-shell tests**

Mock `AppSidebar`, `AccountMenu`, and sidebar primitives. Assert variant, email, context title/subtitle, children, trigger label, and existing logout action wiring reach the proper children.

- [ ] **Step 4: Extract the current shell without redesigning it**

Move the existing `SidebarProvider`, header, trigger, account menu, and content wrapper into:

```ts
type AppShellProps = {
  children: React.ReactNode;
  email: string;
  sidebarVariant: AppSidebarVariant;
  contextTitle: string;
  contextDescription: string;
};
```

`AppShell` imports the existing `logout` action and renders the unchanged structure/classes. Replace the private layout markup with:

```tsx
<AppShell
  email={email}
  sidebarVariant="financial"
  contextTitle="Área financeira"
  contextDescription="Acompanhe e organize suas decisões em um só lugar."
>
  {children}
</AppShell>
```

- [ ] **Step 5: Wrap the authorized admin branch**

After the state resolver and final `requireAdmin()` check succeed, render:

```tsx
<AppShell
  email={state.identity.email}
  sidebarVariant="admin"
  contextTitle="Administração"
  contextDescription="Acompanhe o funcionamento do Lucrivo."
>
  {children}
</AppShell>
```

- [ ] **Step 6: Add failing semantic page tests**

Assert the three pages expose one heading each and the exact future-scope message. Assert there are no tables or fake metric text.

- [ ] **Step 7: Create disposable structural pages**

Use one shared, simple markup vocabulary and only this content:

- `/admin`: heading `Dashboard`; text `A visão operacional do sistema será construída aqui.`
- `/admin/users`: heading `Usuários`; text `A gestão de usuários será construída aqui.`
- `/admin/subscriptions`: heading `Assinaturas`; text `O acompanhamento de assinaturas será construído aqui.`

Do not create a reusable “coming soon” abstraction for only three lines unless duplication becomes materially larger during implementation.

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm test -- src/components/layout/app-sidebar.test.tsx src/components/layout/app-shell.test.tsx src/app/\(admin-panel\)/admin/layout.test.tsx src/app/\(admin-panel\)/admin/pages.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/app-shell.tsx src/components/layout/app-shell.test.tsx src/components/layout/app-sidebar.tsx src/components/layout/app-sidebar.test.tsx src/app/'(private)'/layout.tsx src/app/'(admin-panel)'/admin/layout.tsx src/app/'(admin-panel)'/admin/page.tsx src/app/'(admin-panel)'/admin/users/page.tsx src/app/'(admin-panel)'/admin/subscriptions/page.tsx src/app/'(admin-panel)'/admin/pages.test.tsx
git commit -m "feat: add minimal admin shell"
```

---

### Task 9: Operational documentation and unauthenticated smoke coverage

**Files:**

- Modify: `docs/operations/admin-access-runbook.md`
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1: Extend the runbook with hosted setup steps**

Add concise sections covering:

1. Enable App Authenticator/TOTP enrollment and verification in the staging Supabase Auth MFA settings; keep phone disabled.
2. Replace the hosted invite email template with the repository template semantics and the exact TokenHash URL `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`.
3. Resend invitations created before the template change if their links use the default fragment flow.
4. Invite the permanent account from Supabase Dashboard, complete the password screen, obtain its UUID, then perform the existing singleton assignment transaction.
5. Verify the sequence: login → `/auth/continue` → `/admin` → setup/challenge → protected shell.
6. Store authenticator recovery procedures outside the application; do not disable `aal2` or add an emergency UI.
7. Never paste QR payloads, TOTP secrets, codes, or tokens into logs/tickets.

Correct the old prerequisite that says the factor must already exist before app access; the new application setup route creates the first verified factor after role assignment.

- [ ] **Step 2: Extend the smoke test**

For an unauthenticated request, add:

```js
const admin = await request(baseUrl, "/admin", timeoutMs);
expectRedirect(admin, "/admin", "/login");
```

This verifies the public deployment boundary without requiring or scripting a real MFA secret.

- [ ] **Step 3: Run documentation formatting and script syntax checks**

Run:

```bash
pnpm exec prettier --check docs/operations/admin-access-runbook.md scripts/smoke-test.mjs
node --check scripts/smoke-test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/operations/admin-access-runbook.md scripts/smoke-test.mjs
git commit -m "docs: document admin mfa operations"
```

---

### Task 10: Full regression and manual local acceptance

**Files:**

- Modify only if a verification failure reveals an in-scope defect.

- [ ] **Step 1: Run the complete automated quality gate**

Run: `pnpm check`

Expected: all Vitest tests, generated Next types, TypeScript, ESLint, and Prettier checks pass.

- [ ] **Step 2: Validate local Supabase configuration**

Run: `pnpm exec supabase start`

Confirm local Auth starts with the invite template and TOTP settings. Do not push configuration to a hosted project from this verification task, change database schema, or create a migration.

- [ ] **Step 3: Perform the manual admin happy path**

With the existing locally assigned admin account:

1. open `/login` and authenticate;
2. confirm the browser passes through `/auth/continue` and reaches `/admin`;
3. confirm the first entry redirects to `/admin/mfa/setup`;
4. click the explicit setup action and scan the QR with an authenticator;
5. verify a six-digit code and confirm replacement to `/admin`;
6. open Dashboard, Usuários, Assinaturas, and Área financeira;
7. sign out, sign back in, and confirm `/admin/mfa/challenge` precedes the shell.

Do not capture the QR, secret, code, cookies, or tokens in screenshots or terminal output.

- [ ] **Step 4: Perform authorization negative checks**

Use a regular local user and verify:

- successful login ends at `/dashboard`;
- direct `/admin`, `/admin/users`, `/admin/subscriptions`, and both MFA URLs never render admin or factor content;
- the regular user cannot create an admin role through any application page.

In a private browser session, confirm `/admin` redirects to `/login`.

- [ ] **Step 5: Inspect the final diff and repository state**

Run:

```bash
git diff --check
git status --short
git log --oneline -10
```

Expected: no whitespace errors; only intentional files remain changed; task commits are visible.

- [ ] **Step 6: Commit any verification-only correction**

If and only if Step 1–5 required an in-scope fix, stage each corrected file by its explicit path and run `git commit -m "fix: complete admin mfa verification"`.

Otherwise, do not create an empty commit.
