import { Skeleton } from "@/components/ui/skeleton";

export default function PrivateAreaLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-6xl gap-8"
      aria-busy="true"
      aria-label="Carregando conteúdo"
    >
      <p className="sr-only" role="status">
        Carregando sua área financeira...
      </p>

      <div aria-hidden="true" className="grid gap-8">
        <header className="grid max-w-3xl gap-3">
          <Skeleton className="h-10 w-64 max-w-[75%]" />
          <Skeleton className="h-5 w-full max-w-xl" />
          <Skeleton className="h-5 w-4/5 max-w-lg" />
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              data-skeleton-kind="summary"
              className="bg-card grid min-h-36 gap-4 rounded-2xl border p-5"
            >
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-9 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </section>

        <section
          data-skeleton-kind="detail"
          className="bg-card grid gap-5 rounded-2xl border p-5 sm:p-6"
        >
          <Skeleton className="h-7 w-52 max-w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </section>
      </div>
    </main>
  );
}
