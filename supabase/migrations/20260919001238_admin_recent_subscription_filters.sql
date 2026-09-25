create index billing_contracts_admin_granted_recent_idx
on public.billing_contracts (created_at desc, id desc)
where access_starts_at is not null and access_ends_at is not null;

create function public.list_admin_recent_subscriptions_v1(
  p_period text,
  p_billing_mode text,
  p_state text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
  period_start timestamptz;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_period not in ('7d', '30d', '90d', 'all')
    or p_billing_mode not in ('monthly', 'annual', 'all')
    or p_state not in ('active', 'ended', 'all')
  then
    raise exception using errcode = '22023', message = 'invalid subscription filters';
  end if;

  period_start := case p_period
    when '7d' then snapshot_at - interval '7 days'
    when '30d' then snapshot_at - interval '30 days'
    when '90d' then snapshot_at - interval '90 days'
    else null
  end;

  return coalesce((
    select jsonb_agg(
      to_jsonb(recent_contract)
      order by recent_contract."createdAt" desc, recent_contract.id desc
    )
    from (
      select
        contract.id,
        app_user.email,
        contract.billing_mode as "billingMode",
        contract.status,
        contract.created_at as "createdAt"
      from public.billing_contracts as contract
      join auth.users as app_user on app_user.id = contract.user_id
      where contract.access_starts_at is not null
        and contract.access_ends_at is not null
        and (period_start is null or contract.created_at >= period_start)
        and (
          p_billing_mode = 'all'
          or contract.billing_mode::text = p_billing_mode
        )
        and (
          p_state = 'all'
          or (
            p_state = 'active'
            and contract.status in ('active', 'cancel_at_period_end')
            and contract.access_starts_at <= snapshot_at
            and contract.access_ends_at > snapshot_at
          )
          or (
            p_state = 'ended'
            and not (
              contract.status in ('active', 'cancel_at_period_end')
              and contract.access_starts_at <= snapshot_at
              and contract.access_ends_at > snapshot_at
            )
          )
        )
      order by contract.created_at desc, contract.id desc
      limit 5
    ) as recent_contract
  ), '[]'::jsonb);
end;
$function$;

revoke execute on function public.list_admin_recent_subscriptions_v1(
  text,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function public.list_admin_recent_subscriptions_v1(
  text,
  text,
  text
)
to authenticated;
