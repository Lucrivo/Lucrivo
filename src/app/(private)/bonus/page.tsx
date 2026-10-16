import { GiftIcon, ShieldCheckIcon } from "lucide-react";

import { requireUser } from "@/modules/auth/services/require-user";
import {
  BonusLibrary,
  type BonusNotice,
} from "@/modules/bonus/components/bonus-library";
import { getBonusLibrary } from "@/modules/bonus/services/get-bonus-library.service";

type BonusPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

const validNotices = new Set<BonusNotice>([
  "locked",
  "preparing",
  "unavailable",
]);

function normalizeNotice(value: string | string[] | undefined) {
  return typeof value === "string" && validNotices.has(value as BonusNotice)
    ? (value as BonusNotice)
    : null;
}

export default async function BonusPage({ searchParams }: BonusPageProps) {
  const params = await searchParams;
  const notice = normalizeNotice(params.notice);
  const { userId, supabase } = await requireUser();
  const result = await getBonusLibrary({ supabase, userId });

  if (result.status === "read_failed") {
    throw new Error("bonus_library_unavailable");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 pb-10">
      <header className="border-primary/15 bg-card relative overflow-hidden rounded-3xl border px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="bg-primary/8 pointer-events-none absolute -top-28 -right-16 size-72 rounded-full blur-3xl"
        />
        <div className="relative grid max-w-3xl gap-5">
          <div className="flex items-center gap-4">
            <span className="bg-primary/10 text-primary ring-primary/15 grid size-12 shrink-0 place-items-center rounded-xl ring-1">
              <GiftIcon aria-hidden="true" className="size-5" />
            </span>
            <h1>Bônus</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-base leading-7 sm:text-lg">
            Conteúdos práticos para você organizar as finanças do negócio e
            colocar o controle em dia.
          </p>
          <div className="text-muted-foreground flex items-start gap-2 text-sm leading-6">
            <ShieldCheckIcon
              aria-hidden="true"
              className="text-success mt-0.5 size-4 shrink-0"
            />
            <p>
              Ao assinar, o guia e a planilha ficam disponíveis para sempre,
              mesmo após o fim normal do plano.
            </p>
          </div>
        </div>
      </header>

      <BonusLibrary {...result.overview} notice={notice} />
    </main>
  );
}
