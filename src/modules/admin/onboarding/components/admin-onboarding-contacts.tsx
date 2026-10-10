import Link from "next/link";
import { ContactRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  adminOnboardingUrl,
  encodeAdminOnboardingCursor,
  type AdminOnboardingNavigation,
} from "../admin-onboarding.filters";
import type {
  AdminOnboardingContact,
  AdminOnboardingContacts as Contacts,
} from "../admin-onboarding.schema";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function consentBadge(contact: AdminOnboardingContact) {
  return (
    <Badge variant={contact.consent ? "success" : "outline"}>
      {contact.consent ? "Autorizado" : "Não autorizado"}
    </Badge>
  );
}

function subcategoryLabel(contact: AdminOnboardingContact) {
  return contact.customSubcategory
    ? `${contact.subcategory.name} · ${contact.customSubcategory}`
    : contact.subcategory.name;
}

function AdminOnboardingContacts({
  data,
  navigation,
}: {
  data: Contacts;
  navigation: AdminOnboardingNavigation;
}) {
  const nextHref = data.nextCursor
    ? adminOnboardingUrl(navigation, {
        cursor: encodeAdminOnboardingCursor(data.nextCursor),
      })
    : null;
  const firstHref = navigation.filters.cursor
    ? adminOnboardingUrl(navigation, { cursor: null })
    : null;

  return (
    <Card className="border-border/70 min-w-0 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>
          <h2>Contatos concluídos</h2>
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Dados operacionais informados no onboarding, ordenados pelos mais
          recentes.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        {data.items.length === 0 ? (
          <div className="bg-muted/20 grid min-h-52 place-items-center rounded-xl border border-dashed px-6 text-center">
            <div className="space-y-2">
              <ContactRoundIcon
                aria-hidden="true"
                className="text-muted-foreground mx-auto size-7"
              />
              <p className="font-medium">
                Ainda não há perfis concluídos neste período.
              </p>
              <p className="text-muted-foreground text-sm">
                Ajuste os filtros para ampliar a consulta.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden min-w-0 lg:block">
              <Table aria-label="Contatos do onboarding">
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Subcategoria</TableHead>
                    <TableHead>Consentimento</TableHead>
                    <TableHead>Concluído em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((contact) => (
                    <TableRow key={contact.userId}>
                      <TableCell className="font-medium">
                        {contact.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {contact.whatsappE164}
                      </TableCell>
                      <TableCell>{contact.segment.name}</TableCell>
                      <TableCell>{subcategoryLabel(contact)}</TableCell>
                      <TableCell>{consentBadge(contact)}</TableCell>
                      <TableCell className="tabular-nums">
                        {dateFormatter.format(new Date(contact.completedAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul
              className="grid gap-3 lg:hidden"
              aria-label="Contatos em cartões"
            >
              {data.items.map((contact) => (
                <li
                  key={contact.userId}
                  className="bg-muted/15 min-w-0 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.fullName}</p>
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        {contact.whatsappE164}
                      </p>
                    </div>
                    {consentBadge(contact)}
                  </div>
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Segmento</dt>
                    <dd className="text-right">{contact.segment.name}</dd>
                    <dt className="text-muted-foreground">Subcategoria</dt>
                    <dd className="text-right">{subcategoryLabel(contact)}</dd>
                    <dt className="text-muted-foreground">Conclusão</dt>
                    <dd className="text-right tabular-nums">
                      {dateFormatter.format(new Date(contact.completedAt))}
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}

        <nav
          aria-label="Paginação dos contatos"
          className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-muted-foreground text-sm">
            {data.items.length} contato(s) nesta página
          </span>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {firstHref ? (
              <Link
                href={firstHref}
                className="hover:bg-muted rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2"
              >
                Voltar ao início
              </Link>
            ) : null}
            {nextHref ? (
              <Link
                href={nextHref}
                className="hover:bg-muted rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2"
              >
                Próxima
              </Link>
            ) : null}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}

export { AdminOnboardingContacts };
