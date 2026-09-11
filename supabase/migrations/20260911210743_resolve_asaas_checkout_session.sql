alter function public.apply_asaas_webhook_event(text, text, jsonb)
rename to apply_asaas_webhook_event_v1;

alter function public.apply_asaas_webhook_event_v1(text, text, jsonb)
set schema private;

revoke all on function private.apply_asaas_webhook_event_v1(text, text, jsonb)
from public, anon, authenticated;
grant execute on function private.apply_asaas_webhook_event_v1(text, text, jsonb)
to service_role;

create function public.apply_asaas_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns text
language sql
security invoker
set search_path = ''
as $$
  with provider_checkout as (
    select coalesce(
      nullif(btrim(p_payload -> 'payment' ->> 'checkoutSession'), ''),
      nullif(btrim(p_payload -> 'subscription' ->> 'checkoutSession'), '')
    ) as id
  ),
  normalized_payload as (
    select case
      when provider_checkout.id is null
        or nullif(btrim(p_payload -> 'checkout' ->> 'id'), '') is not null
      then p_payload
      else jsonb_set(
        p_payload,
        '{checkout}',
        case
          when jsonb_typeof(p_payload -> 'checkout') = 'object'
            then p_payload -> 'checkout'
          else '{}'::jsonb
        end || jsonb_build_object('id', provider_checkout.id),
        true
      )
    end as value
    from provider_checkout
  )
  select private.apply_asaas_webhook_event_v1(
    p_event_id,
    p_event_type,
    normalized_payload.value
  )
  from normalized_payload;
$$;

revoke all on function public.apply_asaas_webhook_event(text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_asaas_webhook_event(text, text, jsonb)
to service_role;
