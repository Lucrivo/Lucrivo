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
    billing_mode in ('monthly', 'annual')
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
      billing_mode = 'annual'
      and installment_limit = 12
      and access_months = 12
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
    billing_mode in ('monthly', 'annual')
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
      ('annual', 'credit_card', 'installment'),
      ('annual', 'pix', 'detached')
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
      billing_mode = 'annual'
      and installment_limit = 12
      and access_months = 12
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
        and billing_mode = 'annual'
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
      and status = 'cancel_at_period_end'
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

revoke all on table public.billing_prices
from public, anon, authenticated, service_role;
revoke all on table public.billing_customers
from public, anon, authenticated, service_role;
revoke all on table public.billing_contracts
from public, anon, authenticated, service_role;
revoke all on table public.billing_payments
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

grant select, insert, update, delete on table public.billing_prices
to service_role;
grant select, insert, update, delete on table public.billing_customers
to service_role;
grant select, insert, update, delete on table public.billing_contracts
to service_role;
grant select, insert, update, delete on table public.billing_payments
to service_role;
grant select, insert, update, delete on table public.asaas_webhook_events
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
    4990,
    'BRL',
    null,
    1,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'quick_diagnosis_pro',
    'annual',
    1,
    47880,
    'BRL',
    12,
    12,
    true
  );
