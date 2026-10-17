"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  DownloadIcon,
  LockKeyholeIcon,
  MapIcon,
  SheetIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BonusMaterialView } from "../services/get-bonus-library.service";
import { BonusUpgradeDialog } from "./bonus-upgrade-dialog";

type BonusNotice = "locked" | "preparing" | "unavailable";

type BonusLibraryProps = {
  materials: BonusMaterialView[];
  unlockedCount: 1 | 3;
  hasPermanentAccess: boolean;
  notice: BonusNotice | null;
};

const icons: Record<
  BonusMaterialView["slug"],
  ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>
> = {
  ebook: BookOpenIcon,
  guide: MapIcon,
  "cash-flow": SheetIcon,
};

const delays = [
  "[animation-delay:40ms]",
  "[animation-delay:110ms]",
  "[animation-delay:180ms]",
] as const;

const notices: Record<BonusNotice, string> = {
  locked: "Assine para liberar o guia e a planilha.",
  preparing: "O material ainda está sendo preparado.",
  unavailable: "Não foi possível acessar o material agora. Tente novamente.",
};

function MaterialStatus({ material }: { material: BonusMaterialView }) {
  if (material.access === "locked") {
    return (
      <Badge variant="warning">
        <LockKeyholeIcon aria-hidden="true" />
        Exclusivo para assinantes
      </Badge>
    );
  }

  if (material.availability === "preparing") {
    return (
      <Badge variant="warning">
        <Clock3Icon aria-hidden="true" />
        Em preparação
      </Badge>
    );
  }

  if (material.availability === "unavailable") {
    return (
      <Badge variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        Indisponível no momento
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      <CheckCircle2Icon aria-hidden="true" />
      {material.slug === "ebook" ? "Liberado" : "Seu para sempre"}
    </Badge>
  );
}

function MaterialAction({
  material,
  onUnlock,
}: {
  material: BonusMaterialView;
  onUnlock: () => void;
}) {
  if (material.access === "locked") {
    return (
      <Button
        type="button"
        size="lg"
        className="w-full motion-reduce:transform-none motion-reduce:transition-none"
        onClick={onUnlock}
      >
        <LockKeyholeIcon aria-hidden="true" />
        Desbloquear bônus
      </Button>
    );
  }

  if (material.availability === "preparing") {
    return (
      <Button type="button" size="lg" className="w-full" disabled>
        <Clock3Icon aria-hidden="true" />
        Material em preparação
      </Button>
    );
  }

  if (material.availability === "unavailable") {
    return (
      <Button type="button" size="lg" className="w-full" disabled>
        <CircleAlertIcon aria-hidden="true" />
        Tente novamente mais tarde
      </Button>
    );
  }

  const opensNewTab = material.delivery === "new_tab";
  const label =
    material.slug === "cash-flow" ? "Baixar planilha" : "Ler e baixar";
  const ActionIcon =
    material.slug === "cash-flow" ? DownloadIcon : ArrowUpRightIcon;

  return (
    <a
      href={`/api/bonus/${material.slug}`}
      className={cn(
        buttonVariants({ size: "lg" }),
        "w-full motion-reduce:transform-none motion-reduce:transition-none",
      )}
      target={opensNewTab ? "_blank" : undefined}
      rel={opensNewTab ? "noreferrer" : undefined}
      aria-label={opensNewTab ? `${label} — abre em nova aba` : label}
    >
      {label}
      <ActionIcon aria-hidden="true" />
    </a>
  );
}

function BonusLibrary({ materials, unlockedCount, notice }: BonusLibraryProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <section aria-labelledby="bonus-library-title" className="grid gap-6">
      {notice ? (
        <div
          role="alert"
          className="border-warning/35 bg-warning/10 text-foreground animate-fade-in flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 motion-reduce:animate-none"
        >
          <CircleAlertIcon
            aria-hidden="true"
            className="text-warning mt-0.5 size-4 shrink-0"
          />
          <span>{notices[notice]}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h2 id="bonus-library-title" className="text-2xl font-semibold">
            Sua biblioteca prática
          </h2>
          <p className="text-muted-foreground max-w-2xl leading-7">
            Materiais diretos ao ponto para organizar as finanças e acompanhar o
            caixa com mais clareza.
          </p>
        </div>
        <div className="bg-muted/60 ring-border flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1">
          <CheckCircle2Icon
            aria-hidden="true"
            className="text-success size-4"
          />
          <span>{unlockedCount} de 3 materiais liberados</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {materials.map((material, index) => {
          const Icon = icons[material.slug];
          return (
            <article
              key={material.slug}
              className={cn(
                "bg-card animate-fade-up border-border/75 hover:border-primary/30 group flex min-h-[23rem] flex-col rounded-xl border p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:animate-none motion-reduce:opacity-100",
                delays[index],
              )}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <span className="bg-primary/10 text-primary ring-primary/15 grid size-12 place-items-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <MaterialStatus material={material} />
              </div>

              <div className="grid gap-2">
                <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                  {material.typeLabel}
                </p>
                <h3 className="text-xl leading-snug font-semibold">
                  {material.title}
                </h3>
                <p className="text-muted-foreground leading-6">
                  {material.description}
                </p>
              </div>

              <div className="mt-auto pt-8">
                <MaterialAction
                  material={material}
                  onUnlock={() => setUpgradeOpen(true)}
                />
              </div>
            </article>
          );
        })}
      </div>

      <BonusUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </section>
  );
}

export { BonusLibrary, type BonusLibraryProps, type BonusNotice };
