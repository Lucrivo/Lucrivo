import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  clearAdminUserFilters,
  persistAdminUserFilters,
} from "../admin-user-filters.action";
import type { AdminUserFilters } from "../admin-users.schema";

function AdminUserFilterForm({ filters }: { filters: AdminUserFilters }) {
  const canClear =
    filters.q !== "" || filters.state !== "current" || filters.access !== "all";

  return (
    <div className="grid gap-2">
      <form
        action={persistAdminUserFilters}
        className="grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,12rem)_minmax(10rem,12rem)_auto]"
      >
        <label className="grid min-w-0 gap-1.5 text-sm font-medium sm:col-span-2 xl:col-span-1">
          Buscar por e-mail
          <Input
            name="q"
            type="search"
            maxLength={120}
            defaultValue={filters.q}
            placeholder="nome@exemplo.com"
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Estado da conta
          <select
            name="state"
            defaultValue={filters.state}
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
            defaultValue={filters.access}
            className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="free">Gratuito</option>
            <option value="paid">Assinatura</option>
            <option value="courtesy">Cortesia</option>
          </select>
        </label>
        <Button type="submit" className="sm:col-span-2 xl:col-span-1">
          <SearchIcon aria-hidden="true" /> Filtrar
        </Button>
      </form>
      {canClear && (
        <form action={clearAdminUserFilters} className="justify-self-end">
          <Button type="submit" variant="ghost" size="sm">
            Limpar filtros salvos
          </Button>
        </form>
      )}
    </div>
  );
}

export { AdminUserFilterForm };
