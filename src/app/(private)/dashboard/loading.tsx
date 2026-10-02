import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10"
      aria-busy="true"
      aria-label="Carregando visão geral dos diagnósticos"
    >
      <p className="sr-only" role="status">
        Carregando visão geral dos diagnósticos...
      </p>
      <header className="grid gap-5 px-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:py-4">
        <div className="grid max-w-2xl gap-2">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-6 w-lg max-w-full" />
        </div>
        <Skeleton className="h-11 w-48 max-w-full" />
      </header>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <section
        aria-label="Carregando indicadores"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </section>
      <section
        aria-label="Carregando distribuições"
        className="grid gap-4 lg:grid-cols-2"
      >
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </section>
      <section
        aria-label="Carregando relatórios recentes"
        className="grid gap-4 xl:grid-cols-2"
      >
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </section>
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
