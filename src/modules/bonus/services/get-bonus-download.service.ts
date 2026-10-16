import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import { BONUS_BUCKET, getBonusMaterial } from "../bonus-catalog";
import {
  getBonusObjectStatus,
  hasPermanentBonusAccess,
} from "./get-bonus-library.service";

type BonusDownloadInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  slug: string;
};

type BonusDownloadResult =
  | {
      status: "ready";
      signedUrl: string;
      delivery: "new_tab" | "download";
    }
  | {
      status: "not_found" | "forbidden" | "preparing" | "unavailable";
    };

async function getBonusDownload({
  supabase,
  userId,
  slug,
}: BonusDownloadInput): Promise<BonusDownloadResult> {
  const material = getBonusMaterial(slug);
  if (!material) return { status: "not_found" };

  if (material.requiresPaidAccess) {
    const entitlement = await hasPermanentBonusAccess({ supabase, userId });
    if (entitlement.status === "read_failed") {
      return { status: "unavailable" };
    }
    if (!entitlement.hasPermanentAccess) return { status: "forbidden" };
  }

  const object = await getBonusObjectStatus({ supabase, material });
  if (object.status === "missing") return { status: "preparing" };
  if (object.status === "unavailable") return object;

  try {
    const storage = supabase.storage.from(BONUS_BUCKET);
    const result = material.downloadName
      ? await storage.createSignedUrl(material.objectPath, 60, {
          download: material.downloadName,
        })
      : await storage.createSignedUrl(material.objectPath, 60);

    if (result.error || !result.data?.signedUrl) {
      return { status: "unavailable" };
    }

    return {
      status: "ready",
      signedUrl: result.data.signedUrl,
      delivery: material.delivery,
    };
  } catch {
    return { status: "unavailable" };
  }
}

export {
  getBonusDownload,
  type BonusDownloadInput,
  type BonusDownloadResult,
};
