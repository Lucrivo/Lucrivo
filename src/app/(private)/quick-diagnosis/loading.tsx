import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuickDiagnosisLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col"
      aria-busy="true"
      aria-label="Preparando diagnóstico"
    >
      <p className="sr-only" role="status">
        Preparando seu diagnóstico...
      </p>

      <div
        aria-hidden="true"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6 sm:py-10"
      >
        <div className="mb-5 grid gap-2 px-1 sm:mb-7">
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <Card className="border-border/70 shadow-md shadow-black/5">
          <CardHeader className="gap-3 border-b pb-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="min-h-40 py-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  data-skeleton-kind="diagnosis-option"
                  className="border-border bg-background flex min-h-36 flex-col gap-4 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <Skeleton className="size-4 rounded-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
