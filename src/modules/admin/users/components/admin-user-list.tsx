import Link from "next/link";
import { ChevronRightIcon, SearchIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  accessLabel,
  accountLabel,
  formatDate,
} from "../admin-users.formatters";
import type {
  AdminUser,
  AdminUserFilters,
  AdminUserList as ListData,
} from "../admin-users.schema";
import { encodeCursor, listUrl } from "../admin-users.urls";
import { AdminUserActions } from "./admin-user-actions";

function StateBadge({ user }: { user: AdminUser }) {
  return (
    <Badge
      variant={
        user.state === "active"
          ? "success"
          : user.state === "blocked"
            ? "warning"
            : "destructive"
      }
    >
      {accountLabel(user.state)}
    </Badge>
  );
}
function AccessBadge({ user }: { user: AdminUser }) {
  return (
    <Badge
      variant={
        user.access === "paid"
          ? "info"
          : user.access === "courtesy"
            ? "warning"
            : "outline"
      }
    >
      {accessLabel(user.access)}
    </Badge>
  );
}
function detailUrl(id: string, context: string) {
  return `/admin/users/${id}?from=${encodeURIComponent(context)}`;
}

function pagination(
  filters: AdminUserFilters,
  nextCursor: ListData["nextCursor"],
) {
  let stack: string[] = [];
  try {
    const parsed: unknown = filters.back
      ? JSON.parse(Buffer.from(filters.back, "base64url").toString("utf8"))
      : [];
    if (
      Array.isArray(parsed) &&
      parsed.length <= 100 &&
      parsed.every((item) => typeof item === "string" && item.length <= 500)
    )
      stack = parsed;
  } catch {
    /* Invalid history starts at the first page. */
  }
  const previous = stack.length
    ? listUrl(
        filters,
        stack.at(-1) || undefined,
        stack.length > 1
          ? Buffer.from(JSON.stringify(stack.slice(0, -1))).toString(
              "base64url",
            )
          : undefined,
      )
    : null;
  const next = nextCursor
    ? listUrl(
        filters,
        encodeCursor(nextCursor),
        Buffer.from(JSON.stringify([...stack, filters.cursor ?? ""])).toString(
          "base64url",
        ),
      )
    : null;
  return { previous, next };
}

function AdminUserList({
  data,
  filters,
}: {
  data: ListData;
  filters: AdminUserFilters;
}) {
  const context = listUrl(filters, filters.cursor, filters.back);
  const { previous, next } = pagination(filters, data.nextCursor);
  return (
    <main className="mx-auto grid w-full max-w-[100rem] gap-6">
      <header className="border-primary/10 rounded-3xl border bg-[linear-gradient(135deg,var(--card)_0%,color-mix(in_oklab,var(--primary)_7%,var(--card))_100%)] px-5 py-6 shadow-sm sm:px-7">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">
          Administração
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Usuários
        </h1>
        <p className="text-muted-foreground mt-2">
          Encontre contas, acompanhe acesso e gerencie alterações com histórico.
        </p>
      </header>
      <Card className="border-border/70 rounded-2xl shadow-sm">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>
              <h2>Gestão de usuários</h2>
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Resultados por cadastro mais recente
            </p>
          </div>
          <form
            action="/admin/users"
            method="get"
            className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto] md:items-end"
          >
            <label className="grid gap-1.5 text-sm font-medium">
              Buscar por e-mail
              <Input
                name="q"
                type="search"
                maxLength={120}
                defaultValue={filters.q}
                placeholder="nome@exemplo.com"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Estado da conta
              <select
                name="state"
                defaultValue={filters.state}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="current">Ativos e bloqueados</option>
                <option value="active">Ativos</option>
                <option value="blocked">Bloqueados</option>
                <option value="deleted">Excluídos</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Tipo de acesso
              <select
                name="access"
                defaultValue={filters.access}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="free">Gratuito</option>
                <option value="paid">Assinatura</option>
                <option value="courtesy">Cortesia</option>
              </select>
            </label>
            <Button type="submit">
              <SearchIcon aria-hidden="true" /> Filtrar
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.items.length === 0 ? (
            <div className="bg-muted/20 grid min-h-48 place-items-center rounded-xl border border-dashed px-5 text-center">
              <div className="space-y-2">
                <UsersIcon
                  className="text-muted-foreground mx-auto size-7"
                  aria-hidden="true"
                />
                <p className="font-medium">Nenhum usuário encontrado</p>
                <p className="text-muted-foreground text-sm">
                  Ajuste a busca ou os filtros para tentar novamente.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <Table aria-label="Usuários">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Acesso</TableHead>
                      <TableHead>Assinatura</TableHead>
                      <TableHead>Diagnósticos</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((user) => (
                      <TableRow
                        key={user.id}
                        className="group focus-within:bg-primary/5 hover:bg-primary/5 relative cursor-pointer"
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={detailUrl(user.id, context)}
                            className="after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:outline-2"
                            aria-label={`Ver usuário ${user.email}`}
                          >
                            {user.email}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StateBadge user={user} />
                        </TableCell>
                        <TableCell>
                          <AccessBadge user={user} />
                        </TableCell>
                        <TableCell>
                          {user.subscription
                            ? `${user.subscription.billingMode === "monthly" ? "Mensal" : "Anual"} · ${formatDate(user.subscription.accessEndsAt)}`
                            : "—"}
                        </TableCell>
                        <TableCell>{user.diagnosisCount}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>{formatDate(user.lastSignInAt)}</TableCell>
                        <TableCell className="relative z-10 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ChevronRightIcon
                              className="text-muted-foreground size-4"
                              aria-hidden="true"
                            />
                            <AdminUserActions
                              user={user}
                              listContext={context}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="grid gap-3 lg:hidden">
                {data.items.map((user) => (
                  <li
                    key={user.id}
                    className="bg-muted/15 hover:bg-primary/5 focus-within:bg-primary/5 relative rounded-xl border p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={detailUrl(user.id, context)}
                          className="block truncate font-medium after:absolute after:inset-0 focus-visible:after:rounded-xl focus-visible:after:outline-2"
                          aria-label={`Ver usuário ${user.email}`}
                        >
                          {user.email}
                        </Link>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Cadastro: {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <div className="relative z-10">
                        <AdminUserActions user={user} listContext={context} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StateBadge user={user} />
                      <AccessBadge user={user} />
                      <span className="text-muted-foreground text-xs">
                        {user.diagnosisCount} diagnósticos
                      </span>
                      <ChevronRightIcon
                        className="text-muted-foreground ml-auto size-4"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Último acesso: {formatDate(user.lastSignInAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <nav
            aria-label="Paginação de usuários"
            className="flex items-center justify-between gap-3 border-t pt-4"
          >
            <span className="text-muted-foreground text-sm">
              {data.items.length} usuário(s) nesta página
            </span>
            <div className="flex gap-2">
              {previous && (
                <Link
                  href={previous}
                  className="hover:bg-muted rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2"
                >
                  Anterior
                </Link>
              )}
              {next && (
                <Link
                  href={next}
                  className="hover:bg-muted rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2"
                >
                  Próxima
                </Link>
              )}
            </div>
          </nav>
        </CardContent>
      </Card>
    </main>
  );
}

export { AdminUserList };
