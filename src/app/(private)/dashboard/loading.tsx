import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
      <Card className="rounded-3xl px-3 py-4">
        <CardHeader className="gap-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-11 w-3/5" />
          <Skeleton className="h-5 w-2/5" />
        </CardHeader>
      </Card>
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
