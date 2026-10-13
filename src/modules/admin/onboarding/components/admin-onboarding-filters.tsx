"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  adminOnboardingUrl,
  type AdminOnboardingFilters as FilterValues,
  type AdminOnboardingNavigation,
} from "../admin-onboarding.filters";
import type {
  AdminBusinessCatalog,
  AdminOnboardingConsent,
} from "../admin-onboarding.schema";

type FilterPatch = Partial<FilterValues>;

function AdminOnboardingFilters({
  navigation,
  catalog,
  variant = "contacts",
}: {
  navigation: AdminOnboardingNavigation;
  catalog: AdminBusinessCatalog;
  variant?: "overview" | "contacts";
}) {
  const router = useRouter();
  const filters = navigation.filters;
  const [query, setQuery] = useState(filters.q);
  const [segmentId, setSegmentId] = useState(filters.segmentId);
  const [subcategoryId, setSubcategoryId] = useState(filters.subcategoryId);
  const [consent, setConsent] = useState(filters.consent);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const selectedSegment = useMemo(
    () => catalog.find((segment) => segment.id === segmentId) ?? null,
    [catalog, segmentId],
  );

  function navigate(patch: FilterPatch) {
    router.replace(adminOnboardingUrl(navigation, patch), { scroll: false });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      q: variant === "contacts" ? query.trim() : "",
      segmentId: variant === "contacts" ? segmentId : null,
      subcategoryId: variant === "contacts" ? subcategoryId : null,
      consent: variant === "contacts" ? consent : "all",
      from: from || null,
      to: to || null,
    });
  }

  const activeFilters: Array<{
    key: string;
    label: string;
    removeLabel: string;
    patch: FilterPatch;
  }> = [];
  if (filters.q) {
    activeFilters.push({
      key: "q",
      label: `Busca: ${filters.q}`,
      removeLabel: `Remover busca ${filters.q}`,
      patch: { q: "" },
    });
  }
  if (filters.segmentId !== null) {
    const label =
      catalog.find((item) => item.id === filters.segmentId)?.name ??
      `#${filters.segmentId}`;
    activeFilters.push({
      key: "segment",
      label: `Segmento: ${label}`,
      removeLabel: `Remover segmento ${label}`,
      patch: { segmentId: null },
    });
  }
  if (filters.subcategoryId !== null) {
    const label = catalog
      .flatMap((segment) => segment.subcategories)
      .find((item) => item.id === filters.subcategoryId)?.name;
    activeFilters.push({
      key: "subcategory",
      label: `Subcategoria: ${label ?? `#${filters.subcategoryId}`}`,
      removeLabel: `Remover subcategoria ${label ?? filters.subcategoryId}`,
      patch: { subcategoryId: null },
    });
  }
  if (filters.consent !== "all") {
    const label =
      filters.consent === "granted" ? "Autorizado" : "Não autorizado";
    activeFilters.push({
      key: "consent",
      label: `Consentimento: ${label}`,
      removeLabel: `Remover consentimento ${label}`,
      patch: { consent: "all" },
    });
  }
  if (filters.from) {
    activeFilters.push({
      key: "from",
      label: `De: ${filters.from}`,
      removeLabel: `Remover data inicial ${filters.from}`,
      patch: { from: null },
    });
  }
  if (filters.to) {
    activeFilters.push({
      key: "to",
      label: `Até: ${filters.to}`,
      removeLabel: `Remover data final ${filters.to}`,
      patch: { to: null },
    });
  }

  return (
    <div className="grid min-w-0 gap-3">
      <form
        role="search"
        aria-label={
          variant === "overview"
            ? "Filtrar indicadores de onboarding"
            : "Filtrar contatos do onboarding"
        }
        onSubmit={submit}
        className={
          variant === "overview"
            ? "grid min-w-0 gap-3 sm:grid-cols-[minmax(9rem,12rem)_minmax(9rem,12rem)_minmax(0,1fr)] sm:items-end"
            : "grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1.5fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,0.8fr)_9.5rem_9.5rem_auto] xl:items-end"
        }
      >
        {variant === "contacts" ? (
          <>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Buscar contato
              <Input
                name="q"
                type="search"
                maxLength={120}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome ou WhatsApp"
              />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Segmento
              <select
                name="segmentId"
                value={segmentId ?? ""}
                onChange={(event) => {
                  setSegmentId(
                    event.target.value ? Number(event.target.value) : null,
                  );
                  setSubcategoryId(null);
                }}
                className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm"
              >
                <option value="">Todos</option>
                {catalog.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                    {segment.isActive ? "" : " (arquivado)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Subcategoria
              <select
                name="subcategoryId"
                value={subcategoryId ?? ""}
                disabled={!selectedSegment}
                onChange={(event) =>
                  setSubcategoryId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm disabled:opacity-60"
              >
                <option value="">Todas</option>
                {selectedSegment?.subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                    {subcategory.isActive ? "" : " (arquivada)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Consentimento
              <select
                name="consent"
                value={consent}
                onChange={(event) =>
                  setConsent(event.target.value as AdminOnboardingConsent)
                }
                className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="granted">Autorizado</option>
                <option value="declined">Não autorizado</option>
              </select>
            </label>
          </>
        ) : null}
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          De
          <Input
            name="from"
            type="date"
            maxLength={10}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Até
          <Input
            name="to"
            type="date"
            maxLength={10}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          className={
            variant === "overview"
              ? "w-full sm:w-fit sm:justify-self-end"
              : undefined
          }
        >
          <SearchIcon aria-hidden="true" />
          Filtrar
        </Button>
      </form>
      {activeFilters.length ? (
        <div
          className="flex min-w-0 flex-wrap gap-2"
          aria-label="Filtros ativos"
        >
          {activeFilters.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              variant="outline"
              size="sm"
              aria-label={filter.removeLabel}
              onClick={() => navigate(filter.patch)}
              className="h-8 max-w-full min-w-0 rounded-full font-normal"
            >
              <span className="truncate">{filter.label}</span>
              <XIcon aria-hidden="true" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { AdminOnboardingFilters };
