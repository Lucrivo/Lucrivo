"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  adminBusinessSegmentItemSchema,
  adminBusinessSubcategorySchema,
  businessCatalogMutationSchema,
} from "./admin-onboarding.schema";

const knownFailureSchema = z
  .object({ status: z.enum(["conflict", "duplicate", "not_found"]) })
  .strict();
const savedSegmentSchema = z
  .object({ status: z.literal("saved"), item: adminBusinessSegmentItemSchema })
  .strict();
const savedSubcategorySchema = z
  .object({ status: z.literal("saved"), item: adminBusinessSubcategorySchema })
  .strict();

type ChangeBusinessCatalogResult =
  | z.infer<typeof savedSegmentSchema>
  | z.infer<typeof savedSubcategorySchema>
  | { status: "conflict" | "duplicate" | "not_found" | "invalid" | "error" };

async function changeBusinessCatalog(
  input: unknown,
): Promise<ChangeBusinessCatalogResult> {
  const parsed = businessCatalogMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const mutation = parsed.data;
  const { supabase } = await requireAdmin();
  const response =
    mutation.kind === "segment"
      ? await supabase.rpc("save_admin_business_segment_v1", {
          p_id: mutation.id as number,
          p_name: mutation.name,
          p_sort_order: mutation.sortOrder,
          p_is_active: mutation.isActive,
          p_expected_version: mutation.expectedVersion as number,
        })
      : await supabase.rpc("save_admin_business_subcategory_v1", {
          p_id: mutation.id as number,
          p_segment_id: mutation.segmentId,
          p_name: mutation.name,
          p_sort_order: mutation.sortOrder,
          p_is_active: mutation.isActive,
          p_expected_version: mutation.expectedVersion as number,
        });

  if (response.error) return { status: "error" };

  const saved =
    mutation.kind === "segment"
      ? savedSegmentSchema.safeParse(response.data)
      : savedSubcategorySchema.safeParse(response.data);
  if (saved.success) {
    revalidatePath("/admin/onboarding");
    return saved.data;
  }

  const knownFailure = knownFailureSchema.safeParse(response.data);
  if (knownFailure.success) return knownFailure.data;
  return { status: "error" };
}

export { changeBusinessCatalog, type ChangeBusinessCatalogResult };
