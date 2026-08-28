create type public.business_category as enum ('service');

create type public.service_pricing_method as enum (
  'hour',
  'minute',
  'appointment'
);

create table public.service_diagnoses (
  id bigint generated always as identity primary key,
  submission_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  business_category public.business_category not null default 'service',
  pricing_method public.service_pricing_method not null,
  desired_monthly_income_cents bigint not null default 0,
  fixed_monthly_expenses_cents bigint not null default 0,
  monthly_work_minutes integer not null default 0,
  weekly_work_days smallint not null default 0,
  hourly_rate_cents bigint not null default 0,
  minute_rate_cents bigint not null default 0,
  appointment_rate_cents bigint not null default 0,
  appointment_duration_minutes integer not null default 0,
  tax_rate_basis_points integer not null default 0,
  card_fee_rate_basis_points integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  constraint service_diagnoses_user_submission_key unique (
    user_id,
    submission_id
  ),
  constraint service_diagnoses_category_check check (
    business_category = 'service'
  ),
  constraint service_diagnoses_money_check check (
    desired_monthly_income_cents >= 0
    and fixed_monthly_expenses_cents >= 0
    and hourly_rate_cents >= 0
    and minute_rate_cents >= 0
    and appointment_rate_cents >= 0
  ),
  constraint service_diagnoses_work_minutes_check check (
    monthly_work_minutes between 0 and 44640
  ),
  constraint service_diagnoses_work_days_check check (
    weekly_work_days between 0 and 7
  ),
  constraint service_diagnoses_duration_check check (
    appointment_duration_minutes >= 0
  ),
  constraint service_diagnoses_tax_check check (
    tax_rate_basis_points between 0 and 10000
  ),
  constraint service_diagnoses_card_fee_check check (
    card_fee_rate_basis_points between 0 and 10000
  ),
  constraint service_diagnoses_pricing_shape_check check (
    (
      pricing_method = 'hour'
      and hourly_rate_cents > 0
      and minute_rate_cents = 0
      and appointment_rate_cents = 0
      and appointment_duration_minutes = 0
    )
    or (
      pricing_method = 'minute'
      and minute_rate_cents > 0
      and hourly_rate_cents = 0
      and appointment_rate_cents = 0
      and appointment_duration_minutes = 0
    )
    or (
      pricing_method = 'appointment'
      and appointment_rate_cents > 0
      and appointment_duration_minutes > 0
      and hourly_rate_cents = 0
      and minute_rate_cents = 0
    )
  )
);

create index service_diagnoses_user_created_at_idx
on public.service_diagnoses (user_id, created_at desc);

revoke all on table public.service_diagnoses from anon, authenticated;
revoke all on sequence public.service_diagnoses_id_seq from anon, authenticated;

grant select, insert on table public.service_diagnoses to authenticated;
grant usage on sequence public.service_diagnoses_id_seq to authenticated;

alter table public.service_diagnoses enable row level security;

create policy service_diagnoses_select_own
on public.service_diagnoses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy service_diagnoses_insert_own
on public.service_diagnoses
for insert
to authenticated
with check ((select auth.uid()) = user_id);
