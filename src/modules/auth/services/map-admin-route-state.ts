import "server-only";

import { notFound, redirect } from "next/navigation";

import { AdminRequiredError } from "@/modules/auth/services/require-admin";
import { resolveAdminAccessState } from "@/modules/auth/services/resolve-admin-access-state";
import { AuthRequiredError } from "@/modules/auth/services/require-user";

async function getAdminRouteState() {
  try {
    return await resolveAdminAccessState();
  } catch (error) {
    if (error instanceof AuthRequiredError) redirect("/login");
    if (error instanceof AdminRequiredError) notFound();
    throw error;
  }
}

export { getAdminRouteState };
