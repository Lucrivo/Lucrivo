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
  295::bigint,
  'seed creates 295 demo reports'
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
    ('product'::text, 'detailed'::text, 7::bigint),
    ('product'::text, 'quick'::text, 8::bigint),
    ('production'::text, 'detailed'::text, 7::bigint),
    ('production'::text, 'quick'::text, 8::bigint),
    ('service'::text, 'quick'::text, 6::bigint)
  $$,
  'admin owns all 36 quick and detailed report scenarios'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id = 'd1000000-0000-4000-8000-000000000000'
      and verdict = 'above_target'
      and business_category in ('product', 'production')
      and analysis_mode = 'quick'
  ),
  2::bigint,
  'admin retains both historical above-target quick fixtures'
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
      having count(*) filter (where is_free_report) <> 1
    ) as invalid_owner
  ),
  0::bigint,
  'no demo report owner has zero or multiple free reports'
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
    ('product'::text, array[1, 2, 3, 5, 8, 10, 12]::integer[]),
    ('production'::text, array[12, 10, 8, 5, 3, 2, 1]::integer[])
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
      and contract.billing_mode = 'annual'
      and contract.amount_cents = 47880
      and contract.status = 'active'
      and contract.access_starts_at <= statement_timestamp()
      and contract.access_ends_at > statement_timestamp()
      and payment.status = 'received'
  ),
  1::bigint,
  'admin has a current paid annual subscription'
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
    ('chargeback_dispute'::text, 2::bigint),
    ('chargeback_requested'::text, 2::bigint),
    ('confirmed'::text, 27::bigint),
    ('overdue'::text, 3::bigint),
    ('partially_refunded'::text, 3::bigint),
    ('pending'::text, 3::bigint),
    ('received'::text, 40::bigint),
    ('refunded'::text, 3::bigint)
  $$,
  'payments cover every supported operational status'
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
