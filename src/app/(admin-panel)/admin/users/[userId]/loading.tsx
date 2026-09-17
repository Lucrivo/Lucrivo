import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUserDetailLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando usuário"
      className="mx-auto grid w-full max-w-5xl gap-6"
    >
      <span role="status" className="sr-only">
        Carregando usuário
      </span>
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-12 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </main>
  );
}
