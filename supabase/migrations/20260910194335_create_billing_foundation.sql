create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.billing_prices (
  id uuid primary key default gen_random_uuid(),
  product_code text not null,
  billing_mode text not null,
  version integer not null,
  amount_cents bigint not null,
  currency text not null,
  installment_limit integer,
  access_months integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  retired_at timestamptz,
  constraint billing_prices_product_code_check check (
    length(btrim(product_code)) > 0
  ),
  constraint billing_prices_billing_mode_check check (
    billing_mode in ('monthly', 'semiannual')
  ),
  constraint billing_prices_version_check check (version >= 1),
  constraint billing_prices_amount_cents_check check (amount_cents > 0),
  constraint billing_prices_currency_check check (currency = 'BRL'),
  constraint billing_prices_catalog_shape_check check (
    (
      billing_mode = 'monthly'
      and installment_limit is null
      and access_months = 1
    )
    or (
      billing_mode = 'semiannual'
      and installment_limit = 6
      and access_months = 6
      and amount_cents % installment_limit = 0
    )
  ),
  constraint billing_prices_retirement_check check (
    (is_active and retired_at is null)
    or (not is_active and retired_at is not null)
  ),
  constraint billing_prices_product_mode_version_key unique (
    product_code,
    billing_mode,
    version
  )
);

create unique index billing_prices_one_active_mode_idx
on public.billing_prices (product_code, billing_mode)
where is_active;

create function private.prevent_billing_price_commercial_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.product_code is distinct from old.product_code
    or new.billing_mode is distinct from old.billing_mode
    or new.version is distinct from old.version
    or new.amount_cents is distinct from old.amount_cents
    or new.currency is distinct from old.currency
    or new.installment_limit is distinct from old.installment_limit
    or new.access_months is distinct from old.access_months
    or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = 'P0001',
      message = 'billing prices are immutable';
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_billing_price_commercial_update()
from public, anon, authenticated, service_role;

create trigger billing_prices_prevent_commercial_update
before update on public.billing_prices
for each row
execute function private.prevent_billing_price_commercial_update();

create table public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  asaas_customer_id text not null unique,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint billing_customers_asaas_customer_id_check check (
    length(btrim(asaas_customer_id)) > 0
  )
);

create table public.billing_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  price_id uuid not null references public.billing_prices (id) on delete restrict,
  external_reference text not null unique,
  billing_mode text not null,
  payment_method text not null,
  charge_type text not null,
  amount_cents bigint not null,
  currency text not null,
  installment_limit integer,
  access_months integer not null,
  asaas_checkout_id text unique,
  asaas_checkout_url text,
  checkout_expires_at timestamptz,
  asaas_subscription_id text unique,
  asaas_installment_id text unique,
  status text not null default 'pending',
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancellation_requested_at timestamptz,
  cancellation_confirmed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint billing_contracts_external_reference_check check (
    length(btrim(external_reference)) > 0
  ),
  constraint billing_contracts_billing_mode_check check (
    billing_mode in ('monthly', 'semiannual')
  ),
  constraint billing_contracts_payment_method_check check (
    payment_method in ('credit_card', 'pix')
  ),
  constraint billing_contracts_charge_type_check check (
    charge_type in ('recurring', 'installment', 'detached')
  ),
  constraint billing_contracts_purchase_flow_check check (
    (billing_mode, payment_method, charge_type) in (
      ('monthly', 'credit_card', 'recurring'),
      ('monthly', 'pix', 'detached'),
      ('semiannual', 'credit_card', 'installment'),
      ('semiannual', 'pix', 'detached')
    )
  ),
  constraint billing_contracts_amount_cents_check check (amount_cents > 0),
  constraint billing_contracts_currency_check check (currency = 'BRL'),
  constraint billing_contracts_snapshot_shape_check check (
    (
      billing_mode = 'monthly'
      and installment_limit is null
      and access_months = 1
    )
    or (
      billing_mode = 'semiannual'
      and installment_limit = 6
      and access_months = 6
      and amount_cents % installment_limit = 0
    )
  ),
  constraint billing_contracts_provider_ids_check check (
    (asaas_checkout_id is null or length(btrim(asaas_checkout_id)) > 0)
    and (
      asaas_subscription_id is null
      or (
        length(btrim(asaas_subscription_id)) > 0
        and billing_mode = 'monthly'
        and payment_method = 'credit_card'
        and charge_type = 'recurring'
      )
    )
    and (
      asaas_installment_id is null
      or (
        length(btrim(asaas_installment_id)) > 0
        and billing_mode = 'semiannual'
        and payment_method = 'credit_card'
        and charge_type = 'installment'
      )
    )
  ),
  constraint billing_contracts_status_check check (
    status in (
      'pending',
      'pending_reconciliation',
      'active',
      'cancel_at_period_end',
      'refund_pending',
      'expired',
      'canceled',
      'refunded',
      'chargeback',
      'failed'
    )
  ),
  constraint billing_contracts_access_interval_check check (
    (
      access_starts_at is null
      and access_ends_at is null
    )
    or (
      access_starts_at is not null
      and access_ends_at is not null
      and access_ends_at > access_starts_at
    )
  ),
  constraint billing_contracts_cancellation_check check (
    (
      not cancel_at_period_end
      and status <> 'cancel_at_period_end'
      and cancellation_confirmed_at is null
    )
    or (
      cancel_at_period_end
      and status in ('cancel_at_period_end', 'refund_pending')
      and cancellation_confirmed_at is not null
      and billing_mode = 'monthly'
      and payment_method = 'credit_card'
      and charge_type = 'recurring'
    )
  )
);

create index billing_contracts_user_id_idx
on public.billing_contracts (user_id);

create index billing_contracts_price_id_idx
on public.billing_contracts (price_id);

create unique index billing_contracts_one_pending_user_idx
on public.billing_contracts (user_id)
where status in ('pending', 'pending_reconciliation');

create index billing_contracts_user_access_idx
on public.billing_contracts (user_id, access_ends_at desc)
where status in ('active', 'cancel_at_period_end');

create index billing_contracts_reconciliation_idx
on public.billing_contracts (updated_at)
where status = 'pending_reconciliation';

create table public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.billing_contracts (id) on delete cascade,
  asaas_payment_id text not null unique,
  status text not null,
  value_cents bigint not null,
  installment_number integer,
  due_date date,
  confirmed_at timestamptz,
  received_at timestamptz,
  refunded_at timestamptz,
  chargeback_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint billing_payments_asaas_payment_id_check check (
    length(btrim(asaas_payment_id)) > 0
  ),
  constraint billing_payments_status_check check (
    status in (
      'pending',
      'confirmed',
      'received',
      'overdue',
      'capture_refused',
      'refunded',
      'partially_refunded',
      'chargeback_requested',
      'chargeback_dispute'
    )
  ),
  constraint billing_payments_value_cents_check check (value_cents > 0),
  constraint billing_payments_installment_number_check check (
    installment_number is null or installment_number > 0
  )
);

create index billing_payments_contract_id_idx
on public.billing_payments (contract_id);

create table public.billing_refund_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique
    references public.billing_contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  previous_contract_status text not null,
  eligibility_started_at timestamptz not null,
  eligibility_ends_at timestamptz not null,
  requested_at timestamptz not null,
  last_attempt_at timestamptz not null,
  provider_submitted_at timestamptz,
  refund_confirmed_at timestamptz,
  recurrence_canceled_at timestamptz,
  rejected_at timestamptz,
  attempt_count integer not null default 1,
  last_error_code text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint billing_refund_requests_status_check check (
    status in (
      'processing',
      'submitted',
      'confirmed',
      'rejected',
      'pending_reconciliation'
    )
  ),
  constraint billing_refund_requests_previous_status_check check (
    previous_contract_status in ('active', 'cancel_at_period_end')
  ),
  constraint billing_refund_requests_eligibility_check check (
    eligibility_ends_at >= eligibility_started_at
  ),
  constraint billing_refund_requests_attempt_count_check check (
    attempt_count > 0
  ),
  constraint billing_refund_requests_error_code_check check (
    last_error_code is null
    or last_error_code in (
      'provider_rejected',
      'provider_ambiguous',
      'subscription_cancellation_failed',
      'state_persist_failed'
    )
  ),
  constraint billing_refund_requests_state_timestamps_check check (
    (status <> 'confirmed' or refund_confirmed_at is not null)
    and (status <> 'rejected' or rejected_at is not null)
    and (status <> 'submitted' or provider_submitted_at is not null)
  )
);

create index billing_refund_requests_user_id_idx
on public.billing_refund_requests (user_id);

create index billing_refund_requests_reconciliation_idx
on public.billing_refund_requests (status, updated_at)
where status in ('processing', 'submitted', 'pending_reconciliation');

create table public.asaas_webhook_events (
  id text primary key,
  event_type text not null,
  contract_id uuid references public.billing_contracts (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default statement_timestamp(),
  processing_status text not null default 'received',
  attempt_count integer not null default 1,
  last_error text,
  processed_at timestamptz,
  constraint asaas_webhook_events_id_check check (length(btrim(id)) > 0),
  constraint asaas_webhook_events_event_type_check check (
    length(btrim(event_type)) > 0
  ),
  constraint asaas_webhook_events_payload_check check (
    jsonb_typeof(payload) = 'object'
  ),
  constraint asaas_webhook_events_processing_status_check check (
    processing_status in ('received', 'processed', 'ignored', 'failed')
  ),
  constraint asaas_webhook_events_attempt_count_check check (
    attempt_count >= 1
  ),
  constraint asaas_webhook_events_processed_at_check check (
    (processing_status in ('processed', 'ignored')) = (processed_at is not null)
  )
);

create index asaas_webhook_events_contract_id_idx
on public.asaas_webhook_events (contract_id)
where contract_id is not null;

create index asaas_webhook_events_retry_idx
on public.asaas_webhook_events (received_at)
where processing_status = 'failed';

alter table public.billing_prices enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_contracts enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_refund_requests enable row level security;
alter table public.asaas_webhook_events enable row level security;

create policy billing_prices_select_active
on public.billing_prices
for select
to anon, authenticated
using (is_active);

create policy billing_contracts_select_own
on public.billing_contracts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy billing_payments_select_own
on public.billing_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.billing_contracts
    where billing_contracts.id = billing_payments.contract_id
      and billing_contracts.user_id = (select auth.uid())
  )
);

create policy billing_refund_requests_select_own
on public.billing_refund_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.billing_prices
from public, anon, authenticated, service_role;
revoke all on table public.billing_customers
from public, anon, authenticated, service_role;
revoke all on table public.billing_contracts
from public, anon, authenticated, service_role;
revoke all on table public.billing_payments
from public, anon, authenticated, service_role;
revoke all on table public.billing_refund_requests
from public, anon, authenticated, service_role;
revoke all on table public.asaas_webhook_events
from public, anon, authenticated, service_role;

grant select on table public.billing_prices to anon, authenticated;

grant select (
  id,
  user_id,
  price_id,
  billing_mode,
  payment_method,
  charge_type,
  amount_cents,
  currency,
  installment_limit,
  access_months,
  status,
  access_starts_at,
  access_ends_at,
  cancel_at_period_end,
  cancellation_requested_at,
  cancellation_confirmed_at,
  canceled_at,
  created_at,
  updated_at
)
on public.billing_contracts
to authenticated;

grant select (
  id,
  contract_id,
  status,
  value_cents,
  installment_number,
  due_date,
  confirmed_at,
  received_at,
  refunded_at,
  chargeback_at,
  created_at,
  updated_at
)
on public.billing_payments
to authenticated;

grant select (
  id,
  contract_id,
  user_id,
  status,
  eligibility_started_at,
  eligibility_ends_at,
  requested_at,
  provider_submitted_at,
  refund_confirmed_at,
  recurrence_canceled_at,
  rejected_at,
  last_error_code,
  created_at,
  updated_at
)
on public.billing_refund_requests
to authenticated;

grant select, insert, update, delete on table public.billing_prices
to service_role;
grant select, insert, update, delete on table public.billing_customers
to service_role;
grant select, insert, update, delete on table public.billing_contracts
to service_role;
grant select, insert, update, delete on table public.billing_payments
to service_role;
grant select, insert, update, delete on table public.billing_refund_requests
to service_role;
grant select, insert, update, delete on table public.asaas_webhook_events
to service_role;

create function public.begin_billing_refund(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.transaction_timestamp();
  v_contract public.billing_contracts%rowtype;
  v_request public.billing_refund_requests%rowtype;
  v_current_count integer;
  v_payment_id text;
  v_eligibility_ends_at timestamptz;
  v_has_request boolean := false;
begin
  if p_user_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  select request.*
  into v_request
  from public.billing_refund_requests as request
  join public.billing_contracts as contract on contract.id = request.contract_id
  where contract.user_id = p_user_id
    and request.status in (
      'processing', 'submitted', 'pending_reconciliation'
    )
  order by request.updated_at desc, request.id
  limit 1
  for update of request;

  if found then
    return jsonb_build_object(
      'status', case
        when v_request.status = 'pending_reconciliation'
          then 'pending_reconciliation'
        else 'already_submitted'
      end
    );
  end if;

  select count(*)::integer
  into v_current_count
  from public.billing_contracts as contract
  where contract.user_id = p_user_id
    and contract.status in ('active', 'cancel_at_period_end')
    and contract.access_starts_at <= v_now
    and contract.access_ends_at > v_now;

  if v_current_count = 0 then
    if exists (
      select 1
      from public.billing_refund_requests as request
      join public.billing_contracts as contract
        on contract.id = request.contract_id
      where contract.user_id = p_user_id
        and request.status = 'confirmed'
    ) then
      return jsonb_build_object('status', 'confirmed');
    end if;
    if exists (
      select 1 from public.billing_contracts as contract
      where contract.user_id = p_user_id
    ) then
      return jsonb_build_object('status', 'not_eligible');
    end if;
    return jsonb_build_object('status', 'not_found');
  elsif v_current_count > 1 then
    return jsonb_build_object('status', 'pending_reconciliation');
  end if;

  select contract.*
  into strict v_contract
  from public.billing_contracts as contract
  where contract.user_id = p_user_id
    and contract.status in ('active', 'cancel_at_period_end')
    and contract.access_starts_at <= v_now
    and contract.access_ends_at > v_now
  for update;

  v_eligibility_ends_at := v_contract.access_starts_at + interval '7 days';
  if v_now > v_eligibility_ends_at then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  select request.*
  into v_request
  from public.billing_refund_requests as request
  where request.contract_id = v_contract.id
  for update;

  if found then
    v_has_request := true;
    if v_request.status = 'confirmed' then
      return jsonb_build_object('status', 'confirmed');
    elsif v_request.status in ('processing', 'submitted') then
      return jsonb_build_object('status', 'already_submitted');
    elsif v_request.status = 'pending_reconciliation' then
      return jsonb_build_object('status', 'pending_reconciliation');
    elsif v_request.eligibility_ends_at < v_now then
      return jsonb_build_object('status', 'not_eligible');
    end if;
  end if;

  select payment.asaas_payment_id
  into v_payment_id
  from public.billing_payments as payment
  where payment.contract_id = v_contract.id
    and payment.status in ('confirmed', 'received')
    and payment.refunded_at is null
  order by coalesce(payment.received_at, payment.confirmed_at, payment.created_at),
    payment.id
  limit 1;

  if (v_contract.billing_mode = 'semiannual'
      and v_contract.payment_method = 'credit_card'
      and v_contract.asaas_installment_id is null
      and v_payment_id is null)
    or (not (v_contract.billing_mode = 'semiannual'
      and v_contract.payment_method = 'credit_card')
      and v_payment_id is null)
    or (v_contract.billing_mode = 'monthly'
      and v_contract.payment_method = 'credit_card'
      and v_contract.asaas_subscription_id is null)
  then
    return jsonb_build_object('status', 'not_ready');
  end if;

  if v_has_request and v_request.status = 'rejected' then
    update public.billing_refund_requests
    set status = 'processing',
        requested_at = v_now,
        last_attempt_at = v_now,
        provider_submitted_at = null,
        rejected_at = null,
        attempt_count = attempt_count + 1,
        last_error_code = null,
        updated_at = v_now
    where id = v_request.id
    returning * into v_request;
  else
    insert into public.billing_refund_requests (
      contract_id,
      user_id,
      status,
      previous_contract_status,
      eligibility_started_at,
      eligibility_ends_at,
      requested_at,
      last_attempt_at
    ) values (
      v_contract.id,
      p_user_id,
      'processing',
      v_contract.status,
      v_contract.access_starts_at,
      v_eligibility_ends_at,
      v_now,
      v_now
    )
    returning * into v_request;
  end if;

  update public.billing_contracts
  set status = 'refund_pending',
      updated_at = v_now
  where id = v_contract.id;

  return jsonb_build_object(
    'status', 'ready',
    'requestId', v_request.id,
    'billingMode', v_contract.billing_mode,
    'paymentMethod', v_contract.payment_method,
    'paymentId', v_payment_id,
    'installmentId', v_contract.asaas_installment_id,
    'subscriptionId', v_contract.asaas_subscription_id
  );
end;
$function$;

create function public.record_billing_refund_provider_result(
  p_request_id uuid,
  p_result text,
  p_error_code text default null,
  p_recurrence_canceled boolean default false
)
returns text
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.transaction_timestamp();
  v_request public.billing_refund_requests%rowtype;
  v_contract public.billing_contracts%rowtype;
  v_next_status text;
begin
  if p_result not in ('submitted', 'rejected', 'pending_reconciliation') then
    raise exception using errcode = '22023', message = 'invalid refund result';
  end if;
  if p_error_code is not null and p_error_code not in (
    'provider_rejected',
    'provider_ambiguous',
    'subscription_cancellation_failed',
    'state_persist_failed'
  ) then
    raise exception using errcode = '22023', message = 'invalid refund error code';
  end if;

  select request.*
  into strict v_request
  from public.billing_refund_requests as request
  where request.id = p_request_id
  for update;

  if v_request.status = 'confirmed' then
    return 'confirmed';
  end if;

  select contract.*
  into strict v_contract
  from public.billing_contracts as contract
  where contract.id = v_request.contract_id
  for update;

  if p_result = 'rejected' then
    if v_request.status <> 'processing' then
      return v_request.status;
    end if;

    update public.billing_refund_requests
    set status = 'rejected',
        rejected_at = v_now,
        last_error_code = p_error_code,
        updated_at = v_now
    where id = p_request_id;

    update public.billing_contracts
    set status = v_request.previous_contract_status,
        updated_at = v_now
    where id = v_request.contract_id
      and status = 'refund_pending';

    return 'rejected';
  end if;

  if p_result = 'pending_reconciliation' then
    update public.billing_refund_requests
    set status = 'pending_reconciliation',
        recurrence_canceled_at = case
          when p_recurrence_canceled
            then coalesce(recurrence_canceled_at, v_now)
          else recurrence_canceled_at
        end,
        last_error_code = p_error_code,
        updated_at = v_now
    where id = p_request_id;
    return 'pending_reconciliation';
  end if;

  v_next_status := case
    when v_request.refund_confirmed_at is not null
      and (
        v_contract.billing_mode <> 'monthly'
        or v_contract.payment_method <> 'credit_card'
        or v_request.recurrence_canceled_at is not null
        or p_recurrence_canceled
      )
      then 'confirmed'
    else 'submitted'
  end;

  update public.billing_refund_requests
  set status = v_next_status,
      provider_submitted_at = coalesce(provider_submitted_at, v_now),
      recurrence_canceled_at = case
        when p_recurrence_canceled then coalesce(recurrence_canceled_at, v_now)
        else recurrence_canceled_at
      end,
      last_error_code = null,
      updated_at = v_now
  where id = p_request_id;

  return v_next_status;
end;
$function$;

revoke execute on function public.begin_billing_refund(uuid)
from public, anon, authenticated;
grant execute on function public.begin_billing_refund(uuid)
to service_role;

revoke execute on function public.record_billing_refund_provider_result(
  uuid, text, text, boolean
)
from public, anon, authenticated;
grant execute on function public.record_billing_refund_provider_result(
  uuid, text, text, boolean
)
to service_role;

insert into public.billing_prices (
  id,
  product_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  installment_limit,
  access_months,
  is_active
) values
  (
    '20000000-0000-4000-8000-000000000001',
    'quick_diagnosis_pro',
    'monthly',
    1,
    3990,
    'BRL',
    null,
    1,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'quick_diagnosis_pro',
    'semiannual',
    1,
    17940,
    'BRL',
    6,
    6,
    true
  );
