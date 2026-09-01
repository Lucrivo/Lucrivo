import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl gap-7"
      aria-busy="true"
      aria-label="Preparando relatório"
    >
      <p className="sr-only" role="status">
        Preparando seu relatório financeiro...
      </p>
      <Card className="rounded-3xl px-2 py-3">
        <CardHeader className="gap-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-5 w-56" />
        </CardHeader>
      </Card>
      <Skeleton className="h-[34rem] rounded-3xl sm:h-[28rem]" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-xl" />
        <section aria-label="Carregando análise" className="grid gap-4">
          <Skeleton className="mb-2 h-16 w-2/3" />
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index} className="h-48">
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="grid gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-12 w-44" />
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
