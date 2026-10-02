import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ClientDashboardViewModel,
  DashboardTone,
} from "@/modules/client-dashboard/client-dashboard.types";

const countFormatter = new Intl.NumberFormat("pt-BR");

const toneBar = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
} as const satisfies Record<DashboardTone, string>;

type DistributionEntry = {
  key: string;
  label: string;
  count: number;
  tone: DashboardTone;
};

function DistributionCard({
  title,
  id,
  entries,
}: {
  title: string;
  id: string;
  entries: DistributionEntry[];
}) {
  const maximum = Math.max(0, ...entries.map(({ count }) => count));
  const visibleEntries =
    maximum === 0 ? [] : entries.filter(({ count }) => count > 0);
  const summary = entries
    .map(({ label, count }) => `${label}: ${countFormatter.format(count)}`)
    .join("; ");

  return (
    <section aria-labelledby={id} className="min-w-0">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">
            <h2 id={id} className="text-lg">
              {title}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="sr-only">Resumo completo: {summary}.</p>
          {visibleEntries.length ? (
            <ul className="grid gap-4">
              {visibleEntries.map((entry) => {
                const width = maximum === 0 ? 0 : (entry.count / maximum) * 100;
                return (
                  <li key={entry.key} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{entry.label}</span>
                      <strong className="tabular-nums">
                        {countFormatter.format(entry.count)}
                      </strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${entry.label}: ${countFormatter.format(entry.count)}`}
                      aria-valuenow={entry.count}
                      aria-valuemin={0}
                      aria-valuemax={maximum}
                      className="bg-muted h-2 overflow-hidden rounded-full"
                    >
                      <div
                        aria-hidden="true"
                        className={cn(
                          "h-full rounded-full",
                          toneBar[entry.tone],
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum relatório nesta seleção.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DashboardDistributions({
  dashboard,
}: {
  dashboard: ClientDashboardViewModel;
}) {
  const verdictOrder = [
    "direct_loss",
    "missing_price",
    "incomplete_volume",
    "operational_loss",
    "no_sales",
    "break_even",
    "positive_result",
  ] as const;
  const verdictEntries = verdictOrder.flatMap((verdict) => {
    const entry = dashboard.verdictCounts.find(
      (candidate) => candidate.verdict === verdict,
    );
    return entry
      ? [
          {
            key: entry.verdict,
            label: entry.label,
            count: entry.count,
            tone: entry.tone,
          },
        ]
      : [];
  });
  const priorityEntries = dashboard.priorityCounts.map((entry) => ({
    key: entry.priority,
    label: entry.label,
    count: entry.count,
    tone: "neutral" as const,
  }));

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <DistributionCard
        title="Situações dos relatórios"
        id="dashboard-verdict-distribution"
        entries={verdictEntries}
      />
      <DistributionCard
        title="Prioridades indicadas"
        id="dashboard-priority-distribution"
        entries={priorityEntries}
      />
    </div>
  );
}

export { DashboardDistributions };
