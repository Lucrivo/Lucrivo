import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando usuários"
      className="mx-auto grid w-full max-w-[100rem] gap-6"
    >
      <span role="status" className="sr-only">
        Carregando usuários
      </span>
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </main>
  );
}
