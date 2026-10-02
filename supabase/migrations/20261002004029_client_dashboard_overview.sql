create or replace function public.get_client_dashboard_v1(
  p_from_date date default null,
  p_to_date date default null,
  p_categories text[] default null,
  p_modes text[] default null,
  p_scenarios text[] default null,
  p_verdicts text[] default null,
  p_priorities text[] default null,
  p_data_state text default 'all',
  p_focus_id bigint default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_from_date is not null
    and p_to_date is not null
    and p_from_date >= p_to_date
  then
    raise exception using errcode = '22023', message = 'invalid dashboard date range';
  end if;

  if p_data_state is null
    or p_data_state not in ('all', 'complete', 'pending')
    or (p_categories is not null and (
      pg_catalog.cardinality(p_categories) not between 1 and 3
      or not p_categories <@ array['service', 'product', 'production']::text[]
    ))
    or (p_modes is not null and (
      pg_catalog.cardinality(p_modes) not between 1 and 2
      or not p_modes <@ array['quick', 'detailed']::text[]
    ))
    or (p_scenarios is not null and (
      pg_catalog.cardinality(p_scenarios) not between 1 and 9
      or not p_scenarios <@ array[
        'hour', 'minute', 'appointment', 'day', 'week', 'month',
        'resale', 'digital', 'manufacturing'
      ]::text[]
    ))
    or (p_verdicts is not null and (
      pg_catalog.cardinality(p_verdicts) not between 1 and 7
      or not p_verdicts <@ array[
        'missing_price', 'direct_loss', 'incomplete_volume',
        'operational_loss', 'no_sales', 'break_even', 'positive_result'
      ]::text[]
    ))
    or (p_priorities is not null and (
      pg_catalog.cardinality(p_priorities) not between 1 and 5
      or not p_priorities <@ array[
        'cost', 'data', 'price', 'margin', 'volume'
      ]::text[]
    ))
  then
    raise exception using errcode = '22023', message = 'invalid dashboard filters';
  end if;

  return (
    with readable as materialized (
      select
        diagnosis.*,
        (
          coalesce(diagnosis.is_partial, false)
          or diagnosis.verdict in ('incomplete_volume', 'missing_price')
        ) as has_pending_data
      from public.diagnoses as diagnosis
      where diagnosis.user_id = caller_id
        and diagnosis.deleted_at is null
    ),
    filtered as materialized (
      select *
      from readable
      where (p_from_date is null or created_at >= (
          p_from_date::timestamp at time zone 'America/Sao_Paulo'
        ))
        and (p_to_date is null or created_at < (
          p_to_date::timestamp at time zone 'America/Sao_Paulo'
        ))
        and (p_categories is null or business_category::text = any(p_categories))
        and (p_modes is null or analysis_mode = any(p_modes))
        and (p_scenarios is null or scenario = any(p_scenarios))
        and (p_verdicts is null or verdict = any(p_verdicts))
        and (p_priorities is null or priority = any(p_priorities))
        and (
          p_data_state = 'all'
          or (p_data_state = 'pending' and has_pending_data)
          or (p_data_state = 'complete' and not has_pending_data)
        )
    ),
    selected_focus as (
      select id
      from filtered
      order by (id = p_focus_id) desc, created_at desc, id desc
      limit 1
    )
    select pg_catalog.jsonb_build_object(
      'generatedAt', snapshot_at,
      'filters', pg_catalog.jsonb_build_object(
        'from', p_from_date,
        'to', p_to_date,
        'categories', coalesce(to_jsonb(p_categories), '[]'::jsonb),
        'modes', coalesce(to_jsonb(p_modes), '[]'::jsonb),
        'scenarios', coalesce(to_jsonb(p_scenarios), '[]'::jsonb),
        'verdicts', coalesce(to_jsonb(p_verdicts), '[]'::jsonb),
        'priorities', coalesce(to_jsonb(p_priorities), '[]'::jsonb),
        'dataState', p_data_state
      ),
      'hasAnyReports', exists(select 1 from readable),
      'focusReportId', (select id from selected_focus),
      'metrics', pg_catalog.jsonb_build_object(
        'totalReports', (select count(*) from filtered),
        'positiveResultReports', (
          select count(*) from filtered where verdict = 'positive_result'
        ),
        'lossReports', (
          select count(*) from filtered
          where verdict in ('direct_loss', 'operational_loss')
        ),
        'pendingDataReports', (
          select count(*) from filtered where has_pending_data
        )
      ),
      'verdictCounts', (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'verdict', bucket.verdict,
            'count', (select count(*) from filtered where verdict = bucket.verdict)
          ) order by bucket.position
        )
        from (values
          (1, 'missing_price'),
          (2, 'direct_loss'),
          (3, 'incomplete_volume'),
          (4, 'operational_loss'),
          (5, 'no_sales'),
          (6, 'break_even'),
          (7, 'positive_result')
        ) as bucket(position, verdict)
      ),
      'priorityCounts', (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'priority', bucket.priority,
            'count', (select count(*) from filtered where priority = bucket.priority)
          ) order by bucket.position
        )
        from (values
          (1, 'cost'), (2, 'data'), (3, 'price'),
          (4, 'margin'), (5, 'volume')
        ) as bucket(position, priority)
      ),
      'recentReports', coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', recent.id,
            'businessCategory', recent.business_category,
            'scenario', recent.scenario,
            'analysisMode', recent.analysis_mode,
            'createdAt', recent.created_at,
            'updatedAt', recent.updated_at,
            'verdict', recent.verdict,
            'priority', recent.priority,
            'hasPendingData', recent.has_pending_data,
            'itemCount', recent.item_count,
            'realMarginBasisPoints', recent.real_margin_basis_points,
            'monthlyResultCents', recent.monthly_result_cents,
            'schemaVersion', recent.schema_version,
            'calculationVersion', recent.calculation_version,
            'contentVersion', recent.content_version
          ) order by recent.created_at desc, recent.id desc
        )
        from (
          select * from filtered
          order by created_at desc, id desc
          limit 6
        ) as recent
      ), '[]'::jsonb)
    )
  );
end;
$function$;

revoke execute on function public.get_client_dashboard_v1(
  date, date, text[], text[], text[], text[], text[], text, bigint
) from public, anon, authenticated, service_role;

grant execute on function public.get_client_dashboard_v1(
  date, date, text[], text[], text[], text[], text[], text, bigint
) to authenticated;
