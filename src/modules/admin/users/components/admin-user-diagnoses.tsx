import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "@/modules/reports/formatters";

import {
  formatDate,
  formatInteger,
  presentAnalysisMode,
  presentCategory,
  presentPriority,
  presentScenario,
  presentVerdict,
} from "../admin-users.formatters";
import type {
  AdminUserDiagnosesPage,
  AdminUserDiagnosis,
} from "../admin-users.schema";
import { estimateAiUsage, formatAiCost } from "../report-ai-cost";

function AdminAiUsage({ usage }: { usage: AdminUserDiagnosis["aiUsage"] }) {
  if (!usage) {
    return (
      <p className="text-muted-foreground text-sm">
        IA não utilizada neste relatório
      </p>
    );
  }
  const cost = estimateAiUsage(usage.models);
  return (
    <div
      aria-label="Uso de inteligência artificial"
      className="bg-muted/45 grid gap-1 rounded-xl p-4 text-sm sm:grid-cols-2"
    >
      <p>{formatInteger(usage.completedTurns)} interações concluídas</p>
      <p>{formatInteger(usage.inputTokens)} tokens de entrada</p>
      <p>{formatInteger(usage.cachedInputTokens)} em cache</p>
      <p>{formatInteger(usage.outputTokens)} tokens de saída</p>
      {usage.failedTurns > 0 && (
        <p>{formatInteger(usage.failedTurns)} interações com falha</p>
      )}
      <p className="text-muted-foreground sm:col-span-2">
        Último uso: {formatDate(usage.lastUsedAt)}
      </p>
      <p className="font-medium sm:col-span-2">
        {cost ? formatAiCost(cost) : "Estimativa indisponível"}
      </p>
    </div>
  );
}

function FinancialFacts({ diagnosis }: { diagnosis: AdminUserDiagnosis }) {
  const facts =
    diagnosis.analysisMode === "quick"
      ? [
          [
            "Preço atual",
            diagnosis.currentPriceCents === null
              ? "Não informado"
              : formatCurrency(diagnosis.currentPriceCents),
          ],
          [
            "Lucro por unidade",
            diagnosis.unitProfitCents === null
              ? "Não informado"
              : formatCurrency(diagnosis.unitProfitCents),
          ],
          [
            "Margem real",
            diagnosis.realMarginBasisPoints === null
              ? "Não informado"
              : formatBasisPoints(diagnosis.realMarginBasisPoints),
          ],
        ]
      : [
          [
            "Receita bruta mensal",
            diagnosis.monthlyGrossRevenueCents === null
              ? "Não informado"
              : formatCurrency(diagnosis.monthlyGrossRevenueCents),
          ],
          [
            "Resultado mensal",
            diagnosis.monthlyResultCents === null
              ? "Não informado"
              : formatCurrency(diagnosis.monthlyResultCents),
          ],
          [
            "Itens analisados",
            diagnosis.itemCount === null
              ? "Não informado"
              : formatIntegerVolume(diagnosis.itemCount),
          ],
        ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-xs font-medium uppercase">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AdminUserDiagnoses({
  page,
  nextHref,
}: {
  page: AdminUserDiagnosesPage;
  nextHref: string | null;
}) {
  if (page.items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        Nenhum diagnóstico encontrado.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {page.items.map((diagnosis) => {
          const category = presentCategory(diagnosis.category);
          const verdict = presentVerdict(diagnosis.verdict);
          return (
            <li key={diagnosis.id}>
              <Card className="min-w-0 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {category.title}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {presentScenario(diagnosis.scenario)} ·{" "}
                        {presentAnalysisMode(diagnosis.analysisMode)}
                      </p>
                    </div>
                    <time className="text-muted-foreground text-sm">
                      {formatDate(diagnosis.createdAt)}
                    </time>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={verdict.tone}>{verdict.label}</Badge>
                    <Badge variant="outline">
                      {presentPriority(diagnosis.priority)}
                    </Badge>
                    <Badge
                      variant={diagnosis.deletedAt ? "destructive" : "info"}
                    >
                      {diagnosis.deletedAt
                        ? "Relatório excluído"
                        : "Disponível"}
                    </Badge>
                    <Badge variant="secondary">
                      {diagnosis.isFreeReport
                        ? "Cota gratuita"
                        : "Acesso contratado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FinancialFacts diagnosis={diagnosis} />
                  {diagnosis.analysisMode === "detailed" && (
                    <p className="text-muted-foreground text-sm">
                      {diagnosis.isPartial
                        ? "Dados parciais"
                        : "Dados completos"}
                    </p>
                  )}
                  <AdminAiUsage usage={diagnosis.aiUsage} />
                  <p className="text-muted-foreground text-xs">
                    Versão {diagnosis.version} · atualizado em{" "}
                    {formatDate(diagnosis.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {nextHref && (
        <div className="text-right">
          <Link
            className="text-primary text-sm font-medium underline"
            href={nextHref}
          >
            Próxima página
          </Link>
        </div>
      )}
    </div>
  );
}

export { AdminAiUsage, AdminUserDiagnoses };
