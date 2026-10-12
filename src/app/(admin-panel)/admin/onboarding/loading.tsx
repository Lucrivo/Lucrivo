import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOnboardingLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-[100rem] grid-cols-[minmax(0,1fr)] gap-6 lg:gap-8"
      aria-label="Carregando onboarding"
    >
      <div className="rounded-3xl border px-5 py-7 sm:px-7">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
      </div>
      <div className="flex gap-6 border-b pb-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </main>
  );
}
