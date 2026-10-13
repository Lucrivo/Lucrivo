import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { ReportAiBusinessContext } from "@/modules/report-ai/domain/report-ai-context.types";

const normalizedLabel = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(2).max(max));

const segmentNameSchema = normalizedLabel(60);
const subcategoryNameSchema = normalizedLabel(80);
const positiveIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const businessContextProfileSchema = z.union([
  z.object({
    segmentName: segmentNameSchema,
    subcategoryId: positiveIdSchema,
    subcategoryName: subcategoryNameSchema,
    customSubcategory: z.null(),
  }),
  z.object({
    segmentName: segmentNameSchema,
    subcategoryId: z.null(),
    subcategoryName: z.null(),
    customSubcategory: subcategoryNameSchema,
  }),
]);

type GetReportAiBusinessContextInput = {
  supabase: SupabaseClient<Database>;
};

async function getReportAiBusinessContext({
  supabase,
}: GetReportAiBusinessContextInput): Promise<ReportAiBusinessContext | null> {
  try {
    const { data, error } = await supabase.rpc("get_my_onboarding_profile_v1");
    if (error) return null;

    const profile = businessContextProfileSchema.safeParse(data);
    if (!profile.success) return null;

    return {
      segment: profile.data.segmentName,
      subcategory:
        profile.data.subcategoryId === null
          ? profile.data.customSubcategory
          : profile.data.subcategoryName,
    };
  } catch {
    return null;
  }
}

export { getReportAiBusinessContext };
