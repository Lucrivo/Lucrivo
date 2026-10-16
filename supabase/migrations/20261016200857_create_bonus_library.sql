create table public.bonus_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contract_id uuid not null unique
    references public.billing_contracts (id) on delete cascade,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  constraint bonus_access_grants_revocation_reason_check check (
    revocation_reason is null
    or revocation_reason in ('full_refund', 'chargeback')
  ),
  constraint bonus_access_grants_revocation_state_check check (
    (revoked_at is null) = (revocation_reason is null)
  )
);

create index bonus_access_grants_user_id_idx
on public.bonus_access_grants (user_id);

create index bonus_access_grants_live_user_idx
on public.bonus_access_grants (user_id)
where revoked_at is null;

alter table public.bonus_access_grants enable row level security;

create policy bonus_access_grants_select_own
on public.bonus_access_grants
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.bonus_access_grants
from public, anon, authenticated, service_role;
grant select (id, user_id, contract_id, granted_at, revoked_at, created_at)
on public.bonus_access_grants to authenticated;
grant select, insert, update, delete on public.bonus_access_grants
to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'bonus-materials',
  'bonus-materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy bonus_materials_read_allowed_objects
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bonus-materials'
  and (
    name = 'ebook/ebook.pdf'
    or (
      name in (
        'guide/guide.pdf',
        'spreadsheet/cash-flow.xlsx'
      )
      and exists (
        select 1
        from public.bonus_access_grants as bonus_grant
        where bonus_grant.user_id = (select auth.uid())
          and bonus_grant.revoked_at is null
      )
    )
  )
);

insert into public.bonus_access_grants (
  user_id,
  contract_id,
  granted_at
)
select
  contract.user_id,
  contract.id,
  contract.access_starts_at
from public.billing_contracts as contract
where contract.status in ('active', 'cancel_at_period_end')
  and contract.access_starts_at <= statement_timestamp()
  and contract.access_ends_at > statement_timestamp()
on conflict (contract_id) do nothing;

create function private.sync_bonus_access_for_asaas_event_v1(
  p_reducer_result text,
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
  v_contract_id uuid;
  v_event_at timestamptz;
begin
  if p_reducer_result <> 'processed' then
    return p_reducer_result;
  end if;

  select event.contract_id
  into v_contract_id
  from public.asaas_webhook_events as event
  where event.id = p_event_id;

  if v_contract_id is null then
    return p_reducer_result;
  end if;

  if p_event_type in ('CHECKOUT_PAID', 'PAYMENT_CONFIRMED') then
    insert into public.bonus_access_grants (
      user_id,
      contract_id,
      granted_at
    )
    select contract.user_id, contract.id, contract.access_starts_at
    from public.billing_contracts as contract
    where contract.id = v_contract_id
      and contract.status in ('active', 'cancel_at_period_end')
      and contract.access_starts_at is not null
    on conflict (contract_id) do nothing;

  elsif p_event_type in (
    'PAYMENT_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE'
  ) then
    v_event_at := private.parse_asaas_event_instant(
      nullif(btrim(p_payload ->> 'dateCreated'), '')
    );

    update public.bonus_access_grants
    set revoked_at = coalesce(revoked_at, v_event_at),
        revocation_reason = coalesce(
          revocation_reason,
          case
            when p_event_type = 'PAYMENT_REFUNDED' then 'full_refund'
            else 'chargeback'
          end
        )
    where contract_id = v_contract_id;
  end if;

  return p_reducer_result;
end;
$$;

revoke all on function private.sync_bonus_access_for_asaas_event_v1(
  text,
  text,
  text,
  jsonb
)
from public, anon, authenticated;
grant execute on function private.sync_bonus_access_for_asaas_event_v1(
  text,
  text,
  text,
  jsonb
)
to service_role;

create or replace function public.apply_asaas_webhook_event(
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
  ),
  reducer_result as (
    select private.apply_asaas_webhook_event_v1(
      p_event_id,
      p_event_type,
      normalized_payload.value
    ) as value,
    normalized_payload.value as normalized_payload
    from normalized_payload
  )
  select private.sync_bonus_access_for_asaas_event_v1(
    reducer_result.value,
    p_event_id,
    p_event_type,
    reducer_result.normalized_payload
  )
  from reducer_result;
$$;

revoke all on function public.apply_asaas_webhook_event(text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_asaas_webhook_event(text, text, jsonb)
to service_role;
