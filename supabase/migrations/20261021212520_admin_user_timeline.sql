create function public.list_admin_user_history_v2(
  p_user_id uuid,
  p_cursor_occurred_at timestamptz default null,
  p_cursor_event_key text default null,
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

  if (p_cursor_occurred_at is null) <> (p_cursor_event_key is null)
    or pg_catalog.length(coalesce(p_cursor_event_key, '')) > 200
    or (p_cursor_event_key is not null and p_cursor_event_key = '')
  then
    raise exception using errcode = '22023',
      message = 'invalid user history cursor';
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

  with paid_payments as materialized (
    select
      payment.id,
      payment.contract_id,
      payment.value_cents,
      payment.installment_number,
      coalesce(payment.received_at, payment.confirmed_at) as occurred_at,
      contract.billing_mode,
      contract.payment_method,
      contract.charge_type,
      pg_catalog.row_number() over (
        partition by contract.id
        order by
          coalesce(payment.received_at, payment.confirmed_at),
          payment.id
      ) as position
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id = p_user_id
      and (
        payment.confirmed_at is not null
        or payment.received_at is not null
      )
  ),
  events as materialized (
    select
      'account:' || app_user.id::text as event_key,
      app_user.created_at as occurred_at,
      'account_registered'::text as kind,
      'Conta criada'::text as title,
      '{}'::jsonb as payload
    from auth.users as app_user
    where app_user.id = p_user_id

    union all

    select
      'onboarding:' || profile.user_id::text,
      profile.completed_at,
      'onboarding_completed',
      'Onboarding concluído',
      pg_catalog.jsonb_build_object(
        'fullName', profile.full_name,
        'segment', pg_catalog.jsonb_build_object(
          'id', segment.id,
          'name', segment.name
        ),
        'subcategory', pg_catalog.jsonb_build_object(
          'id', subcategory.id,
          'name', coalesce(subcategory.name, 'Outro'),
          'customName', case when subcategory.id is null
            then profile.custom_subcategory else null end
        )
      )
    from public.onboarding_profiles as profile
    join public.business_segments as segment
      on segment.id = profile.segment_id
    left join public.business_subcategories as subcategory
      on subcategory.id = profile.subcategory_id
    where profile.user_id = p_user_id

    union all

    select
      'profile:' || profile.user_id::text,
      profile.updated_at,
      'profile_updated',
      'Perfil atualizado',
      pg_catalog.jsonb_build_object(
        'fullName', profile.full_name,
        'segment', pg_catalog.jsonb_build_object(
          'id', segment.id,
          'name', segment.name
        ),
        'subcategory', pg_catalog.jsonb_build_object(
          'id', subcategory.id,
          'name', coalesce(subcategory.name, 'Outro'),
          'customName', case when subcategory.id is null
            then profile.custom_subcategory else null end
        )
      )
    from public.onboarding_profiles as profile
    join public.business_segments as segment
      on segment.id = profile.segment_id
    left join public.business_subcategories as subcategory
      on subcategory.id = profile.subcategory_id
    where profile.user_id = p_user_id
      and profile.updated_at > profile.completed_at

    union all

    select
      'consent:' || consent.id::text,
      consent.created_at,
      case consent.decision
        when 'granted' then 'whatsapp_consent_granted'
        when 'declined' then 'whatsapp_consent_declined'
        when 'revoked' then 'whatsapp_consent_revoked'
      end,
      case consent.decision
        when 'granted' then 'Consentimento de WhatsApp concedido'
        when 'declined' then 'Consentimento de WhatsApp recusado'
        when 'revoked' then 'Consentimento de WhatsApp revogado'
      end,
      pg_catalog.jsonb_build_object(
        'source', consent.source,
        'copyVersion', consent.copy_version
      )
    from private.whatsapp_consent_events as consent
    where consent.user_id = p_user_id

    union all

    select
      'diagnosis:' || diagnosis.id::text,
      diagnosis.created_at,
      'diagnosis_created',
      'Diagnóstico criado',
      pg_catalog.jsonb_build_object(
        'diagnosisId', diagnosis.id::text,
        'category', diagnosis.business_category,
        'scenario', diagnosis.scenario,
        'analysisMode', diagnosis.analysis_mode,
        'isFreeReport', diagnosis.is_free_report,
        'verdict', diagnosis.verdict,
        'priority', diagnosis.priority,
        'aiUsage', usage.ai_usage
      )
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

    union all

    select
      'contract:' || contract.id::text || ':created',
      contract.created_at,
      'subscription_created',
      'Assinatura criada',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'billingMode', contract.billing_mode,
        'paymentMethod', contract.payment_method,
        'chargeType', contract.charge_type,
        'amountCents', contract.amount_cents,
        'status', contract.status,
        'accessStartsAt', contract.access_starts_at,
        'accessEndsAt', contract.access_ends_at
      )
    from public.billing_contracts as contract
    where contract.user_id = p_user_id

    union all

    select
      'payment:' || payment.id::text || ':activated',
      payment.occurred_at,
      'subscription_activated',
      'Assinatura ativada',
      pg_catalog.jsonb_build_object(
        'contractId', payment.contract_id,
        'paymentId', payment.id,
        'billingMode', payment.billing_mode,
        'paymentMethod', payment.payment_method,
        'amountCents', payment.value_cents,
        'installmentNumber', payment.installment_number
      )
    from paid_payments as payment
    where payment.position = 1

    union all

    select
      'payment:' || payment.id::text || ':renewed',
      payment.occurred_at,
      'subscription_renewed',
      'Assinatura renovada',
      pg_catalog.jsonb_build_object(
        'contractId', payment.contract_id,
        'paymentId', payment.id,
        'billingMode', payment.billing_mode,
        'paymentMethod', payment.payment_method,
        'amountCents', payment.value_cents,
        'installmentNumber', payment.installment_number
      )
    from paid_payments as payment
    where payment.billing_mode = 'monthly'
      and payment.charge_type = 'recurring'
      and payment.position > 1

    union all

    select
      'contract:' || contract.id::text || ':cancellation_requested',
      contract.cancellation_requested_at,
      'cancellation_requested',
      'Cancelamento solicitado',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'accessEndsAt', contract.access_ends_at
      )
    from public.billing_contracts as contract
    where contract.user_id = p_user_id
      and contract.cancellation_requested_at is not null

    union all

    select
      'contract:' || contract.id::text || ':cancellation_confirmed',
      contract.cancellation_confirmed_at,
      'cancellation_confirmed',
      'Cancelamento confirmado',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'accessEndsAt', contract.access_ends_at
      )
    from public.billing_contracts as contract
    where contract.user_id = p_user_id
      and contract.cancellation_confirmed_at is not null

    union all

    select
      'contract:' || contract.id::text || ':expired',
      contract.access_ends_at,
      'subscription_expired',
      'Acesso expirado',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'accessEndsAt', contract.access_ends_at
      )
    from public.billing_contracts as contract
    where contract.user_id = p_user_id
      and contract.access_ends_at <= pg_catalog.statement_timestamp()
      and contract.status in ('expired', 'canceled', 'refunded', 'chargeback')

    union all

    select
      'refund:' || refund.id::text || ':requested',
      refund.requested_at,
      'refund_requested',
      'Reembolso solicitado',
      pg_catalog.jsonb_build_object(
        'contractId', refund.contract_id,
        'status', refund.status,
        'requestedAt', refund.requested_at,
        'refundConfirmedAt', refund.refund_confirmed_at
      )
    from public.billing_refund_requests as refund
    where refund.user_id = p_user_id

    union all

    select
      'refund:' || refund.id::text || ':confirmed',
      refund.refund_confirmed_at,
      'refund_confirmed',
      'Reembolso confirmado',
      pg_catalog.jsonb_build_object(
        'contractId', refund.contract_id,
        'status', refund.status,
        'requestedAt', refund.requested_at,
        'refundConfirmedAt', refund.refund_confirmed_at
      )
    from public.billing_refund_requests as refund
    where refund.user_id = p_user_id
      and refund.refund_confirmed_at is not null

    union all

    select
      'payment:' || payment.id::text || ':failed',
      payment.updated_at,
      'payment_failed',
      'Pagamento falhou',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'paymentId', payment.id,
        'billingMode', contract.billing_mode,
        'paymentMethod', contract.payment_method,
        'amountCents', payment.value_cents,
        'installmentNumber', payment.installment_number
      )
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id = p_user_id
      and payment.status in ('overdue', 'capture_refused')

    union all

    select
      'payment:' || payment.id::text || ':refunded',
      payment.refunded_at,
      'payment_refunded',
      'Pagamento reembolsado',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'paymentId', payment.id,
        'billingMode', contract.billing_mode,
        'paymentMethod', contract.payment_method,
        'amountCents', payment.value_cents,
        'installmentNumber', payment.installment_number
      )
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id = p_user_id
      and payment.status in ('refunded', 'partially_refunded')
      and payment.refunded_at is not null
      and not exists (
        select 1
        from public.billing_refund_requests as refund
        where refund.contract_id = contract.id
          and refund.refund_confirmed_at is not null
      )

    union all

    select
      'payment:' || payment.id::text || ':chargeback',
      payment.chargeback_at,
      'payment_chargeback',
      'Pagamento em chargeback',
      pg_catalog.jsonb_build_object(
        'contractId', contract.id,
        'paymentId', payment.id,
        'billingMode', contract.billing_mode,
        'paymentMethod', contract.payment_method,
        'amountCents', payment.value_cents,
        'installmentNumber', payment.installment_number
      )
    from public.billing_payments as payment
    join public.billing_contracts as contract
      on contract.id = payment.contract_id
    where contract.user_id = p_user_id
      and payment.status in ('chargeback_requested', 'chargeback_dispute')
      and payment.chargeback_at is not null

    union all

    select
      'admin:' || event.id::text,
      event.created_at,
      case event.action
        when 'courtesy_granted' then 'admin_courtesy_granted'
        when 'courtesy_ended' then 'admin_courtesy_ended'
        when 'blocked' then 'admin_blocked'
        when 'unblocked' then 'admin_unblocked'
        when 'soft_deleted' then 'admin_soft_deleted'
        when 'restored' then 'admin_restored'
      end,
      case event.action
        when 'courtesy_granted' then 'Cortesia concedida'
        when 'courtesy_ended' then 'Cortesia encerrada'
        when 'blocked' then 'Usuário bloqueado'
        when 'unblocked' then 'Usuário desbloqueado'
        when 'soft_deleted' then 'Usuário excluído'
        when 'restored' then 'Usuário restaurado'
      end,
      pg_catalog.jsonb_build_object(
        'actorEmail', coalesce(actor.email, 'E-mail indisponível'),
        'reason', event.reason,
        'changes', (
          select coalesce(
            pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'field', change.field,
                'before', change.before_value,
                'after', change.after_value
              ) order by change.field
            ) filter (where change.included),
            '[]'::jsonb
          )
          from (
            values
              (
                'blockedAt'::text,
                event.before_state -> 'blockedAt',
                event.after_state -> 'blockedAt',
                event.before_state ? 'blockedAt'
                  or event.after_state ? 'blockedAt'
              ),
              (
                'deletedAt'::text,
                event.before_state -> 'deletedAt',
                event.after_state -> 'deletedAt',
                event.before_state ? 'deletedAt'
                  or event.after_state ? 'deletedAt'
              ),
              (
                'courtesyExpiresAt'::text,
                event.before_state -> 'courtesyExpiresAt',
                event.after_state -> 'courtesyExpiresAt',
                event.before_state ? 'courtesyExpiresAt'
                  or event.after_state ? 'courtesyExpiresAt'
              )
          ) as change(field, before_value, after_value, included)
        )
      )
    from private.admin_user_events as event
    join auth.users as actor on actor.id = event.actor_id
    where event.user_id = p_user_id
  ),
  windowed as (
    select events.*
    from events
    where p_cursor_occurred_at is null
      or (events.occurred_at, events.event_key)
        < (p_cursor_occurred_at, p_cursor_event_key)
    order by events.occurred_at desc, events.event_key desc
    limit page_size + 1
  ),
  numbered as (
    select
      windowed.*,
      pg_catalog.row_number() over (
        order by windowed.occurred_at desc, windowed.event_key desc
      ) as position
    from windowed
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'eventKey', numbered.event_key,
          'occurredAt', numbered.occurred_at,
          'kind', numbered.kind,
          'title', numbered.title,
          'payload', numbered.payload
        )
        order by numbered.occurred_at desc, numbered.event_key desc
      ) filter (where numbered.position <= page_size),
      '[]'::jsonb
    ),
    'nextCursor', case when pg_catalog.count(*) > page_size then
      pg_catalog.jsonb_build_object(
        'createdAt',
        (
          pg_catalog.array_agg(numbered.occurred_at)
            filter (where numbered.position = page_size)
        )[1],
        'id',
        (
          pg_catalog.array_agg(numbered.event_key)
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

revoke execute on function public.list_admin_user_history_v2(
  uuid, timestamptz, text, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_user_history_v2(
  uuid, timestamptz, text, integer
) to authenticated;
