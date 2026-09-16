create index billing_contracts_admin_active_access_idx
on public.billing_contracts (access_ends_at, access_starts_at)
where status in ('active', 'cancel_at_period_end');

create index billing_contracts_admin_cancellation_idx
on public.billing_contracts (
  (coalesce(cancellation_confirmed_at, canceled_at))
)
where coalesce(cancellation_confirmed_at, canceled_at) is not null;

create index billing_contracts_admin_recent_idx
on public.billing_contracts (created_at desc, id desc);

create index billing_payments_admin_revenue_idx
on public.billing_payments (
  (coalesce(received_at, confirmed_at))
)
include (value_cents)
where status in ('confirmed', 'received');

create function public.get_admin_dashboard_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  snapshot_at timestamptz := statement_timestamp();
  local_now timestamp;
  day_start timestamptz;
  week_start timestamptz;
  month_start timestamptz;
  next_month_start timestamptz;
  active_window_start timestamptz;
  administrator_id uuid;
  cancellation_opening_base bigint;
  canceled_subscriptions bigint;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  select administrator.user_id
  into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  local_now := snapshot_at at time zone 'America/Sao_Paulo';
  day_start := date_trunc('day', local_now)
    at time zone 'America/Sao_Paulo';
  week_start := date_trunc('week', local_now)
    at time zone 'America/Sao_Paulo';
  month_start := date_trunc('month', local_now)
    at time zone 'America/Sao_Paulo';
  next_month_start := (
    date_trunc('month', local_now) + interval '1 month'
  ) at time zone 'America/Sao_Paulo';
  active_window_start := snapshot_at - interval '30 days';

  select count(*)
  into cancellation_opening_base
  from public.billing_contracts as contract
  where contract.access_starts_at <= month_start
    and contract.access_ends_at > month_start;

  select count(*)
  into canceled_subscriptions
  from public.billing_contracts as contract
  where coalesce(
      contract.cancellation_confirmed_at,
      contract.canceled_at
    ) >= month_start
    and coalesce(
      contract.cancellation_confirmed_at,
      contract.canceled_at
    ) < next_month_start;

  return jsonb_build_object(
    'generatedAt', to_jsonb(snapshot_at),
    'metrics', jsonb_build_object(
      'newUsers', jsonb_build_object(
        'today', (
          select count(*)
          from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= day_start
            and app_user.created_at <= snapshot_at
        ),
        'week', (
          select count(*)
          from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= week_start
            and app_user.created_at <= snapshot_at
        ),
        'month', (
          select count(*)
          from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= month_start
            and app_user.created_at <= snapshot_at
        )
      ),
      'activeUsers', (
        select count(*)
        from auth.users as app_user
        where app_user.id <> administrator_id
          and app_user.last_sign_in_at >= active_window_start
          and app_user.last_sign_in_at <= snapshot_at
      ),
      'freeDiagnoses', (
        select count(*)
        from public.diagnoses as diagnosis
        where diagnosis.is_free_report
      ),
      'activeSubscriptions', (
        select count(*)
        from public.billing_contracts as contract
        where contract.status in ('active', 'cancel_at_period_end')
          and contract.access_starts_at <= snapshot_at
          and contract.access_ends_at > snapshot_at
      ),
      'canceledSubscriptions', canceled_subscriptions,
      'monthlyRevenueCents', (
        select coalesce(sum(payment.value_cents), 0)
        from public.billing_payments as payment
        where payment.status in ('confirmed', 'received')
          and coalesce(
            payment.received_at,
            payment.confirmed_at
          ) >= month_start
          and coalesce(
            payment.received_at,
            payment.confirmed_at
          ) < next_month_start
          and coalesce(
            payment.received_at,
            payment.confirmed_at
          ) <= snapshot_at
      ),
      'cancellationOpeningBase', cancellation_opening_base,
      'cancellationRateBasisPoints', case
        when cancellation_opening_base = 0 then null
        else round(
          canceled_subscriptions * 10000.0 / cancellation_opening_base
        )::integer
      end
    ),
    'revenueHistory', (
      select jsonb_agg(
        jsonb_build_object(
          'period', to_char(bucket.local_start, 'YYYY-MM-DD'),
          'valueCents', bucket.value_cents
        )
        order by bucket.local_start
      )
      from (
        select
          series.local_start,
          coalesce(sum(payment.value_cents), 0)::bigint as value_cents
        from generate_series(
          date_trunc('month', local_now) - interval '11 months',
          date_trunc('month', local_now),
          interval '1 month'
        ) as series(local_start)
        left join public.billing_payments as payment
          on payment.status in ('confirmed', 'received')
          and coalesce(payment.received_at, payment.confirmed_at) >=
            series.local_start at time zone 'America/Sao_Paulo'
          and coalesce(payment.received_at, payment.confirmed_at) <
            (series.local_start + interval '1 month')
              at time zone 'America/Sao_Paulo'
          and coalesce(payment.received_at, payment.confirmed_at) <= snapshot_at
        group by series.local_start
      ) as bucket
    ),
    'userGrowth', (
      select jsonb_agg(
        jsonb_build_object(
          'period', to_char(bucket.local_start, 'YYYY-MM-DD'),
          'value', bucket.user_count
        )
        order by bucket.local_start
      )
      from (
        select
          series.local_start,
          count(app_user.id)::bigint as user_count
        from generate_series(
          date_trunc('month', local_now) - interval '5 months',
          date_trunc('month', local_now),
          interval '1 month'
        ) as series(local_start)
        left join auth.users as app_user
          on app_user.id <> administrator_id
          and app_user.created_at >=
            series.local_start at time zone 'America/Sao_Paulo'
          and app_user.created_at <
            (series.local_start + interval '1 month')
              at time zone 'America/Sao_Paulo'
          and app_user.created_at <= snapshot_at
        group by series.local_start
      ) as bucket
    ),
    'recentSubscriptions', coalesce((
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
        order by contract.created_at desc, contract.id desc
        limit 5
      ) as recent_contract
    ), '[]'::jsonb)
  );
end;
$function$;

revoke execute on function public.get_admin_dashboard_v1()
from public, anon, authenticated, service_role;

grant execute on function public.get_admin_dashboard_v1()
to authenticated;
