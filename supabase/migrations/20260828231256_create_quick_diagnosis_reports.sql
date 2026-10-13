create table public.diagnoses (
  id bigint generated always as identity primary key,
  submission_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  business_category public.business_category not null,
  scenario text not null,
  schema_version smallint not null,
  calculation_version smallint not null,
  content_version smallint not null,
  current_price_cents bigint not null,
  real_margin_basis_points integer,
  unit_profit_cents bigint,
  verdict text not null,
  priority text not null,
  unit text not null,
  report_snapshot jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint diagnoses_user_submission_key unique (user_id, submission_id),
  constraint diagnoses_scenario_check check (
    scenario in ('hour', 'minute', 'appointment')
  ),
  constraint diagnoses_versions_check check (
    schema_version >= 1
    and calculation_version >= 1
    and content_version >= 1
  ),
  constraint diagnoses_current_price_check check (current_price_cents >= 0),
  constraint diagnoses_verdict_check check (
    verdict in (
      'missing_price',
      'operational_loss',
      'tight_margin',
      'adequate_margin',
      'above_target'
    )
  ),
  constraint diagnoses_priority_check check (
    priority in ('cost', 'price', 'margin', 'volume')
  ),
  constraint diagnoses_unit_check check (unit in ('hour', 'appointment')),
  constraint diagnoses_snapshot_object_check check (
    jsonb_typeof(report_snapshot) = 'object'
  )
);

create index diagnoses_user_created_id_idx
on public.diagnoses (user_id, created_at desc, id desc);

alter table public.service_diagnoses
add column diagnosis_id bigint,
add constraint service_diagnoses_diagnosis_id_key unique (diagnosis_id),
add constraint service_diagnoses_diagnosis_id_fkey
  foreign key (diagnosis_id)
  references public.diagnoses (id)
  on delete restrict;

revoke all on table public.diagnoses from anon, authenticated;
revoke all on sequence public.diagnoses_id_seq from anon, authenticated;

grant select on table public.diagnoses to authenticated;

alter table public.diagnoses enable row level security;

create policy diagnoses_select_own
on public.diagnoses
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke insert on table public.service_diagnoses from authenticated;
revoke usage on sequence public.service_diagnoses_id_seq from authenticated;

drop policy service_diagnoses_insert_own
on public.service_diagnoses;

create function public.create_service_diagnosis_report(
  p_submission_id uuid,
  p_pricing_method public.service_pricing_method,
  p_desired_monthly_income_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_monthly_work_minutes integer,
  p_weekly_work_days smallint,
  p_hourly_rate_cents bigint,
  p_minute_rate_cents bigint,
  p_appointment_rate_cents bigint,
  p_appointment_duration_minutes integer,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_scenario text,
  p_current_price_cents bigint,
  p_real_margin_basis_points integer,
  p_unit_profit_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version <> 1
    or p_calculation_version <> 1
    or p_content_version <> 1
    or jsonb_typeof(p_report_snapshot) <> 'object'
    or p_report_snapshot ->> 'schemaVersion' <> p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion' <> p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion' <> p_content_version::text
    or p_report_snapshot ->> 'category' <> 'service'
    or p_report_snapshot ->> 'scenario' <> p_scenario
    or p_scenario <> p_pricing_method::text
  then
    raise exception using
      errcode = '22023',
      message = 'invalid report snapshot';
  end if;

  insert into public.diagnoses (
    submission_id,
    user_id,
    business_category,
    scenario,
    schema_version,
    calculation_version,
    content_version,
    current_price_cents,
    real_margin_basis_points,
    unit_profit_cents,
    verdict,
    priority,
    unit,
    report_snapshot
  ) values (
    p_submission_id,
    caller_id,
    'service',
    p_scenario,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select id into report_id
    from public.diagnoses
    where user_id = caller_id
      and submission_id = p_submission_id;

    return report_id;
  end if;

  insert into public.service_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    pricing_method,
    desired_monthly_income_cents,
    fixed_monthly_expenses_cents,
    monthly_work_minutes,
    weekly_work_days,
    hourly_rate_cents,
    minute_rate_cents,
    appointment_rate_cents,
    appointment_duration_minutes,
    tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_pricing_method,
    p_desired_monthly_income_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_work_minutes,
    p_weekly_work_days,
    p_hourly_rate_cents,
    p_minute_rate_cents,
    p_appointment_rate_cents,
    p_appointment_duration_minutes,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$$;

revoke execute on function public.create_service_diagnosis_report(
  uuid,
  public.service_pricing_method,
  bigint,
  bigint,
  integer,
  smallint,
  bigint,
  bigint,
  bigint,
  integer,
  integer,
  integer,
  smallint,
  smallint,
  smallint,
  text,
  bigint,
  integer,
  bigint,
  text,
  text,
  text,
  jsonb
)
from public, anon;

grant execute on function public.create_service_diagnosis_report(
  uuid,
  public.service_pricing_method,
  bigint,
  bigint,
  integer,
  smallint,
  bigint,
  bigint,
  bigint,
  integer,
  integer,
  integer,
  smallint,
  smallint,
  smallint,
  text,
  bigint,
  integer,
  bigint,
  text,
  text,
  text,
  jsonb
)
to authenticated;
