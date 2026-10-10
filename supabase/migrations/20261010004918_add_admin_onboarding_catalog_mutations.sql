create function public.save_admin_business_segment_v1(
  p_id bigint,
  p_name text,
  p_sort_order integer,
  p_is_active boolean,
  p_expected_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  normalized_name text := case
    when p_name is null then null
    else pg_catalog.regexp_replace(
      pg_catalog.btrim(p_name),
      '[[:space:]]+',
      ' ',
      'g'
    )
  end;
  current_segment public.business_segments%rowtype;
  saved_segment public.business_segments%rowtype;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if normalized_name is null
    or pg_catalog.char_length(normalized_name) not between 2 and 60
    or p_sort_order is null
    or p_sort_order not between 0 and 10000
    or p_is_active is null
    or (p_id is null and p_expected_version is not null)
    or (
      p_id is not null
      and (p_id <= 0 or p_expected_version is null or p_expected_version < 0)
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid business segment input';
  end if;

  if p_id is null then
    insert into public.business_segments (
      name,
      sort_order,
      is_active,
      version
    ) values (
      normalized_name,
      p_sort_order,
      p_is_active,
      0
    )
    returning * into saved_segment;
  else
    select segment.*
    into current_segment
    from public.business_segments as segment
    where segment.id = p_id
    for update;

    if not found then
      return pg_catalog.jsonb_build_object('status', 'not_found');
    end if;

    if current_segment.version <> p_expected_version then
      return pg_catalog.jsonb_build_object('status', 'conflict');
    end if;

    update public.business_segments
    set
      name = normalized_name,
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_at = pg_catalog.statement_timestamp(),
      version = current_segment.version + 1
    where id = current_segment.id
    returning * into saved_segment;
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'saved',
    'item', pg_catalog.jsonb_build_object(
      'id', saved_segment.id,
      'name', saved_segment.name,
      'sortOrder', saved_segment.sort_order,
      'isActive', saved_segment.is_active,
      'version', saved_segment.version
    )
  );
exception
  when unique_violation then
    return pg_catalog.jsonb_build_object('status', 'duplicate');
end;
$function$;

create function public.save_admin_business_subcategory_v1(
  p_id bigint,
  p_segment_id bigint,
  p_name text,
  p_sort_order integer,
  p_is_active boolean,
  p_expected_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  normalized_name text := case
    when p_name is null then null
    else pg_catalog.regexp_replace(
      pg_catalog.btrim(p_name),
      '[[:space:]]+',
      ' ',
      'g'
    )
  end;
  parent_is_active boolean;
  current_subcategory public.business_subcategories%rowtype;
  saved_subcategory public.business_subcategories%rowtype;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_segment_id is null
    or p_segment_id <= 0
    or normalized_name is null
    or pg_catalog.char_length(normalized_name) not between 2 and 80
    or p_sort_order is null
    or p_sort_order not between 0 and 10000
    or p_is_active is null
    or (p_id is null and p_expected_version is not null)
    or (
      p_id is not null
      and (p_id <= 0 or p_expected_version is null or p_expected_version < 0)
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid business subcategory input';
  end if;

  if p_id is null then
    select segment.is_active
    into parent_is_active
    from public.business_segments as segment
    where segment.id = p_segment_id;

    if not found or not parent_is_active then
      raise exception using
        errcode = '22023',
        message = 'new subcategories require an active segment';
    end if;

    insert into public.business_subcategories (
      segment_id,
      name,
      sort_order,
      is_active,
      version
    ) values (
      p_segment_id,
      normalized_name,
      p_sort_order,
      p_is_active,
      0
    )
    returning * into saved_subcategory;
  else
    select subcategory.*
    into current_subcategory
    from public.business_subcategories as subcategory
    where subcategory.id = p_id
    for update;

    if not found then
      return pg_catalog.jsonb_build_object('status', 'not_found');
    end if;

    if current_subcategory.segment_id <> p_segment_id then
      raise exception using
        errcode = '22023',
        message = 'business subcategory segment is immutable';
    end if;

    if current_subcategory.version <> p_expected_version then
      return pg_catalog.jsonb_build_object('status', 'conflict');
    end if;

    update public.business_subcategories
    set
      name = normalized_name,
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_at = pg_catalog.statement_timestamp(),
      version = current_subcategory.version + 1
    where id = current_subcategory.id
    returning * into saved_subcategory;
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'saved',
    'item', pg_catalog.jsonb_build_object(
      'id', saved_subcategory.id,
      'segmentId', saved_subcategory.segment_id,
      'name', saved_subcategory.name,
      'sortOrder', saved_subcategory.sort_order,
      'isActive', saved_subcategory.is_active,
      'version', saved_subcategory.version
    )
  );
exception
  when unique_violation then
    return pg_catalog.jsonb_build_object('status', 'duplicate');
end;
$function$;

revoke execute on function public.save_admin_business_segment_v1(
  bigint, text, integer, boolean, integer
)
from public, anon, authenticated, service_role;
revoke execute on function public.save_admin_business_subcategory_v1(
  bigint, bigint, text, integer, boolean, integer
)
from public, anon, authenticated, service_role;

grant execute on function public.save_admin_business_segment_v1(
  bigint, text, integer, boolean, integer
)
to authenticated;
grant execute on function public.save_admin_business_subcategory_v1(
  bigint, bigint, text, integer, boolean, integer
)
to authenticated;
