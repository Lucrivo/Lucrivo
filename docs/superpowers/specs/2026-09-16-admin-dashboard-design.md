# Admin Dashboard Design

**Date:** 2026-09-16
**Status:** Approved for implementation planning

## 1. Objective

Replace the disposable `/admin` placeholder with a real operational dashboard
for the single Lucrivo administrator. The page must summarize user acquisition,
engagement, free diagnoses, subscriptions, revenue, and cancellations without
inventing data or weakening the existing administrator and MFA boundaries.

The dashboard uses the existing administrative shell and shared KPI card as its
foundation. It adds historical context only where the database can support a
reliable definition, and avoids presenting duplicated metrics as independent
insights.

## 2. Scope

This phase includes:

- new users in the current day, week, and month;
- users active during the trailing 30 days;
- all-time free diagnoses completed;
- subscriptions with current access;
- confirmed cancellations in the current month;
- confirmed monthly revenue;
- current-month cancellation rate;
- revenue history for the current month and previous 11 calendar months;
- new-user history for the current month and previous 5 calendar months;
- the five most recently created subscription contracts;
- accessible metric explanations and chart tooltips;
- loading, empty, unavailable, and responsive states;
- a protected database aggregation boundary and typed server-side view model.

This phase excludes:

- arbitrary date filters or comparison controls;
- downloadable reports or exports;
- real-time subscriptions or client polling;
- fabricated percentage changes where no historical event data exists;
- customer names or commercial plan names not represented in the database;
- subscription management actions from the dashboard;
- a precomputed analytics warehouse, materialized view, or scheduled rollup;
- changes to the existing user and subscription destination pages.

## 3. Metric Definitions

All calendar boundaries use `America/Sao_Paulo`. A calendar week begins on
Monday. Timestamps remain stored and compared as `timestamptz`; timezone
conversion is used only to establish the appropriate calendar boundaries and
labels.

### 3.1 New users

New users are rows in `auth.users` whose `created_at` falls within the current
day, current calendar week, or current calendar month. The three values appear
inside one segmented KPI card so they are understood as different windows of
one measure rather than three unrelated metrics.

The user assigned in `private.app_administrator` is excluded from acquisition
and activity metrics so the dashboard describes product users rather than
administrative access.

The six-month user chart counts registrations per calendar month. It is a trend
view, not a cumulative total.

### 3.2 Active users

An active user has a non-null `last_sign_in_at` within the trailing 30 days from
the database snapshot time, excluding the assigned administrator.

No prior-period percentage is shown. `last_sign_in_at` stores only the most
recent sign-in and cannot reconstruct a trustworthy historical active-user
window after later logins.

### 3.3 Free diagnoses

Free diagnoses are the all-time count of `public.diagnoses` rows where
`is_free_report = true`. The UI explains the all-time scope in supporting copy
and a focusable tooltip.

### 3.4 Active subscriptions

An active subscription is a billing contract whose access interval contains
the snapshot instant and whose status is `active` or `cancel_at_period_end`.
A cancellation scheduled for the end of a paid period therefore remains active
until access actually ends.

### 3.5 Canceled subscriptions

Canceled subscriptions are distinct contracts whose cancellation became
confirmed during the current calendar month. The aggregation uses the
confirmation timestamp when present and the provider cancellation timestamp as
the fallback for provider-originated cancellations.

The absolute count appears only in its KPI card. The detailed cancellation
panel emphasizes the rate and its denominator instead of repeating the count as
a second headline.

### 3.6 Monthly revenue

Monthly revenue is the sum of `value_cents` for payments whose current status
is `confirmed` or `received` and whose effective settlement timestamp falls in
the current calendar month. The effective timestamp is `received_at` when
available and `confirmed_at` otherwise.

Refunded and chargeback payments are excluded because their current ledger
status is no longer confirmed or received. The 12-month chart applies the same
rule to each calendar bucket so the headline and history remain consistent.

### 3.7 Cancellation rate

The current-month cancellation rate is:

`confirmed cancellations during the month / subscriptions active at the start of the month`

The opening base contains contracts whose access interval included the first
instant of the month, even if they were canceled later during that month. If
the opening base is zero, the result is unavailable rather than `0%`; the UI
shows `Sem base suficiente` and explains why.

### 3.8 Recent subscriptions

The recent list contains the five newest billing contracts ordered by
`created_at` and a deterministic identifier tie-breaker. Each entry shows:

- the user's real authentication email, or `E-mail indisponível` when absent;
- monthly or annual billing mode translated to Portuguese;
- creation date in the São Paulo timezone;
- a Portuguese status label with text and color;
- a link to the subscription area only when it points to a functioning route,
  never a decorative action.

The interface does not invent customer names, avatars, or commercial plan
labels.

## 4. Data Architecture and Security

### 4.1 Aggregation function

Add one versioned public RPC that returns a single JSON dashboard snapshot. The
function runs with the minimum privileges required to aggregate `auth.users`
and the billing and diagnosis tables.

Before reading any metric, it must verify the caller through the existing
administrative authorization primitives. Both the administrator singleton and
an `aal2` JWT are mandatory. The function denies anonymous, regular-user,
administrator-at-`aal1`, malformed-claim, and role-check-error cases.

The function uses an explicit empty `search_path`, schema-qualified relations,
stable internal boundaries derived once from the snapshot instant, and fixed
result keys. Execute permission is granted only to `authenticated`; `anon` and
`public` retain no access. The function returns aggregates and the limited
recent-subscription projection, never raw payment-provider payloads or secrets.

### 4.2 Snapshot contract

The returned snapshot contains:

- `generatedAt`;
- a `metrics` object for the six headline KPI groups and cancellation rate;
- `revenueHistory`, with 12 ordered zero-filled calendar buckets;
- `userGrowth`, with 6 ordered zero-filled calendar buckets;
- `recentSubscriptions`, with at most five projected entries.

Missing months are emitted with zero values so chart geometry is stable. A zero
is valid only when the query succeeded and the aggregate is truly empty.

### 4.3 Server service

A server-only admin dashboard service calls the RPC using the request-scoped
Supabase client. It independently invokes the strict admin guard before the
query, validates the RPC payload, and maps database values to a typed view
model. Currency remains integer cents until formatted for the interface.

The page never imports the secret/service-role client. Authorization therefore
does not depend only on the parent layout, and the data operation remains safe
if the service is reused later.

The service owns data normalization and stable domain errors. React components
receive display-ready values and do not interpret raw database statuses.

## 5. Interface Design

### 5.1 Direction

The interface uses a refined operational aesthetic consistent with the Lucrivo
shell: controlled density, strong numerical hierarchy, soft bordered surfaces,
and restrained depth. The existing brand blue is the primary accent. Green and
red are reserved for positive and cancellation semantics, with text and icons
always carrying the same meaning as color.

The dashboard takes inspiration from the supplied reference without copying
its generic greeting, fictitious profile data, or user-facing diagnosis action.
Its distinctive element is a compact operational rhythm: a segmented acquisition
card, carefully proportioned historical panels, and honest explanatory copy.

### 5.2 Page hierarchy

The page begins with `Visão geral`, a concise operational description, and the
snapshot update time. It does not add a `Novo diagnóstico` action because that
task does not belong to the administrative context.

The headline grid contains six cards:

1. new users, segmented into today, week, and month;
2. active users in the trailing 30 days;
3. all-time free diagnoses;
4. active subscriptions;
5. cancellations confirmed this month;
6. revenue confirmed this month.

Below it:

- a wide 12-month revenue line/area chart;
- a narrower cancellation-rate panel;
- a six-month new-user bar chart;
- a recent-subscriptions list/table.

The revenue headline and chart are complementary: one supports rapid scanning
and the other gives historical context. The same applies to the segmented new
user card and six-month acquisition history. The cancellation KPI owns the
absolute amount while the analytical panel owns the rate.

### 5.3 Shared components

Extend the existing `MetricCard` only through general-purpose capabilities that
remain useful outside this dashboard, including optional focusable help content
and a custom compact detail region. Dashboard-specific compositions remain in
the admin module instead of accumulating one-off props in the shared card.

The existing shadcn card, tooltip, table, badge, skeleton, and button primitives
are reused. Add only the shadcn Chart component and its Recharts dependency for
responsive axes, accessible tooltip behavior, and chart composition. Recharts
is infrastructure, not the visual identity: colors, typography, series,
geometry, tooltip content, and layout are authored for Lucrivo.

Fixed periods are rendered as descriptive text, not as dropdown-shaped controls
that do nothing.

### 5.4 Responsive behavior

The page is mobile-first:

- KPI cards render in one column, then two, then three as space permits;
- analytical panels stack before adopting the desktop asymmetric grid;
- charts reserve a stable height and never overflow horizontally;
- the recent-subscriptions table becomes a labeled compact list on narrow
  screens rather than requiring horizontal scrolling;
- minimum touch targets remain 44 by 44 pixels for interactive controls.

### 5.5 Accessibility and motion

Metric explanations are available through keyboard-focusable tooltip triggers
with accessible names. Icon-only controls have explicit labels. Chart color is
never the only carrier of meaning; series have headings, textual summaries,
formatted axes, and accessible tooltip content.

Animations are limited to a subtle initial reveal and chart transitions that
communicate data shape. They use transform and opacity, honor
`prefers-reduced-motion`, and do not delay access to content. Empty and failure
states are announced as text.

## 6. Loading, Empty, and Error States

The admin dashboard route gets a loading surface whose skeletons preserve the
final layout and prevent cumulative layout shift.

A successful snapshot with no records renders meaningful zeros for count and
currency metrics, chart empty states with their axes suppressed, and an empty
recent-subscriptions message. It does not suggest that loading failed.

An RPC, authorization, or payload-validation failure never becomes a zeroed
dashboard. The route-level error surface explains that the operational view
could not be loaded and offers a retry action. Provider and database details
are not exposed to the administrator or logged with sensitive payloads.

## 7. Testing Strategy

### 7.1 Database tests

Add focused Supabase tests proving:

- anonymous and regular authenticated callers cannot execute or obtain data;
- the configured administrator at `aal1` is denied;
- the configured administrator at `aal2` receives a snapshot;
- day, Monday-based week, month, 30-day, 6-month, and 12-month boundaries use
  the São Paulo timezone correctly;
- active access includes `cancel_at_period_end` while its interval remains
  current;
- cancellations use the agreed timestamps without double counting;
- revenue includes confirmed/received payments and excludes refunded and
  chargeback states;
- the zero-denominator cancellation rate is represented as unavailable;
- histories are ordered and zero-filled;
- recent subscriptions are limited and deterministically ordered.

### 7.2 Service tests

Test strict guard invocation, RPC error translation, payload validation,
integer-cent preservation, status translation, missing-email fallback, date
labels, and successful view-model mapping.

### 7.3 Component and page tests

Test semantic headings, all required metrics, tooltip accessibility, currency
and percentage formatting, cancellation-rate unavailable state, chart textual
context, empty subscriptions, responsive table/list structure, and absence of
decorative inactive controls or invented customer details.

The existing admin layout tests remain responsible for shell-level redirects
and MFA gating. The page and service still enforce their own boundary.

### 7.4 Final verification

Run the focused Vitest suites, Supabase database tests, the full application
test suite, typecheck, lint, and formatting checks. Review the completed page at
mobile, tablet, and desktop widths in light and dark themes, with keyboard-only
navigation and reduced motion enabled.

## 8. Delivery Sequence

1. Add and test the protected aggregation RPC.
2. Regenerate database types.
3. Add the strict server service, schema validation, formatters, and tests.
4. Add the shadcn Chart primitive and Recharts dependency.
5. Extend the shared metric card through reusable seams and tests.
6. Build the dashboard components and responsive page through tests.
7. Add loading and error surfaces.
8. Run automated and visual verification.
