create function public.list_admin_user_diagnoses_v2(
  p_user_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  page_size integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null)
    or (
      p_cursor_id is not null
      and p_cursor_id !~ '^[0-9]+$'
    )
  then
    raise exception using errcode = '22023',
      message = 'invalid diagnosis collection cursor';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  if p_user_id is null
    or p_user_id = administrator_id
    or not exists (select 1 from auth.users where id = p_user_id)
  then
    return null;
  end if;

  with windowed as (
    select
      diagnosis.id,
      diagnosis.created_at,
      pg_catalog.jsonb_build_object(
        'id', diagnosis.id::text,
        'createdAt', diagnosis.created_at,
        'updatedAt', diagnosis.updated_at,
        'deletedAt', diagnosis.deleted_at,
        'version', diagnosis.version,
        'category', diagnosis.business_category,
        'scenario', diagnosis.scenario,
        'analysisMode', diagnosis.analysis_mode,
        'isFreeReport', diagnosis.is_free_report,
        'currentPriceCents', diagnosis.current_price_cents,
        'realMarginBasisPoints', diagnosis.real_margin_basis_points,
        'unitProfitCents', diagnosis.unit_profit_cents,
        'monthlyGrossRevenueCents', diagnosis.monthly_gross_revenue_cents,
        'monthlyResultCents', diagnosis.monthly_result_cents,
        'itemCount', diagnosis.item_count,
        'isPartial', diagnosis.is_partial,
        'verdict', diagnosis.verdict,
        'priority', diagnosis.priority,
        'aiUsage', usage.ai_usage
      ) as item
    from public.diagnoses as diagnosis
    left join lateral (
      select pg_catalog.jsonb_build_object(
        'completedTurns', aggregate.completed_turns,
        'failedTurns', aggregate.failed_turns,
        'inputTokens', aggregate.input_tokens,
        'cachedInputTokens', aggregate.cached_input_tokens,
        'outputTokens', aggregate.output_tokens,
        'lastUsedAt', aggregate.last_used_at,
        'models', coalesce(models.items, '[]'::jsonb)
      ) as ai_usage
      from (
        select
          pg_catalog.count(*) filter (
            where turn.status = 'completed'
          )::integer as completed_turns,
          pg_catalog.count(*) filter (
            where turn.status = 'failed'
          )::integer as failed_turns,
          coalesce(
            pg_catalog.sum(coalesce(turn.input_tokens, 0)) filter (
              where turn.status = 'completed'
            ),
            0
          )::bigint as input_tokens,
          coalesce(
            pg_catalog.sum(coalesce(turn.cached_input_tokens, 0)) filter (
              where turn.status = 'completed'
            ),
            0
          )::bigint as cached_input_tokens,
          coalesce(
            pg_catalog.sum(coalesce(turn.output_tokens, 0)) filter (
              where turn.status = 'completed'
            ),
            0
          )::bigint as output_tokens,
          pg_catalog.max(
            coalesce(turn.completed_at, turn.created_at)
          ) as last_used_at,
          pg_catalog.count(*) > 0 as has_turns
        from public.report_ai_conversations as conversation
        join public.report_ai_turns as turn
          on turn.conversation_id = conversation.id
          and turn.user_id = conversation.user_id
        where conversation.diagnosis_id = diagnosis.id
          and conversation.user_id = diagnosis.user_id
          and conversation.report_version = diagnosis.version
      ) as aggregate
      cross join lateral (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'model', model_usage.model,
            'inputTokens', model_usage.input_tokens,
            'cachedInputTokens', model_usage.cached_input_tokens,
            'outputTokens', model_usage.output_tokens
          )
          order by model_usage.model
        ) as items
        from (
          select
            turn.model,
            pg_catalog.sum(coalesce(turn.input_tokens, 0))::bigint
              as input_tokens,
            pg_catalog.sum(coalesce(turn.cached_input_tokens, 0))::bigint
              as cached_input_tokens,
            pg_catalog.sum(coalesce(turn.output_tokens, 0))::bigint
              as output_tokens
          from public.report_ai_conversations as conversation
          join public.report_ai_turns as turn
            on turn.conversation_id = conversation.id
            and turn.user_id = conversation.user_id
          where conversation.diagnosis_id = diagnosis.id
            and conversation.user_id = diagnosis.user_id
            and conversation.report_version = diagnosis.version
            and turn.status = 'completed'
          group by turn.model
        ) as model_usage
      ) as models
      where aggregate.has_turns
    ) as usage on true
    where diagnosis.user_id = p_user_id
      and (
        p_cursor_created_at is null
        or (diagnosis.created_at, diagnosis.id)
          < (p_cursor_created_at, p_cursor_id::bigint)
      )
    order by diagnosis.created_at desc, diagnosis.id desc
    limit page_size + 1
  ),
  numbered as (
    select
      windowed.*,
      pg_catalog.row_number() over (
        order by windowed.created_at desc, windowed.id desc
      ) as position
    from windowed
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      pg_catalog.jsonb_agg(
        numbered.item order by numbered.created_at desc, numbered.id desc
      ) filter (where numbered.position <= page_size),
      '[]'::jsonb
    ),
    'nextCursor', case when pg_catalog.count(*) > page_size then
      pg_catalog.jsonb_build_object(
        'createdAt',
        (
          pg_catalog.array_agg(numbered.created_at)
            filter (where numbered.position = page_size)
        )[1],
        'id',
        (
          pg_catalog.array_agg(numbered.id::text)
            filter (where numbered.position = page_size)
        )[1]
      )
    else null end
  )
  into result
  from numbered;

  return result;
end;
$function$;

revoke execute on function public.list_admin_user_diagnoses_v2(
  uuid, timestamptz, text, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_user_diagnoses_v2(
  uuid, timestamptz, text, integer
) to authenticated;

create function public.list_admin_user_subscriptions_v2(
  p_user_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  page_size integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = '22023',
      message = 'invalid subscription collection cursor';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  if p_user_id is null
    or p_user_id = administrator_id
    or not exists (select 1 from auth.users where id = p_user_id)
  then
    return null;
  end if;

  with windowed as (
    select
      contract.id,
      contract.created_at,
      pg_catalog.jsonb_build_object(
        'id', contract.id,
        'createdAt', contract.created_at,
        'catalogCode', contract.catalog_code,
        'billingMode', contract.billing_mode,
        'paymentMethod', contract.payment_method,
        'chargeType', contract.charge_type,
        'amountCents', contract.amount_cents,
        'currency', contract.currency,
        'installmentLimit', contract.installment_limit,
        'accessMonths', contract.access_months,
        'bonusMonths', contract.bonus_months,
        'status', contract.status,
        'accessStartsAt', contract.access_starts_at,
        'accessEndsAt', contract.access_ends_at,
        'cancelAtPeriodEnd', contract.cancel_at_period_end,
        'cancellationRequestedAt', contract.cancellation_requested_at,
        'cancellationConfirmedAt', contract.cancellation_confirmed_at,
        'canceledAt', contract.canceled_at,
        'payment', pg_catalog.jsonb_build_object(
          'confirmedCount', payment.confirmed_count,
          'receivedCents', payment.received_cents,
          'lastPaymentAt', payment.last_payment_at
        ),
        'refund', case when refund.id is null then null else
          pg_catalog.jsonb_build_object(
            'status', refund.status,
            'requestedAt', refund.requested_at,
            'refundConfirmedAt', refund.refund_confirmed_at
          )
        end
      ) as item
    from public.billing_contracts as contract
    left join lateral (
      select
        pg_catalog.count(*) filter (
          where candidate.confirmed_at is not null
            or candidate.received_at is not null
        )::integer as confirmed_count,
        coalesce(
          pg_catalog.sum(candidate.value_cents) filter (
            where candidate.confirmed_at is not null
              or candidate.received_at is not null
          ),
          0
        )::bigint as received_cents,
        pg_catalog.max(
          coalesce(candidate.received_at, candidate.confirmed_at)
        ) as last_payment_at
      from public.billing_payments as candidate
      where candidate.contract_id = contract.id
    ) as payment on true
    left join public.billing_refund_requests as refund
      on refund.contract_id = contract.id
    where contract.user_id = p_user_id
      and (
        p_cursor_created_at is null
        or (contract.created_at, contract.id)
          < (p_cursor_created_at, p_cursor_id)
      )
    order by contract.created_at desc, contract.id desc
    limit page_size + 1
  ),
  numbered as (
    select
      windowed.*,
      pg_catalog.row_number() over (
        order by windowed.created_at desc, windowed.id desc
      ) as position
    from windowed
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      pg_catalog.jsonb_agg(
        numbered.item order by numbered.created_at desc, numbered.id desc
      ) filter (where numbered.position <= page_size),
      '[]'::jsonb
    ),
    'nextCursor', case when pg_catalog.count(*) > page_size then
      pg_catalog.jsonb_build_object(
        'createdAt',
        (
          pg_catalog.array_agg(numbered.created_at)
            filter (where numbered.position = page_size)
        )[1],
        'id',
        (
          pg_catalog.array_agg(numbered.id)
            filter (where numbered.position = page_size)
        )[1]
      )
    else null end
  )
  into result
  from numbered;

  return result;
end;
$function$;

revoke execute on function public.list_admin_user_subscriptions_v2(
  uuid, timestamptz, uuid, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_user_subscriptions_v2(
  uuid, timestamptz, uuid, integer
) to authenticated;
