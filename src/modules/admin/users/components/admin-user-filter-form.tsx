"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { AdminUserFilters } from "../admin-users.schema";

type Operation = "filter" | "clear";

async function updateStoredFilters(
  method: "POST" | "DELETE",
  filters?: Pick<AdminUserFilters, "q" | "state" | "access">,
) {
  const response = await fetch("/api/admin/users/filters", {
    method,
    headers: filters ? { "Content-Type": "application/json" } : undefined,
    body: filters ? JSON.stringify(filters) : undefined,
  });
  const payload: unknown = await response.json();

  if (
    !response.ok ||
    typeof payload !== "object" ||
    payload === null ||
    !("href" in payload) ||
    typeof payload.href !== "string" ||
    !payload.href.startsWith("/admin/users")
  ) {
    throw new Error("admin_user_filters_update_failed");
  }

  return payload.href;
}

function AdminUserFilterForm({ filters }: { filters: AdminUserFilters }) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q);
  const [state, setState] = useState(filters.state);
  const [access, setAccess] = useState(filters.access);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const canClear =
    filters.q !== "" || filters.state !== "current" || filters.access !== "all";

  function navigate(operation: Operation) {
    if (pending) return;

    setOperation(operation);
    setError(false);
    startTransition(async () => {
      try {
        const href = await updateStoredFilters(
          operation === "filter" ? "POST" : "DELETE",
          operation === "filter"
            ? { q: query.trim(), state, access }
            : undefined,
        );
        router.replace(href, { scroll: false });
      } catch {
        setError(true);
      } finally {
        setOperation(null);
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("filter");
  }

  return (
    <div className="grid gap-2">
      <form
        onSubmit={submit}
        aria-busy={pending}
        className="grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,12rem)_minmax(10rem,12rem)_auto]"
      >
        <label className="grid min-w-0 gap-1.5 text-sm font-medium sm:col-span-2 xl:col-span-1">
          Buscar por e-mail
          <Input
            name="q"
            type="search"
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="nome@exemplo.com"
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Estado da conta
          <select
            name="state"
            value={state}
            onChange={(event) =>
              setState(event.target.value as AdminUserFilters["state"])
            }
            className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm"
          >
            <option value="current">Ativos e bloqueados</option>
            <option value="active">Ativos</option>
            <option value="blocked">Bloqueados</option>
            <option value="deleted">Excluídos</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Tipo de acesso
          <select
            name="access"
            value={access}
            onChange={(event) =>
              setAccess(event.target.value as AdminUserFilters["access"])
            }
            className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="free">Gratuito</option>
            <option value="paid">Assinatura</option>
            <option value="courtesy">Cortesia</option>
          </select>
        </label>
        <Button
          type="submit"
          disabled={pending}
          className="sm:col-span-2 xl:col-span-1"
        >
          <SearchIcon aria-hidden="true" />
          {pending && operation === "filter" ? "Filtrando..." : "Filtrar"}
        </Button>
      </form>
      {canClear && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => navigate("clear")}
          className="justify-self-end"
        >
          {pending && operation === "clear"
            ? "Limpando..."
            : "Limpar filtros salvos"}
        </Button>
      )}
      {error ? (
        <p className="text-destructive justify-self-end text-sm" role="alert">
          Não foi possível atualizar os filtros. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}

export { AdminUserFilterForm };
