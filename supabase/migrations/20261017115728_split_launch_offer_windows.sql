alter table public.billing_prices
  drop constraint billing_prices_catalog_code_check,
  drop constraint billing_prices_catalog_shape_check;

alter table public.billing_prices
  add constraint billing_prices_catalog_code_check
    check (catalog_code in ('launch', 'launch_price', 'standard')),
  add constraint billing_prices_catalog_shape_check check (
    (
      catalog_code = 'launch'
      and billing_mode = 'monthly'
      and amount_cents = 3990
      and installment_limit is null
      and access_months = 2
      and bonus_months = 1
    )
    or (
      catalog_code = 'launch'
      and billing_mode = 'semiannual'
      and amount_cents = 17940
      and installment_limit = 6
      and access_months = 12
      and bonus_months = 6
      and amount_cents % installment_limit = 0
    )
    or (
      catalog_code = 'launch_price'
      and billing_mode = 'monthly'
      and amount_cents = 3990
      and installment_limit is null
      and access_months = 1
      and bonus_months = 0
    )
    or (
      catalog_code = 'launch_price'
      and billing_mode = 'semiannual'
      and amount_cents = 17940
      and installment_limit = 6
      and access_months = 6
      and bonus_months = 0
      and amount_cents % installment_limit = 0
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'monthly'
      and amount_cents = 4990
      and installment_limit is null
      and access_months = 1
      and bonus_months = 0
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'semiannual'
      and amount_cents = 23940
      and installment_limit = 6
      and access_months = 6
      and bonus_months = 0
      and amount_cents % installment_limit = 0
    )
  );

insert into public.billing_prices (
  id,
  product_code,
  catalog_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  installment_limit,
  access_months,
  bonus_months,
  is_active
) values
  (
    '20000000-0000-4000-8000-000000000005',
    'quick_diagnosis_pro',
    'launch_price',
    'monthly',
    3,
    3990,
    'BRL',
    null,
    1,
    0,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'quick_diagnosis_pro',
    'launch_price',
    'semiannual',
    3,
    17940,
    'BRL',
    6,
    6,
    0,
    true
  );

alter table public.billing_contracts
  drop constraint billing_contracts_catalog_code_check,
  drop constraint billing_contracts_snapshot_shape_check,
  drop constraint billing_contracts_renewal_adjustment_check;

alter table public.billing_contracts
  add constraint billing_contracts_catalog_code_check
    check (catalog_code in ('launch', 'launch_price', 'standard')),
  add constraint billing_contracts_snapshot_shape_check check (
    (
      catalog_code = 'launch'
      and billing_mode = 'monthly'
      and amount_cents = 3990
      and installment_limit is null
      and access_months = 2
      and bonus_months = 1
    )
    or (
      catalog_code = 'launch'
      and billing_mode = 'semiannual'
      and amount_cents = 17940
      and installment_limit = 6
      and access_months = 12
      and bonus_months = 6
      and amount_cents % installment_limit = 0
    )
    or (
      catalog_code = 'launch_price'
      and billing_mode = 'monthly'
      and amount_cents = 3990
      and installment_limit is null
      and access_months = 1
      and bonus_months = 0
    )
    or (
      catalog_code = 'launch_price'
      and billing_mode = 'semiannual'
      and amount_cents = 17940
      and installment_limit = 6
      and access_months = 6
      and bonus_months = 0
      and amount_cents % installment_limit = 0
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'monthly'
      and amount_cents = 4990
      and installment_limit is null
      and access_months = 1
      and bonus_months = 0
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'semiannual'
      and amount_cents = 23940
      and installment_limit = 6
      and access_months = 6
      and bonus_months = 0
      and amount_cents % installment_limit = 0
    )
  ),
  add constraint billing_contracts_renewal_adjustment_check check (
    (
      catalog_code in ('launch', 'launch_price')
      and billing_mode = 'monthly'
      and payment_method = 'credit_card'
      and charge_type = 'recurring'
      and renewal_adjustment_status in (
        'pending', 'processing', 'completed', 'pending_reconciliation'
      )
    )
    or (
      not (
        catalog_code in ('launch', 'launch_price')
        and billing_mode = 'monthly'
        and payment_method = 'credit_card'
        and charge_type = 'recurring'
      )
      and renewal_adjustment_status = 'not_required'
      and renewal_adjustment_attempt_count = 0
      and renewal_adjusted_at is null
      and renewal_adjustment_last_error_code is null
    )
  );

create or replace function public.begin_billing_renewal_adjustment(
  p_event_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.transaction_timestamp();
  v_contract_id uuid;
  v_contract public.billing_contracts%rowtype;
  v_initial_due_date date;
  v_next_due_date date;
begin
  select event.contract_id
  into v_contract_id
  from public.asaas_webhook_events as event
  where event.id = p_event_id;

  if v_contract_id is null then
    return pg_catalog.jsonb_build_object('status', 'not_required');
  end if;

  select contract.*
  into v_contract
  from public.billing_contracts as contract
  where contract.id = v_contract_id
  for update;

  if not found
    or v_contract.catalog_code not in ('launch', 'launch_price')
    or v_contract.billing_mode <> 'monthly'
    or v_contract.payment_method <> 'credit_card'
    or v_contract.charge_type <> 'recurring'
  then
    return pg_catalog.jsonb_build_object('status', 'not_required');
  end if;

  if v_contract.renewal_adjustment_status = 'completed' then
    return pg_catalog.jsonb_build_object('status', 'completed');
  end if;

  if v_contract.renewal_adjustment_status = 'processing'
    and v_contract.updated_at > v_now - interval '5 minutes'
  then
    return pg_catalog.jsonb_build_object(
      'status', 'not_ready', 'retry', true
    );
  end if;

  select payment.due_date
  into v_initial_due_date
  from public.billing_payments as payment
  where payment.contract_id = v_contract.id
    and payment.status in ('confirmed', 'received')
    and payment.due_date is not null
  order by payment.due_date, payment.id
  limit 1;

  if v_contract.asaas_subscription_id is null
    or v_contract.access_starts_at is null
    or v_contract.access_ends_at is null
    or v_initial_due_date is null
  then
    return pg_catalog.jsonb_build_object(
      'status', 'not_ready', 'retry', true
    );
  end if;

  update public.billing_contracts
  set renewal_adjustment_status = 'processing',
      renewal_adjustment_attempt_count = renewal_adjustment_attempt_count + 1,
      renewal_adjustment_last_error_code = null,
      updated_at = v_now
  where id = v_contract.id
    and (
      renewal_adjustment_status in ('pending', 'pending_reconciliation')
      or (
        renewal_adjustment_status = 'processing'
        and updated_at <= v_now - interval '5 minutes'
      )
    );

  if not found then
    return pg_catalog.jsonb_build_object(
      'status', 'not_ready', 'retry', true
    );
  end if;

  v_next_due_date := (
    v_initial_due_date
    + pg_catalog.make_interval(months => v_contract.access_months)
  )::date;

  return pg_catalog.jsonb_build_object(
    'status', 'ready',
    'contractId', v_contract.id,
    'subscriptionId', v_contract.asaas_subscription_id,
    'nextDueDate', v_next_due_date,
    'renewalAmountCents', 4990
  );
end;
$function$;

revoke all on function public.begin_billing_renewal_adjustment(text)
from public, anon, authenticated, service_role;
grant execute on function public.begin_billing_renewal_adjustment(text)
to service_role;
