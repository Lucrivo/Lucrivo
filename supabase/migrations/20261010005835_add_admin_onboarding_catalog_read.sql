create function public.get_admin_business_catalog_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  return (
    select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', segment.id,
          'name', segment.name,
          'sortOrder', segment.sort_order,
          'isActive', segment.is_active,
          'version', segment.version,
          'subcategories', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'id', subcategory.id,
                'segmentId', subcategory.segment_id,
                'name', subcategory.name,
                'sortOrder', subcategory.sort_order,
                'isActive', subcategory.is_active,
                'version', subcategory.version
              )
              order by subcategory.sort_order, subcategory.id
            )
            from public.business_subcategories as subcategory
            where subcategory.segment_id = segment.id
          ), '[]'::jsonb)
        )
        order by segment.sort_order, segment.id
      ),
      '[]'::jsonb
    )
    from public.business_segments as segment
  );
end;
$function$;

revoke execute on function public.get_admin_business_catalog_v1()
from public, anon, authenticated, service_role;

grant execute on function public.get_admin_business_catalog_v1()
to authenticated;
