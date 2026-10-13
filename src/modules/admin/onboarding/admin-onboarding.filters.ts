import { z } from "zod";

import {
  adminOnboardingConsentSchema,
  adminOnboardingCursorSchema,
  adminOnboardingTabSchema,
  type AdminOnboardingConsent,
  type AdminOnboardingCursor,
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
  cursor: string | null;
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

function parseDate(value: string | undefined) {
  const parsed = dateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function decodeAdminOnboardingCursor(
  raw: string | null | undefined,
): AdminOnboardingCursor | null {
  if (!raw || raw.length > 500) return null;
  try {
    return adminOnboardingCursorSchema.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

function encodeAdminOnboardingCursor(cursor: AdminOnboardingCursor) {
  return Buffer.from(
    JSON.stringify(adminOnboardingCursorSchema.parse(cursor)),
  ).toString("base64url");
}

function parseAdminOnboardingNavigation(
  params: SearchParams,
): AdminOnboardingNavigation {
  const rawTab = scalar(params.tab);
  const parsedTab = adminOnboardingTabSchema.safeParse(rawTab);
  const rawQuery = scalar(params.q)?.trim() ?? "";
  const rawConsent = scalar(params.consent);
  const parsedConsent = adminOnboardingConsentSchema.safeParse(rawConsent);
  const rawCursor = scalar(params.cursor);
  const cursor = decodeAdminOnboardingCursor(rawCursor);

  return {
    tab: parsedTab.success ? parsedTab.data : "overview",
    filters: {
      q: rawQuery.length <= 120 ? rawQuery : "",
      segmentId: parsePositiveId(scalar(params.segmentId)),
      subcategoryId: parsePositiveId(scalar(params.subcategoryId)),
      consent: parsedConsent.success ? parsedConsent.data : "all",
      from: parseDate(scalar(params.from)),
      to: parseDate(scalar(params.to)),
      cursor: cursor && rawCursor ? rawCursor : null,
    },
  };
}

function adminOnboardingUrl(
  navigation: AdminOnboardingNavigation,
  patch: Partial<AdminOnboardingFilters> = {},
) {
  const changesFilter = Object.keys(patch).some((key) => key !== "cursor");
  const filters: AdminOnboardingFilters = {
    ...navigation.filters,
    ...patch,
    cursor: changesFilter
      ? null
      : patch.cursor === undefined
        ? navigation.filters.cursor
        : patch.cursor,
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
  if (filters.cursor !== null) params.set("cursor", filters.cursor);
  const query = params.toString();
  return `/admin/onboarding${query ? `?${query}` : ""}`;
}

export {
  adminOnboardingUrl,
  decodeAdminOnboardingCursor,
  encodeAdminOnboardingCursor,
  parseAdminOnboardingNavigation,
  type AdminOnboardingFilters,
  type AdminOnboardingNavigation,
  type SearchParams,
};
