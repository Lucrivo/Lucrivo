import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingReturnLoading() {
  return (
    <main
      className="flex flex-1 items-center py-8"
      aria-busy="true"
      aria-label="Confirmando pagamento"
    >
      <p className="sr-only" role="status">
        Confirmando a situação do pagamento...
      </p>

      <Card
        data-skeleton-kind="payment-status"
        aria-hidden="true"
        className="border-primary/15 mx-auto w-full max-w-2xl shadow-md"
      >
        <CardContent className="grid justify-items-center gap-5 px-6 py-10 sm:px-10">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="grid w-full justify-items-center gap-3">
            <Skeleton className="h-9 w-72 max-w-full" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-5 w-4/5 max-w-lg" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-40" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
