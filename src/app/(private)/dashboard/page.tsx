import { MetricCard } from "@/components/shared/metrics/metric-card";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  Target,
  WalletCards,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Margem real"
        value="28,4%"
        icon={ChartNoAxesCombined}
        status={{
          label: "Na meta",
          tone: "success",
        }}
      />

      <MetricCard
        title="Ponto de equilíbrio"
        value="R$ 15,80"
        icon={WalletCards}
        description="por unidade"
      />

      <MetricCard
        title="Meta de vendas"
        value="420"
        icon={Target}
        description="vendas/mês para se pagar"
      />

      <MetricCard
        title="Lucro por unidade"
        value="R$ 6,20"
        icon={BadgeDollarSign}
        trend={{
          value: "4,4%",
          direction: "up",
          description: "vs. último período",
        }}
      />
    </div>
  );
}
