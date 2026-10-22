import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ItemLabel = { singular: string; plural: string };

function visiblePages(page: number, totalPages: number) {
  return [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((candidate) => candidate >= 1 && candidate <= totalPages)
    .sort((a, b) => a - b);
}

function AdminPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  itemLabel,
  buildHref,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  itemLabel: ItemLabel;
  buildHref: (page: number) => string;
}) {
  const label = totalCount === 1 ? itemLabel.singular : itemLabel.plural;
  const summary =
    totalCount === 0
      ? `0 ${label} · Página 0 de 0`
      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} de ${totalCount} ${label} · Página ${page} de ${totalPages}`;
  const pages = visiblePages(page, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-muted-foreground text-sm tabular-nums">{summary}</p>
      {totalPages > 0 && (
        <Pagination
          aria-label="Paginação"
          className="mx-0 w-auto justify-start"
        >
          <PaginationContent className="flex-wrap">
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  href={buildHref(page - 1)}
                  aria-label="Página anterior"
                  text="Anterior"
                  className="min-h-11"
                />
              </PaginationItem>
            )}
            {pages.map((candidate, index) => {
              const previous = pages[index - 1];
              return (
                <PaginationItem key={candidate} className="contents">
                  {previous !== undefined && candidate - previous > 1 && (
                    <span className="inline-flex items-center">
                      <PaginationEllipsis />
                      <span className="sr-only">Mais páginas</span>
                    </span>
                  )}
                  <PaginationLink
                    href={buildHref(candidate)}
                    isActive={candidate === page}
                    aria-label={`Página ${candidate}`}
                    className="min-h-11 min-w-11"
                  >
                    {candidate}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext
                  href={buildHref(page + 1)}
                  aria-label="Próxima página"
                  text="Próxima"
                  className="min-h-11"
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export { AdminPagination };
