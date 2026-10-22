import { z } from "zod";

import {
  adminOnboardingConsentSchema,
  adminOnboardingTabSchema,
  type AdminOnboardingConsent,
  type AdminOnboardingTab,
} from "./admin-onboarding.schema";

type SearchParams = Record<string, string | string[] | undefined>;
type AdminOnboardingFilters = {
  q: string;
  segmentId: number | null;
  subcategoryId: number | null;
  consent: AdminOnboardingConsent;
  from: string | null;
  to: string | null;
  page: number;
};
type AdminOnboardingNavigation = {
  tab: AdminOnboardingTab;
  filters: AdminOnboardingFilters;
};

const dateSchema = z.iso.date().refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
});

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parsePositiveId(value: string | undefined) {
  if (!value || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePage(value: string | undefined) {
  if (!value || !/^[1-9][0-9]*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 1_000_000 ? parsed : 1;
}

function parseDate(value: string | undefined) {
  const parsed = dateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseAdminOnboardingNavigation(
  params: SearchParams,
): AdminOnboardingNavigation {
  const rawTab = scalar(params.tab);
  const parsedTab = adminOnboardingTabSchema.safeParse(rawTab);
  const rawQuery = scalar(params.q)?.trim() ?? "";
  const rawConsent = scalar(params.consent);
  const parsedConsent = adminOnboardingConsentSchema.safeParse(rawConsent);

  return {
    tab: parsedTab.success ? parsedTab.data : "overview",
    filters: {
      q: rawQuery.length <= 120 ? rawQuery : "",
      segmentId: parsePositiveId(scalar(params.segmentId)),
      subcategoryId: parsePositiveId(scalar(params.subcategoryId)),
      consent: parsedConsent.success ? parsedConsent.data : "all",
      from: parseDate(scalar(params.from)),
      to: parseDate(scalar(params.to)),
      page: parsePage(scalar(params.page)),
    },
  };
}

function adminOnboardingUrl(
  navigation: AdminOnboardingNavigation,
  patch: Partial<AdminOnboardingFilters> = {},
) {
  const changesFilter = Object.keys(patch).some((key) => key !== "page");
  const filters: AdminOnboardingFilters = {
    ...navigation.filters,
    ...patch,
    page: changesFilter ? 1 : (patch.page ?? navigation.filters.page),
  };

  if (
    patch.segmentId !== undefined &&
    patch.segmentId !== navigation.filters.segmentId
  ) {
    filters.subcategoryId = null;
  }

  const params = new URLSearchParams();
  if (navigation.tab !== "overview") params.set("tab", navigation.tab);
  if (filters.q) params.set("q", filters.q);
  if (filters.segmentId !== null) {
    params.set("segmentId", String(filters.segmentId));
  }
  if (filters.subcategoryId !== null) {
    params.set("subcategoryId", String(filters.subcategoryId));
  }
  if (filters.consent !== "all") params.set("consent", filters.consent);
  if (filters.from !== null) params.set("from", filters.from);
  if (filters.to !== null) params.set("to", filters.to);
  if (filters.page !== 1) params.set("page", String(filters.page));
  const query = params.toString();
  return `/admin/onboarding${query ? `?${query}` : ""}`;
}

export {
  adminOnboardingUrl,
  parseAdminOnboardingNavigation,
  type AdminOnboardingFilters,
  type AdminOnboardingNavigation,
  type SearchParams,
};
