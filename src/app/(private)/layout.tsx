import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  return children;
}
