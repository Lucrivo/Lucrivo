create function private.parse_asaas_event_instant(p_value text)
returns timestamptz
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_value ~ '^\d{4}-\d{2}-\d{2}$' then
    return p_value::date::timestamp at time zone 'America/Sao_Paulo';
  end if;

  if p_value ~ '(Z|[+-]\d{2}:?\d{2})$' then
    return p_value::timestamptz;
  end if;

  return replace(p_value, 'T', ' ')::timestamp
    at time zone 'America/Sao_Paulo';
end;
$$;

revoke all on function private.parse_asaas_event_instant(text)
from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.parse_asaas_event_instant(text)
to service_role;

create function public.apply_asaas_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserted boolean;
  v_ledger_status text;
  v_known_event boolean;
  v_contract_id uuid;
  v_contract public.billing_contracts%rowtype;
  v_external_reference text;
  v_checkout_id text;
  v_subscription_id text;
  v_installment_id text;
  v_payment_id text;
  v_customer_id text;
  v_event_at timestamptz;
  v_payment_status text;
  v_payment_value_cents bigint;
  v_payment_installment_number integer;
  v_payment_due_date date;
  v_existing_payment_contract_id uuid;
  v_existing_payment_status text;
  v_new_access_end timestamptz;
begin
  if p_event_id is null or length(btrim(p_event_id)) = 0 then
    raise exception using errcode = '22023', message = 'invalid webhook event id';
  end if;

  if p_event_type is null or length(btrim(p_event_type)) = 0 then
    raise exception using errcode = '22023', message = 'invalid webhook event type';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid webhook payload';
  end if;

  insert into public.asaas_webhook_events (
    id,
    event_type,
    payload,
    processing_status,
    attempt_count
  ) values (
    p_event_id,
    p_event_type,
    p_payload,
    'received',
    1
  )
  on conflict (id) do nothing
  returning true into v_inserted;

  select processing_status
  into v_ledger_status
  from public.asaas_webhook_events
  where id = p_event_id
  for update;

  if not coalesce(v_inserted, false) then
    if v_ledger_status in ('processed', 'ignored') then
      return 'duplicate';
    end if;

    update public.asaas_webhook_events
    set event_type = p_event_type,
        payload = p_payload,
        processing_status = 'received',
        attempt_count = attempt_count + 1,
        last_error = null,
        processed_at = null
    where id = p_event_id;
  end if;

  v_known_event := p_event_type in (
    'CHECKOUT_CREATED',
    'CHECKOUT_PAID',
    'CHECKOUT_CANCELED',
    'CHECKOUT_EXPIRED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_INACTIVATED',
    'SUBSCRIPTION_DELETED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED',
    'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
    'PAYMENT_OVERDUE',
    'PAYMENT_REFUNDED',
    'PAYMENT_PARTIALLY_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE'
  );

  if not v_known_event then
    update public.asaas_webhook_events
    set processing_status = 'ignored',
        last_error = null,
        processed_at = statement_timestamp()
    where id = p_event_id;

    return 'ignored';
  end if;

  begin
    v_event_at := private.parse_asaas_event_instant(
      nullif(btrim(p_payload ->> 'dateCreated'), '')
    );
    v_checkout_id := nullif(btrim(p_payload -> 'checkout' ->> 'id'), '');
    v_subscription_id := coalesce(
      nullif(btrim(p_payload -> 'payment' ->> 'subscription'), ''),
      nullif(btrim(p_payload -> 'subscription' ->> 'id'), '')
    );
    v_installment_id := nullif(
      btrim(p_payload -> 'payment' ->> 'installment'),
      ''
    );
    v_payment_id := nullif(btrim(p_payload -> 'payment' ->> 'id'), '');
    v_customer_id := coalesce(
      nullif(btrim(p_payload -> 'checkout' ->> 'customer'), ''),
      nullif(btrim(p_payload -> 'payment' ->> 'customer'), ''),
      nullif(btrim(p_payload -> 'subscription' ->> 'customer'), '')
    );
    v_external_reference := coalesce(
      nullif(btrim(p_payload -> 'checkout' ->> 'externalReference'), ''),
      nullif(btrim(p_payload -> 'payment' ->> 'externalReference'), ''),
      nullif(btrim(p_payload -> 'subscription' ->> 'externalReference'), '')
    );

    if v_external_reference is not null then
      select id into v_contract_id
      from public.billing_contracts
      where external_reference = v_external_reference;
    end if;

    if v_contract_id is null and v_checkout_id is not null then
      select id into v_contract_id
      from public.billing_contracts
      where asaas_checkout_id = v_checkout_id;
    end if;

    if v_contract_id is null and v_subscription_id is not null then
      select id into v_contract_id
      from public.billing_contracts
      where asaas_subscription_id = v_subscription_id;
    end if;

    if v_contract_id is null and v_installment_id is not null then
      select id into v_contract_id
      from public.billing_contracts
      where asaas_installment_id = v_installment_id;
    end if;

    if v_contract_id is null and v_payment_id is not null then
      select contract_id into v_contract_id
      from public.billing_payments
      where asaas_payment_id = v_payment_id;
    end if;

    if v_contract_id is null and v_customer_id is not null then
      select case
        when count(*) = 1 then (array_agg(contract.id))[1]
        else null
      end
      into v_contract_id
      from public.billing_customers as customer
      join public.billing_contracts as contract
        on contract.user_id = customer.user_id
      where customer.asaas_customer_id = v_customer_id
        and contract.status in (
          'pending',
          'pending_reconciliation',
          'active',
          'cancel_at_period_end'
        );
    end if;

    if v_contract_id is null then
      update public.asaas_webhook_events
      set processing_status = 'failed',
          last_error = 'contract_unresolved',
          processed_at = null
      where id = p_event_id;

      return 'unresolved';
    end if;

    select * into strict v_contract
    from public.billing_contracts
    where id = v_contract_id
    for update;

    update public.asaas_webhook_events
    set contract_id = v_contract.id
    where id = p_event_id;

    if v_customer_id is not null then
      insert into public.billing_customers (
        user_id,
        asaas_customer_id,
        updated_at
      ) values (
        v_contract.user_id,
        v_customer_id,
        statement_timestamp()
      )
      on conflict (user_id) do update
      set asaas_customer_id = excluded.asaas_customer_id,
          updated_at = excluded.updated_at;
    end if;

    update public.billing_contracts
    set asaas_checkout_id = coalesce(asaas_checkout_id, v_checkout_id),
        asaas_subscription_id = case
          when billing_mode = 'monthly'
            and payment_method = 'credit_card'
            and charge_type = 'recurring'
          then coalesce(asaas_subscription_id, v_subscription_id)
          else asaas_subscription_id
        end,
        asaas_installment_id = case
          when billing_mode = 'annual'
            and payment_method = 'credit_card'
            and charge_type = 'installment'
          then coalesce(asaas_installment_id, v_installment_id)
          else asaas_installment_id
        end,
        updated_at = statement_timestamp()
    where id = v_contract.id;

    if p_event_type = 'CHECKOUT_PAID' then
      update public.billing_contracts
      set status = 'active',
          access_starts_at = v_event_at,
          access_ends_at = v_event_at
            + make_interval(months => access_months),
          updated_at = statement_timestamp()
      where id = v_contract.id
        and access_starts_at is null
        and status in ('pending', 'pending_reconciliation');

    elsif p_event_type in ('CHECKOUT_CANCELED', 'CHECKOUT_EXPIRED') then
      update public.billing_contracts
      set status = case p_event_type
            when 'CHECKOUT_CANCELED' then 'canceled'
            else 'expired'
          end,
          canceled_at = case p_event_type
            when 'CHECKOUT_CANCELED' then v_event_at
            else canceled_at
          end,
          updated_at = statement_timestamp()
      where id = v_contract.id
        and status = 'pending';

    elsif p_event_type in (
      'SUBSCRIPTION_INACTIVATED',
      'SUBSCRIPTION_DELETED'
    ) then
      update public.billing_contracts
      set status = 'cancel_at_period_end',
          cancel_at_period_end = true,
          cancellation_confirmed_at = v_event_at,
          updated_at = statement_timestamp()
      where id = v_contract.id
        and billing_mode = 'monthly'
        and payment_method = 'credit_card'
        and charge_type = 'recurring'
        and status in ('active', 'cancel_at_period_end');

    elsif p_event_type like 'PAYMENT\_%' escape '\' then
      if v_payment_id is null
        or jsonb_typeof(p_payload -> 'payment') <> 'object'
      then
        raise exception using
          errcode = '22023',
          message = 'invalid payment webhook payload';
      end if;

      v_payment_value_cents := round(
        (p_payload -> 'payment' ->> 'value')::numeric * 100
      )::bigint;
      v_payment_due_date := case
        when nullif(btrim(p_payload -> 'payment' ->> 'dueDate'), '') is null
          then null
        else (p_payload -> 'payment' ->> 'dueDate')::date
      end;
      v_payment_installment_number := case
        when nullif(
          btrim(p_payload -> 'payment' ->> 'installmentNumber'),
          ''
        ) is null then null
        else (p_payload -> 'payment' ->> 'installmentNumber')::integer
      end;
      v_payment_status := case p_event_type
        when 'PAYMENT_CONFIRMED' then 'confirmed'
        when 'PAYMENT_RECEIVED' then 'received'
        when 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' then 'capture_refused'
        when 'PAYMENT_OVERDUE' then 'overdue'
        when 'PAYMENT_REFUNDED' then 'refunded'
        when 'PAYMENT_PARTIALLY_REFUNDED' then 'partially_refunded'
        when 'PAYMENT_CHARGEBACK_REQUESTED' then 'chargeback_requested'
        when 'PAYMENT_CHARGEBACK_DISPUTE' then 'chargeback_dispute'
      end;

      select contract_id, status
      into v_existing_payment_contract_id, v_existing_payment_status
      from public.billing_payments
      where asaas_payment_id = v_payment_id
      for update;

      if v_existing_payment_contract_id is not null
        and v_existing_payment_contract_id <> v_contract.id
      then
        raise exception using
          errcode = '23505',
          message = 'payment already belongs to another contract';
      end if;

      insert into public.billing_payments (
        contract_id,
        asaas_payment_id,
        status,
        value_cents,
        installment_number,
        due_date,
        confirmed_at,
        received_at,
        refunded_at,
        chargeback_at,
        updated_at
      ) values (
        v_contract.id,
        v_payment_id,
        v_payment_status,
        v_payment_value_cents,
        v_payment_installment_number,
        v_payment_due_date,
        case when p_event_type = 'PAYMENT_CONFIRMED' then v_event_at end,
        case when p_event_type = 'PAYMENT_RECEIVED' then v_event_at end,
        case when p_event_type = 'PAYMENT_REFUNDED' then v_event_at end,
        case when p_event_type in (
          'PAYMENT_CHARGEBACK_REQUESTED',
          'PAYMENT_CHARGEBACK_DISPUTE'
        ) then v_event_at end,
        statement_timestamp()
      )
      on conflict (asaas_payment_id) do update
      set status = excluded.status,
          value_cents = excluded.value_cents,
          installment_number = coalesce(
            excluded.installment_number,
            public.billing_payments.installment_number
          ),
          due_date = coalesce(
            excluded.due_date,
            public.billing_payments.due_date
          ),
          confirmed_at = coalesce(
            public.billing_payments.confirmed_at,
            excluded.confirmed_at
          ),
          received_at = coalesce(
            public.billing_payments.received_at,
            excluded.received_at
          ),
          refunded_at = coalesce(
            public.billing_payments.refunded_at,
            excluded.refunded_at
          ),
          chargeback_at = coalesce(
            public.billing_payments.chargeback_at,
            excluded.chargeback_at
          ),
          updated_at = excluded.updated_at;

      if p_event_type = 'PAYMENT_CONFIRMED'
        and coalesce(v_existing_payment_status, '') not in (
          'confirmed',
          'received',
          'refunded',
          'partially_refunded',
          'chargeback_requested',
          'chargeback_dispute'
        )
      then
        if v_contract.billing_mode = 'monthly'
          and v_contract.payment_method = 'credit_card'
        then
          if v_payment_due_date is null then
            raise exception using
              errcode = '22023',
              message = 'monthly card payment requires due date';
          end if;

          v_new_access_end := (
            v_payment_due_date::text || ' 00:00:00+00'
          )::timestamptz + interval '1 month';

          update public.billing_contracts
          set status = case
                when status in ('pending', 'pending_reconciliation')
                  then 'active'
                else status
              end,
              access_starts_at = coalesce(access_starts_at, v_event_at),
              access_ends_at = greatest(
                coalesce(access_ends_at, v_new_access_end),
                v_new_access_end
              ),
              updated_at = statement_timestamp()
          where id = v_contract.id
            and status in (
              'pending',
              'pending_reconciliation',
              'active',
              'cancel_at_period_end'
            );

        elsif v_contract.billing_mode = 'monthly'
          and v_contract.payment_method = 'pix'
        then
          update public.billing_contracts
          set status = 'active',
              access_starts_at = v_event_at,
              access_ends_at = v_event_at + interval '1 month',
              updated_at = statement_timestamp()
          where id = v_contract.id
            and access_starts_at is null
            and status in ('pending', 'pending_reconciliation');

        elsif v_contract.billing_mode = 'annual' then
          update public.billing_contracts
          set status = 'active',
              access_starts_at = v_event_at,
              access_ends_at = v_event_at + interval '12 months',
              updated_at = statement_timestamp()
          where id = v_contract.id
            and access_starts_at is null
            and status in ('pending', 'pending_reconciliation');
        end if;
      end if;

      if p_event_type = 'PAYMENT_REFUNDED' then
        update public.billing_contracts
        set status = 'refunded',
            access_ends_at = case
              when access_ends_at is null then null
              else least(access_ends_at, statement_timestamp())
            end,
            cancel_at_period_end = false,
            cancellation_confirmed_at = null,
            updated_at = statement_timestamp()
        where id = v_contract.id;

      elsif p_event_type in (
        'PAYMENT_CHARGEBACK_REQUESTED',
        'PAYMENT_CHARGEBACK_DISPUTE'
      ) then
        update public.billing_contracts
        set status = 'chargeback',
            access_ends_at = case
              when access_ends_at is null then null
              else least(access_ends_at, statement_timestamp())
            end,
            cancel_at_period_end = false,
            cancellation_confirmed_at = null,
            updated_at = statement_timestamp()
        where id = v_contract.id;
      end if;
    end if;

    update public.asaas_webhook_events
    set processing_status = 'processed',
        last_error = case
          when p_event_type = 'PAYMENT_PARTIALLY_REFUNDED'
            then 'manual_review_required'
          else null
        end,
        processed_at = statement_timestamp()
    where id = p_event_id;

    return 'processed';
  exception
    when others then
      update public.asaas_webhook_events
      set processing_status = 'failed',
          last_error = 'processing_failed',
          processed_at = null
      where id = p_event_id;

      return 'unresolved';
  end;
end;
$$;

revoke all on function public.apply_asaas_webhook_event(text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_asaas_webhook_event(text, text, jsonb)
to service_role;
