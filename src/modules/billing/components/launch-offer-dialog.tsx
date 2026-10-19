"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  GiftIcon,
  Table2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/lucrivo-logo-dark.svg";

import { OfferCountdown } from "./offer-countdown";

type LaunchOfferDialogView = {
  phase: "bonus_active" | "price_active";
  endsAt: string;
  monthlyPriceLabel: string;
  monthlyRenewalPriceLabel: string;
  semiannualInstallmentLabel: string;
  monthlyAccessMonths: number;
  monthlyBonusMonths: number;
  semiannualAccessMonths: number;
  semiannualBonusMonths: number;
};

type LaunchOfferDialogProps = {
  context: "landing" | "diagnosis";
  offer: LaunchOfferDialogView;
  dismissHref?: string;
};

const contextCopy = {
  landing: {
    title: "Oferta de lançamento Lucrivo",
    headline: "Mais tempo para transformar diagnóstico em decisão.",
    description:
      "Descubra onde seu preço precisa de atenção e aproveite as condições especiais para continuar acompanhando seu negócio.",
  },
  diagnosis: {
    title: "Oferta de lançamento Lucrivo",
    headline: "Seu diagnóstico está pronto. Agora é hora de agir.",
    description:
      "Continue usando o Lucrivo para testar ajustes, acompanhar seus números e tomar decisões com mais clareza.",
  },
} as const;

function LaunchOfferDialog({
  context,
  offer,
  dismissHref,
}: LaunchOfferDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const copy = contextCopy[context];
  const countdownPurpose =
    offer.phase === "bonus_active" ? "bonus" : "launch_price";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && dismissHref) {
      router.replace(dismissHref, { scroll: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        aria-label={copy.title}
        showCloseButton={false}
        className={cn(
          "launch-offer-scrollbar top-[calc((100dvh+var(--launch-dialog-offset))/2)] max-h-[calc(100dvh-var(--launch-dialog-offset)-1.5rem)] gap-0 overflow-y-auto border-0 bg-[oklch(0.24_0.11_259)] p-0 text-white shadow-[0_28px_80px_-24px_oklch(0.12_0.08_259/0.8)] [--launch-dialog-offset:0px] sm:max-w-2xl",
          context === "landing" &&
            "[--launch-dialog-offset:calc(3.25rem+env(safe-area-inset-top,0px))] max-[900px]:[--launch-dialog-offset:calc(6.25rem+env(safe-area-inset-top,0px))]",
        )}
      >
        <div className="relative overflow-hidden px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-[oklch(0.62_0.24_253/0.38)] blur-3xl"
          />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5" aria-label="Lucrivo">
              <span className="grid size-9 place-items-center rounded-lg bg-white/10 p-1.5">
                <Image
                  src={logo}
                  alt=""
                  width={36}
                  height={36}
                  className="size-full"
                />
              </span>
              <span className="text-lg font-bold tracking-[-0.03em]">
                Lucrivo
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.76_0.18_77)] px-3 py-1.5 text-xs font-bold text-[oklch(0.22_0.06_65)] shadow-sm">
              <GiftIcon aria-hidden="true" className="size-4" />
              Oferta de lançamento
            </span>
          </div>

          <DialogHeader className="relative mt-6 max-w-xl gap-3 text-left sm:mt-8">
            <DialogTitle className="text-2xl leading-tight font-bold tracking-[-0.03em] text-balance text-white sm:text-4xl">
              {copy.headline}
            </DialogTitle>
            <DialogDescription className="max-w-[62ch] text-sm leading-6 text-pretty text-blue-100 sm:text-base">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <section
            aria-label="Plano mensal promocional"
            className="relative mt-6 overflow-hidden rounded-2xl bg-white p-5 text-[oklch(0.2_0.06_259)] shadow-[0_18px_42px_-22px_oklch(0.05_0.08_259/0.9)] sm:p-6"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold tracking-wide text-[oklch(0.43_0.18_259)] uppercase">
                  Plano mensal
                </p>
                <p className="mt-2 flex flex-wrap items-end gap-x-2">
                  <strong className="text-5xl leading-none font-black tracking-[-0.04em] tabular-nums sm:text-6xl">
                    {offer.monthlyPriceLabel}
                  </strong>
                  <span className="pb-1 text-base font-bold">
                    no primeiro pagamento
                  </span>
                </p>
              </div>
              <div className="max-w-64 text-sm leading-5 font-semibold text-pretty text-[oklch(0.34_0.07_259)]">
                <p>
                  O primeiro pagamento libera {offer.monthlyAccessMonths}{" "}
                  {offer.monthlyAccessMonths === 1 ? "mês" : "meses"} de acesso.
                </p>
                {offer.monthlyBonusMonths > 0 ? (
                  <p className="mt-1">
                    Inclui {offer.monthlyBonusMonths} mês de bônus.
                  </p>
                ) : null}
                <p className="mt-1">{offer.monthlyRenewalPriceLabel}</p>
              </div>
            </div>
          </section>

          <div className="relative mt-4 grid gap-4 rounded-2xl bg-[oklch(0.48_0.22_259)] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
            <div>
              <p className="font-bold">
                {offer.phase === "bonus_active"
                  ? "Garanta o bônus durante a campanha"
                  : "Garanta o preço de lançamento"}
              </p>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                Condição promocional disponível até o fim da contagem.
              </p>
            </div>
            <div className="min-w-0 rounded-xl bg-black/15 px-4 py-3 [&_[data-countdown-digits]]:gap-4 [&_dd]:text-xl [&_dt]:text-white/80">
              <OfferCountdown
                purpose={countdownPurpose}
                endsAt={offer.endsAt}
                compact
              />
            </div>
          </div>

          <div className="relative mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <ul className="grid gap-2 text-sm text-blue-50">
              <li className="flex items-center gap-2">
                <BookOpenIcon
                  aria-hidden="true"
                  className="size-4 text-blue-300"
                />
                E-book, método de vendas e planilha de fluxo de caixa
              </li>
              <li className="flex items-center gap-2">
                <Table2Icon
                  aria-hidden="true"
                  className="size-4 text-blue-300"
                />
                Materiais liberados com a compra confirmada
              </li>
            </ul>
            <div className="rounded-xl bg-[oklch(0.76_0.18_77)] px-4 py-3 text-[oklch(0.22_0.06_65)]">
              <p className="text-xs font-bold uppercase">Plano semestral</p>
              <p className="mt-1 font-bold">
                6x de{" "}
                <span className="text-xl tabular-nums">
                  {offer.semiannualInstallmentLabel}
                </span>
              </p>
              <p className="mt-0.5 text-xs font-semibold">
                {offer.semiannualAccessMonths} meses de acesso
              </p>
              {offer.semiannualBonusMonths > 0 ? (
                <p className="mt-0.5 text-xs font-semibold">
                  Inclui {offer.semiannualBonusMonths} meses de bônus
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 grid gap-2 bg-[oklch(0.24_0.11_259)] px-5 pt-3 pb-5 sm:px-8 sm:pb-7">
          <Link
            href="/billing"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-bold text-[oklch(0.3_0.16_259)] shadow-sm transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.24_0.11_259)] focus-visible:outline-none active:translate-y-0 motion-reduce:transition-none"
          >
            <CheckIcon aria-hidden="true" className="size-5" />
            Quero aproveitar a oferta
            <ArrowRightIcon aria-hidden="true" className="size-5" />
          </Link>
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-blue-100 hover:bg-white/10 hover:text-white"
              />
            }
          >
            Talvez mais tarde
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { LaunchOfferDialog };
export type { LaunchOfferDialogProps, LaunchOfferDialogView };
