import "server-only";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  adminBusinessCatalogSchema,
  adminOnboardingContactsSchema,
  adminOnboardingOverviewSchema,
} from "./admin-onboarding.schema";
import {
  decodeAdminOnboardingCursor,
  type AdminOnboardingFilters,
} from "./admin-onboarding.filters";

class AdminOnboardingUnavailableError extends Error {
  constructor() {
    super("admin_onboarding_unavailable");
    this.name = "AdminOnboardingUnavailableError";
  }
}

type OverviewRange = { from: string | null; to: string | null };

function dateInSaoPaulo(now: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function addCalendarDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function resolveAdminOnboardingDateRange(
  range: OverviewRange,
  now = new Date(),
) {
  if (range.from && range.to && range.from < range.to) {
    return { from: range.from, to: range.to };
  }
  const today = dateInSaoPaulo(now);
  return {
    from: addCalendarDays(today, -29),
    to: addCalendarDays(today, 1),
  };
}

async function getAdminOnboardingOverview(range: OverviewRange) {
  const { from, to } = resolveAdminOnboardingDateRange(range);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(
    "get_admin_onboarding_overview_v1",
    { p_from: from, p_to: to },
  );
  const parsed = adminOnboardingOverviewSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AdminOnboardingUnavailableError();
  }
  return parsed.data;
}

async function getAdminOnboardingContacts(filters: AdminOnboardingFilters) {
  const cursor = decodeAdminOnboardingCursor(filters.cursor);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(
    "list_admin_onboarding_contacts_v1",
    {
      p_query: filters.q || undefined,
      p_segment_id: filters.segmentId ?? undefined,
      p_subcategory_id: filters.subcategoryId ?? undefined,
      p_consent: filters.consent,
      p_from: filters.from ?? undefined,
      p_to: filters.to ?? undefined,
      p_cursor_completed_at: cursor?.completedAt,
      p_cursor_user_id: cursor?.userId,
      p_limit: 20,
    },
  );
  const parsed = adminOnboardingContactsSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AdminOnboardingUnavailableError();
  }
  return parsed.data;
}

async function getAdminBusinessCatalog() {
  const { supabase } = await requireAdmin();
  const [segmentsResult, subcategoriesResult] = await Promise.all([
    supabase
      .from("business_segments")
      .select("id,name,sort_order,is_active,version")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("business_subcategories")
      .select("id,segment_id,name,sort_order,is_active,version")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (segmentsResult.error || subcategoriesResult.error) {
    throw new AdminOnboardingUnavailableError();
  }

  const subcategories = (subcategoriesResult.data ?? []).map((subcategory) => ({
    id: subcategory.id,
    segmentId: subcategory.segment_id,
    name: subcategory.name,
    sortOrder: subcategory.sort_order,
    isActive: subcategory.is_active,
    version: subcategory.version,
  }));
  const catalog = (segmentsResult.data ?? []).map((segment) => ({
    id: segment.id,
    name: segment.name,
    sortOrder: segment.sort_order,
    isActive: segment.is_active,
    version: segment.version,
    subcategories: subcategories.filter(
      (subcategory) => subcategory.segmentId === segment.id,
    ),
  }));
  const parsed = adminBusinessCatalogSchema.safeParse(catalog);
  if (!parsed.success) throw new AdminOnboardingUnavailableError();
  return parsed.data;
}

export {
  AdminOnboardingUnavailableError,
  getAdminBusinessCatalog,
  getAdminOnboardingContacts,
  getAdminOnboardingOverview,
  resolveAdminOnboardingDateRange,
};
