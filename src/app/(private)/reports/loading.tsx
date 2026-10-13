import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl gap-7"
      aria-busy="true"
      aria-label="Carregando diagnósticos"
    >
      <p className="sr-only" role="status">
        Carregando seus diagnósticos salvos...
      </p>
      <Card className="rounded-3xl px-3 py-4">
        <CardHeader className="gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-2/5" />
          <Skeleton className="h-5 w-3/5" />
        </CardHeader>
      </Card>
      <section
        aria-label="Carregando relatórios"
        className="grid gap-4 xl:grid-cols-2"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="h-72">
            <CardHeader className="gap-3">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-9 w-36 justify-self-end" />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
