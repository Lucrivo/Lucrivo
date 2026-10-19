begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select is(
  (
    select count(*)::bigint
    from auth.users
    where id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and email_confirmed_at is not null
  ),
  97::bigint,
  'seed creates 97 confirmed demo users'
);

select ok(
  (
    select encrypted_password = extensions.crypt(
      'LucrivoSeed2026AA',
      encrypted_password
    )
    from auth.users
    where id = 'd1000000-0000-4000-8000-000000000000'
      and email = 'admin@seed.lucrivo.test'
  ),
  'admin credential matches the documented demo password'
);

select is(
  (
    select count(*)::bigint
    from auth.identities
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and provider = 'email'
  ),
  97::bigint,
  'every demo user has an email identity'
);

select results_eq(
  $$
    select singleton, user_id
    from private.app_administrator
  $$,
  $$ values (
    1::smallint,
    'd1000000-0000-4000-8000-000000000000'::uuid
  ) $$,
  'the demo administrator is assigned by Auth user id'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  288::bigint,
  'seed creates 288 demo reports'
);

select results_eq(
  $$
    with per_user as (
      select app_user.id, count(diagnosis.id)::integer as report_count
      from auth.users as app_user
      left join public.diagnoses as diagnosis
        on diagnosis.user_id = app_user.id
      where app_user.id between
        'd1000000-0000-4000-8000-000000000001'::uuid and
        'd1000000-0000-4000-8000-000000000060'::uuid
      group by app_user.id
    )
    select report_count, count(*)::bigint
    from per_user
    group by report_count
    order by report_count
  $$,
  $$ values
    (0::integer, 24::bigint),
    (1::integer, 24::bigint),
    (2::integer, 10::bigint),
    (3::integer, 10::bigint),
    (4::integer, 10::bigint),
    (5::integer, 10::bigint),
    (6::integer, 1::bigint),
    (7::integer, 1::bigint),
    (8::integer, 1::bigint),
    (9::integer, 1::bigint),
    (10::integer, 1::bigint),
    (11::integer, 1::bigint),
    (12::integer, 1::bigint),
    (32::integer, 1::bigint)
  $$,
  'client report counts cover empty, light, regular, and power-user cohorts'
);

select results_eq(
  $$
    select business_category::text, analysis_mode, count(*)::bigint
    from public.diagnoses
    where user_id = 'd1000000-0000-4000-8000-000000000000'
    group by business_category, analysis_mode
    order by business_category::text, analysis_mode
  $$,
  $$ values
    ('product'::text, 'detailed'::text, 6::bigint),
    ('product'::text, 'quick'::text, 6::bigint),
    ('production'::text, 'detailed'::text, 6::bigint),
    ('production'::text, 'quick'::text, 6::bigint),
    ('service'::text, 'quick'::text, 5::bigint)
  $$,
  'admin owns all 29 current quick and detailed report scenarios'
);

select results_eq(
  $$
    select case
        when analysis_mode = 'detailed' then 'detailed'
        else business_category::text
      end as report_family,
      count(*)::bigint
    from public.diagnoses
    where user_id = 'd1000000-0000-4000-8000-000000000000'
      and verdict = 'positive_result'
    group by report_family
    order by report_family
  $$,
  $$ values
    ('detailed'::text, 2::bigint),
    ('product'::text, 1::bigint),
    ('production'::text, 1::bigint),
    ('service'::text, 1::bigint)
  $$,
  'every current report family includes positive-result coverage'
);

select results_eq(
  $$
    select distinct case
        when analysis_mode = 'detailed' then 'detailed'
        else business_category::text
      end as report_family,
      schema_version,
      calculation_version,
      content_version
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
    order by report_family
  $$,
  $$ values
    ('detailed'::text, 1::smallint, 1::smallint, 3::smallint),
    ('product'::text, 3::smallint, 3::smallint, 6::smallint),
    ('production'::text, 3::smallint, 3::smallint, 6::smallint),
    ('service'::text, 4::smallint, 3::smallint, 6::smallint)
  $$,
  'seed snapshots use only current report version tuples'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (
        report_snapshot ->> 'category'
          is distinct from business_category::text
        or report_snapshot ->> 'scenario' is distinct from scenario
        or report_snapshot #>> '{results,verdict}' is distinct from verdict
        or report_snapshot #>> '{results,priority}' is distinct from priority
        or report_snapshot ->> 'schemaVersion'
          is distinct from schema_version::text
        or report_snapshot ->> 'calculationVersion'
          is distinct from calculation_version::text
        or report_snapshot ->> 'contentVersion'
          is distinct from content_version::text
      )
  ),
  0::bigint,
  'all report snapshots agree with their indexed diagnosis fields'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and is_free_report
      and analysis_mode = 'quick'
  ),
  (
    select count(distinct user_id)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  'every demo report owner has exactly one free report'
);

select is(
  (
    select count(*)::bigint
    from (
      select user_id
      from public.diagnoses
      where user_id between
        'd1000000-0000-4000-8000-000000000000'::uuid and
        'd1000000-0000-4000-8000-000000000060'::uuid
      group by user_id
      having count(*) filter (
        where is_free_report and analysis_mode = 'quick'
      ) <> 1
    ) as invalid_owner
  ),
  0::bigint,
  'no demo report owner has zero or multiple free reports'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where is_free_report
      and analysis_mode = 'detailed'
  ),
  0::bigint,
  'seeded detailed reports never consume the free quick allowance'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and deleted_at is not null
  ),
  16::bigint,
  'seed includes archived reports for lifecycle filters'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses as diagnosis
    join public.detailed_diagnoses as detailed
      on detailed.diagnosis_id = diagnosis.id
    where diagnosis.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (
        diagnosis.item_count is distinct from detailed.item_count
        or diagnosis.item_count is distinct from (
          select count(*)::integer
          from public.detailed_diagnosis_items as item
          where item.diagnosis_id = diagnosis.id
        )
        or diagnosis.item_count is distinct from
          jsonb_array_length(diagnosis.report_snapshot #> '{inputs,items}')
        or diagnosis.item_count is distinct from
          jsonb_array_length(diagnosis.report_snapshot #> '{results,items}')
      )
  ),
  0::bigint,
  'detailed reports preserve their declared item counts everywhere'
);

select results_eq(
  $$
    select diagnosis.business_category::text,
      array_agg(diagnosis.item_count order by detailed.submission_id)
    from public.diagnoses as diagnosis
    join public.detailed_diagnoses as detailed
      on detailed.diagnosis_id = diagnosis.id
    where diagnosis.user_id = 'd1000000-0000-4000-8000-000000000000'
    group by diagnosis.business_category
    order by diagnosis.business_category::text
  $$,
  $$ values
    ('product'::text, array[1, 2, 3, 5, 8, 10]::integer[]),
    ('production'::text, array[10, 8, 5, 3, 2, 1]::integer[])
  $$,
  'admin detailed reports cover small through large item sets'
);

select ok(
  exists (
    select 1
    from public.detailed_diagnosis_ingredients
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  )
  and not exists (
    select 1
    from public.detailed_diagnosis_ingredients as ingredient
    join public.detailed_diagnosis_items as item
      on item.diagnosis_id = ingredient.diagnosis_id
      and item.client_item_id = ingredient.client_item_id
    where ingredient.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and item.cost_mode <> 'technical_sheet'
  ),
  'ingredients exist only for technical-sheet production items'
);

select is(
  (
    select count(*)::bigint
    from public.billing_contracts as contract
    join public.billing_payments as payment
      on payment.contract_id = contract.id
    where contract.user_id = 'd1000000-0000-4000-8000-000000000000'
      and contract.billing_mode = 'semiannual'
      and contract.amount_cents = 17940
      and contract.status = 'active'
      and contract.access_starts_at <= statement_timestamp()
      and contract.access_ends_at > statement_timestamp()
      and payment.status = 'received'
  ),
  1::bigint,
  'admin has a current paid semiannual subscription'
);

select is(
  (
    select count(distinct user_id)::bigint
    from public.billing_contracts
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and status in ('active', 'cancel_at_period_end')
      and access_starts_at <= statement_timestamp()
      and access_ends_at > statement_timestamp()
  ),
  40::bigint,
  '40 clients currently have paid access'
);

select is(
  (
    select count(*)::bigint
    from public.billing_contracts as contract
    join public.billing_prices as price on price.id = contract.price_id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (
        contract.catalog_code is distinct from price.catalog_code
        or contract.billing_mode is distinct from price.billing_mode
        or contract.amount_cents is distinct from price.amount_cents
        or contract.installment_limit is distinct from price.installment_limit
        or contract.access_months is distinct from price.access_months
        or contract.bonus_months is distinct from price.bonus_months
      )
  ),
  0::bigint,
  'every seeded contract snapshot agrees with its immutable catalog price'
);

select results_eq(
  $$
    select catalog_code, billing_mode, access_months, bonus_months,
      renewal_adjustment_status, renewal_adjustment_attempt_count,
      renewal_adjusted_at is not null as was_adjusted,
      renewal_adjustment_last_error_code
    from public.billing_contracts
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and catalog_code = 'launch'
    order by billing_mode, renewal_adjustment_status
  $$,
  $$ values
    ('launch'::text, 'monthly'::text, 2, 1, 'completed'::text, 1, true, null::text),
    ('launch'::text, 'monthly'::text, 2, 1, 'pending_reconciliation'::text, 1, false, 'provider_ambiguous'::text),
    ('launch'::text, 'semiannual'::text, 12, 6, 'not_required'::text, 0, false, null::text)
  $$,
  'launch fixtures cover semiannual access and monthly renewal outcomes'
);

select is(
  (
    select count(*)::bigint
    from public.billing_contracts
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and catalog_code = 'standard'
  ),
  81::bigint,
  'standard snapshots remain the majority of demo contracts'
);

select is(
  (
    select count(*)::bigint
    from public.billing_contracts
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and catalog_code = 'launch_price'
  ),
  2::bigint,
  'seed includes both launch_price purchase modes'
);

select results_eq(
  $$
    select user_id, price_id, billing_mode, payment_method, charge_type,
      amount_cents, access_months, bonus_months, asaas_subscription_id,
      renewal_adjustment_status, payment.status
    from public.billing_contracts as contract
    join public.billing_payments as payment on payment.contract_id = contract.id
    where contract.user_id in (
      'd1000000-0000-4000-8000-00000000002f'::uuid,
      'd1000000-0000-4000-8000-000000000030'::uuid
    )
    order by contract.user_id
  $$,
  $$ values
    (
      'd1000000-0000-4000-8000-00000000002f'::uuid,
      '20000000-0000-4000-8000-000000000005'::uuid,
      'monthly'::text, 'credit_card'::text, 'recurring'::text,
      3990::bigint, 1, 0, 'sub_demo_launch_price_047'::text,
      'completed'::text, 'confirmed'::text
    ),
    (
      'd1000000-0000-4000-8000-000000000030'::uuid,
      '20000000-0000-4000-8000-000000000006'::uuid,
      'semiannual'::text, 'pix'::text, 'detached'::text,
      17940::bigint, 6, 0, null::text,
      'not_required'::text, 'confirmed'::text
    )
  $$,
  'launch_price client fixtures preserve exact contract and payment snapshots'
);

select is(
  (
    select count(*)::bigint
    from auth.users as app_user
    left join private.admin_user_state as state
      on state.user_id = app_user.id
    where app_user.id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and state.courtesy_expires_at > statement_timestamp()
      and not exists (
        select 1
        from public.billing_contracts as contract
        where contract.user_id = app_user.id
          and contract.status in ('active', 'cancel_at_period_end')
          and contract.access_starts_at <= statement_timestamp()
          and contract.access_ends_at > statement_timestamp()
      )
  ),
  12::bigint,
  '12 clients currently have courtesy access'
);

select results_eq(
  $$
    select case
      when deleted_at is not null then 'deleted'
      when blocked_at is not null then 'blocked'
    end as state, count(*)::bigint
    from private.admin_user_state
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (deleted_at is not null or blocked_at is not null)
    group by state
    order by state
  $$,
  $$ values
    ('blocked'::text, 8::bigint),
    ('deleted'::text, 8::bigint)
  $$,
  'account-state cohorts contain eight blocked and eight deleted clients'
);

select results_eq(
  $$
    select status, count(*)::bigint
    from public.billing_contracts
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
    group by status
    order by status
  $$,
  $$ values
    ('active'::text, 42::bigint),
    ('cancel_at_period_end'::text, 1::bigint),
    ('canceled'::text, 1::bigint),
    ('chargeback'::text, 1::bigint),
    ('expired'::text, 37::bigint),
    ('failed'::text, 1::bigint),
    ('pending'::text, 1::bigint),
    ('pending_reconciliation'::text, 1::bigint),
    ('refunded'::text, 1::bigint)
  $$,
  'contracts cover every supported operational status'
);

select results_eq(
  $$
    select payment.status, count(*)::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
    group by payment.status
    order by payment.status
  $$,
  $$ values
    ('capture_refused'::text, 3::bigint),
    ('chargeback_dispute'::text, 1::bigint),
    ('chargeback_requested'::text, 2::bigint),
    ('confirmed'::text, 29::bigint),
    ('overdue'::text, 3::bigint),
    ('partially_refunded'::text, 3::bigint),
    ('pending'::text, 4::bigint),
    ('received'::text, 38::bigint),
    ('refunded'::text, 3::bigint)
  $$,
  'payments cover every supported operational status'
);

select is(
  (
    select count(*)::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    join public.bonus_access_grants as bonus_grant
      on bonus_grant.contract_id = contract.id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (
        payment.status in ('pending', 'overdue', 'capture_refused')
        or contract.status = 'failed'
      )
  ),
  0::bigint,
  'pending failed and unpaid demo purchases create no bonus grant'
);

select is(
  (
    select count(*)::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    left join public.bonus_access_grants as bonus_grant
      on bonus_grant.contract_id = contract.id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and payment.status in ('confirmed', 'received', 'partially_refunded')
      and (
        bonus_grant.id is null
        or bonus_grant.revoked_at is not null
        or bonus_grant.revocation_reason is not null
      )
  ),
  0::bigint,
  'confirmed received and partially refunded purchases keep live bonus grants'
);

select is(
  (
    select count(*)::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    left join public.bonus_access_grants as bonus_grant
      on bonus_grant.contract_id = contract.id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and payment.status = 'refunded'
      and (
        bonus_grant.revoked_at is null
        or bonus_grant.revocation_reason is distinct from 'full_refund'
      )
  ),
  0::bigint,
  'fully refunded purchases have grants revoked as full_refund'
);

select is(
  (
    select count(*)::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    left join public.bonus_access_grants as bonus_grant
      on bonus_grant.contract_id = contract.id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and payment.status in ('chargeback_requested', 'chargeback_dispute')
      and (
        bonus_grant.revoked_at is null
        or bonus_grant.revocation_reason is distinct from 'chargeback'
      )
  ),
  0::bigint,
  'chargeback purchases have grants revoked as chargeback'
);

select ok(
  not exists (
    select 1
    from public.bonus_access_grants
    where user_id = 'd1000000-0000-4000-8000-000000000055'::uuid
  ),
  'the active courtesy-only client has no paid bonus grant'
);

select ok(
  exists (
    select 1
    from public.bonus_access_grants
    where user_id = 'd1000000-0000-4000-8000-000000000060'::uuid
      and revoked_at is null
  )
  and exists (
    select 1
    from public.bonus_access_grants
    where user_id = 'd1000000-0000-4000-8000-000000000060'::uuid
      and revoked_at is not null
  ),
  'one revoked contract does not remove another live bonus grant'
);

select results_eq(
  $$
    select action, count(*)::bigint
    from private.admin_user_events
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
    group by action
    order by action
  $$,
  $$ values
    ('blocked'::text, 12::bigint),
    ('courtesy_ended'::text, 8::bigint),
    ('courtesy_granted'::text, 11::bigint),
    ('restored'::text, 4::bigint),
    ('soft_deleted'::text, 12::bigint),
    ('unblocked'::text, 4::bigint)
  $$,
  'administrative history covers all lifecycle actions'
);

select is(
  (
    select count(distinct date_trunc(
      'month', payment.due_date::timestamptz
    ))::bigint
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and payment.status in ('confirmed', 'received')
  ),
  12::bigint,
  'confirmed revenue spans twelve calendar months'
);

select is(
  (
    select count(distinct date_trunc('month', created_at))::bigint
    from auth.users
    where id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  6::bigint,
  'client creation dates span six months for growth metrics'
);

select is(
  (
    select count(*)::bigint
    from public.onboarding_profiles
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  96::bigint,
  'every demo client has onboarding'
);

select is(
  (
    select count(*)::bigint
    from public.onboarding_profiles
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and whatsapp_marketing_consent
  ),
  48::bigint,
  'half of demo clients actively consent'
);

select ok(
  not exists (
    select 1
    from public.onboarding_profiles
    where user_id = 'd1000000-0000-4000-8000-000000000000'::uuid
  ),
  'the demo administrator has no onboarding profile'
);

select is(
  (
    select count(*)::bigint
    from public.onboarding_profiles as profile
    join auth.users as app_user on app_user.id = profile.user_id
    left join public.business_subcategories as subcategory
      on subcategory.id = profile.subcategory_id
     and subcategory.segment_id = profile.segment_id
    where profile.user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and (
        profile.completed_at <= app_user.created_at
        or profile.completed_at >= statement_timestamp()
        or (
          profile.subcategory_id is not null
          and (subcategory.id is null or profile.custom_subcategory is not null)
        )
        or (
          profile.subcategory_id is null
          and profile.custom_subcategory is null
        )
      )
  ),
  0::bigint,
  'demo onboarding uses valid catalog pairs and completion times'
);

select ok(
  (
    select count(*)
    from public.onboarding_profiles
    where user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and subcategory_id is null
      and custom_subcategory is not null
  ) >= 8,
  'demo onboarding covers custom Outro descriptions'
);

select is(
  (
    select count(distinct profile.segment_id)::bigint
    from public.onboarding_profiles as profile
    where profile.user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  8::bigint,
  'demo onboarding covers every seeded business segment'
);

select is(
  (
    select count(*)::bigint
    from private.whatsapp_consent_events as event
    join public.onboarding_profiles as profile
      on profile.user_id = event.user_id
     and event.created_at = profile.completed_at
     and event.decision = case
       when profile.whatsapp_marketing_consent then 'granted'
       else 'declined'
     end
    where event.user_id between
      'd1000000-0000-4000-8000-000000000001'::uuid and
      'd1000000-0000-4000-8000-000000000060'::uuid
      and event.source = 'onboarding'
      and event.copy_version = 'whatsapp-marketing-v1'
  ),
  96::bigint,
  'every demo profile has one matching initial consent event'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id = 'd1000000-0000-4000-8000-000000000060'
  ),
  32::bigint,
  'power user has 32 reports'
);

select is(
  (
    select count(*)::bigint
    from public.billing_contracts
    where user_id = 'd1000000-0000-4000-8000-000000000060'
  ),
  25::bigint,
  'power user has 25 current and historical contracts'
);

select is(
  (
    select count(*)::bigint
    from private.admin_user_events
    where user_id = 'd1000000-0000-4000-8000-000000000060'
  ),
  24::bigint,
  'power user has 24 lifecycle events'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000000',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',
  true
);

select ok(
  public.current_user_is_admin(),
  'demo administrator passes the application authorization check'
);

select is(
  jsonb_array_length(
    public.export_admin_onboarding_contacts_v1(null, null, null, null)
      -> 'items'
  ),
  48,
  'aal2 demo administrator exports exactly 48 authorized contacts'
);

select is(
  jsonb_array_length(
    public.list_admin_users_v1(null, 'all', 'all', null, null, 20)
      -> 'items'
  ),
  20,
  'admin user list returns a full first page'
);

select ok(
  public.list_admin_users_v1(null, 'all', 'all', null, null, 20)
    -> 'nextCursor' is not null,
  'admin user list exposes a next cursor'
);

select ok(
  (
    with first_page as (
      select public.list_admin_users_v1(
        null, 'all', 'all', null, null, 20
      ) as payload
    ),
    second_page as (
      select public.list_admin_users_v1(
        null,
        'all',
        'all',
        (payload #>> '{nextCursor,createdAt}')::timestamptz,
        (payload #>> '{nextCursor,id}')::uuid,
        20
      ) as payload
      from first_page
    )
    select jsonb_array_length(second_page.payload -> 'items') = 20
      and not exists (
        select 1
        from first_page,
          jsonb_array_elements(first_page.payload -> 'items') as first_item,
          jsonb_array_elements(second_page.payload -> 'items') as second_item
        where first_item ->> 'id' = second_item ->> 'id'
      )
    from first_page, second_page
  ),
  'admin user cursor returns a distinct full second page'
);

select is(
  jsonb_array_length(
    public.list_admin_users_v1(
      'cliente+096', 'all', 'all', null, null, 20
    ) -> 'items'
  ),
  1,
  'admin user search finds the deterministic power user'
);

select results_eq(
  $$
    select filter_name, jsonb_array_length(payload -> 'items')
    from (values
      ('paid'::text, public.list_admin_users_v1(
        null, 'all', 'paid', null, null, 50
      )),
      ('courtesy'::text, public.list_admin_users_v1(
        null, 'all', 'courtesy', null, null, 50
      )),
      ('blocked'::text, public.list_admin_users_v1(
        null, 'blocked', 'all', null, null, 50
      )),
      ('deleted'::text, public.list_admin_users_v1(
        null, 'deleted', 'all', null, null, 50
      ))
    ) as filtered(filter_name, payload)
    order by filter_name
  $$,
  $$ values
    ('blocked'::text, 8::integer),
    ('courtesy'::text, 12::integer),
    ('deleted'::text, 8::integer),
    ('paid'::text, 40::integer)
  $$,
  'admin state and access filters expose every operational cohort'
);

select results_eq(
  $$
    select kind, jsonb_array_length(payload -> 'items'),
      (payload -> 'nextCursor') is not null
    from (values
      ('diagnoses'::text, public.list_admin_user_items_v1(
        'd1000000-0000-4000-8000-000000000060',
        'diagnoses', null, null, 20
      )),
      ('history'::text, public.list_admin_user_items_v1(
        'd1000000-0000-4000-8000-000000000060',
        'history', null, null, 20
      )),
      ('subscriptions'::text, public.list_admin_user_items_v1(
        'd1000000-0000-4000-8000-000000000060',
        'subscriptions', null, null, 20
      ))
    ) as pages(kind, payload)
    order by kind
  $$,
  $$ values
    ('diagnoses'::text, 20::integer, true),
    ('history'::text, 20::integer, true),
    ('subscriptions'::text, 20::integer, true)
  $$,
  'power-user reports, subscriptions, and history all exercise pagination'
);

select * from finish();
rollback;
