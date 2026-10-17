import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "@/modules/auth/services/require-user";
import { getBonusDownload } from "@/modules/bonus/services/get-bonus-download.service";

const PRIVATE_NO_STORE = "private, no-store";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": PRIVATE_NO_STORE },
  });
}

function redirect(url: URL | string, status: 302 | 303) {
  const response = NextResponse.redirect(url, status);
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}

async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  let userId: string;
  let supabase;

  try {
    ({ userId, supabase } = await requireClientAccess());
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return json({ error: "unauthorized" }, 401);
    }
    if (error instanceof LegalAcceptanceRequiredError) {
      return json({ error: "legal_acceptance_required" }, 403);
    }
    return json({ error: "service_unavailable" }, 503);
  }

  try {
    const { slug } = await context.params;
    const result = await getBonusDownload({ supabase, userId, slug });

    switch (result.status) {
      case "not_found":
        return json({ error: "material_not_found" }, 404);
      case "forbidden": {
        const url = new URL("/bonus", request.url);
        url.searchParams.set("notice", "locked");
        return redirect(url, 303);
      }
      case "preparing": {
        const url = new URL("/bonus", request.url);
        url.searchParams.set("notice", "preparing");
        return redirect(url, 303);
      }
      case "unavailable": {
        const url = new URL("/bonus", request.url);
        url.searchParams.set("notice", "unavailable");
        return redirect(url, 303);
      }
      case "ready":
        return redirect(result.signedUrl, 302);
    }
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { GET };
