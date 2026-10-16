import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import {
  BONUS_BUCKET,
  BONUS_MATERIALS,
  type BonusMaterial,
} from "../bonus-catalog";

type BonusMaterialView = Omit<
  BonusMaterial,
  "objectPath" | "requiresPaidAccess" | "downloadName"
> & {
  access: "available" | "locked";
  availability: "ready" | "preparing" | "unavailable";
};

type BonusAccessResult =
  | { status: "success"; hasPermanentAccess: boolean }
  | { status: "read_failed" };

type BonusObjectResult =
  | { status: "ready" }
  | { status: "missing" }
  | { status: "unavailable" };

type BonusLibraryResult =
  | {
      status: "success";
      overview: {
        unlockedCount: 1 | 3;
        hasPermanentAccess: boolean;
        materials: BonusMaterialView[];
      };
    }
  | { status: "read_failed" };

type BonusSupabaseInput = {
  supabase: SupabaseClient<Database>;
};

type BonusAccessInput = BonusSupabaseInput & {
  userId: string;
};

type BonusObjectInput = BonusSupabaseInput & {
  material: BonusMaterial;
};

async function hasPermanentBonusAccess({
  supabase,
  userId,
}: BonusAccessInput): Promise<BonusAccessResult> {
  try {
    const { data, error } = await supabase
      .from("bonus_access_grants")
      .select("id")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .limit(1);

    if (error) return { status: "read_failed" };
    return {
      status: "success",
      hasPermanentAccess: (data?.length ?? 0) > 0,
    };
  } catch {
    return { status: "read_failed" };
  }
}

async function getBonusObjectStatus({
  supabase,
  material,
}: BonusObjectInput): Promise<BonusObjectResult> {
  const separator = material.objectPath.lastIndexOf("/");
  const folder = material.objectPath.slice(0, separator);
  const filename = material.objectPath.slice(separator + 1);

  try {
    const { data, error } = await supabase.storage
      .from(BONUS_BUCKET)
      .list(folder, { limit: 100, search: filename });

    if (error) return { status: "unavailable" };
    return data?.some((object) => object.name === filename)
      ? { status: "ready" }
      : { status: "missing" };
  } catch {
    return { status: "unavailable" };
  }
}

function toMaterialView(
  material: BonusMaterial,
  access: BonusMaterialView["access"],
  availability: BonusMaterialView["availability"],
): BonusMaterialView {
  return {
    slug: material.slug,
    typeLabel: material.typeLabel,
    title: material.title,
    description: material.description,
    delivery: material.delivery,
    access,
    availability,
  };
}

async function getBonusLibrary({
  supabase,
  userId,
}: BonusAccessInput): Promise<BonusLibraryResult> {
  const entitlement = await hasPermanentBonusAccess({ supabase, userId });
  if (entitlement.status === "read_failed") return entitlement;

  const materials = await Promise.all(
    BONUS_MATERIALS.map(async (material): Promise<BonusMaterialView> => {
      const access =
        material.requiresPaidAccess && !entitlement.hasPermanentAccess
          ? "locked"
          : "available";

      if (access === "locked") {
        return toMaterialView(material, access, "ready");
      }

      const object = await getBonusObjectStatus({ supabase, material });
      const availability =
        object.status === "missing" ? "preparing" : object.status;
      return toMaterialView(material, access, availability);
    }),
  );

  return {
    status: "success",
    overview: {
      unlockedCount: entitlement.hasPermanentAccess ? 3 : 1,
      hasPermanentAccess: entitlement.hasPermanentAccess,
      materials,
    },
  };
}

export {
  getBonusLibrary,
  getBonusObjectStatus,
  hasPermanentBonusAccess,
  type BonusAccessInput,
  type BonusAccessResult,
  type BonusLibraryResult,
  type BonusMaterialView,
  type BonusObjectInput,
  type BonusObjectResult,
};
