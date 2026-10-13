# Cenário de equilíbrio como referência e indicadores do relatório

Data: 2026-10-05

## Problema

1. Quando o volume de vendas não é informado (produto, produção, detalhado), o relatório dizia que "não é possível dividir os gastos mensais" e deixava menor preço, resultado e desconto como "Ainda não calculado". O especialista de domínio definiu que, sem volume, o cálculo deve apresentar o **ponto de equilíbrio**: quantas vendas são necessárias para não ter prejuízo e qual é o preço de equilíbrio nessa quantidade.
2. O card "Seus números" repetia valores já presentes nas seções de "Entenda o resultado". A seção deve concentrar ~5 indicadores com cor por situação (positiva/negativa).

## Decisões

### Cenário de equilíbrio é derivado, não recalculado

- O motor (`calculate-*-report.ts`, `calculate-detailed-*.ts`) e o shape de `results` não mudam. O schema do snapshot reexecuta o cálculo e compara `results`; o RPC exige `monthly_result/real_margin/unit_profit` nulos quando o volume é nulo. Um bump de `calculationVersion` tornaria relatórios salvos indisponíveis.
- `deriveBreakEvenScenario` (`src/modules/reports/domain/break-even-scenario.ts`) é uma função pura sobre campos já persistidos: usa `monthlySalesGoal` (Q*) como volume de referência, rateia os gastos do mês por Q*, e devolve o preço de equilíbrio, metas semanal/diária, faturamento de equilíbrio e a margem de contribuição.
- Resultado do mês e margem no cenário são apresentados como "no ponto de equilíbrio" (R$ 0 / 0%) por definição; a margem de contribuição (`unitContribution / price`) é o dado informativo ("cada venda deixa R$ X para pagar os gastos do mês").
- Volume `0` continua sendo mês conhecido sem vendas (`no_sales`): sem cenário. "Desconhecido ≠ zero" permanece a regra para IA e dashboard.
- O veredito `incomplete_volume` mantém a chave (constraint do RPC) e passa a ser rotulado "Equilíbrio como referência".

### Copy persistida acompanha

- A IA lê `snapshot.sections`. Por isso as seções e o resumo executivo para volume nulo passam a descrever o cenário. Bump de `contentVersion`: produto 5→6, produção 5→6, detalhado 2→3. Serviço não muda.
- Nova migração recria os RPCs `create_product_diagnosis_report_v3_impl`, `create_production_diagnosis_report_v3_impl` e `create_detailed_diagnosis_report_impl` com os novos pinos de `p_content_version`.
- Relatórios com a versão anterior continuam legíveis; o presenter só aplica o cenário quando o snapshot está na versão de conteúdo atual, para a narrativa antiga não contradizer os cards.

### Indicadores substituem "Seus números"

- `ReportIndicatorViewModel` (`key`, `label`, `value`, `tone`, `toneLabel`, `description`, `supportingText`, `help`, `featured`) substitui `ReportNumberViewModel`. Os bodies das seções persistidas viram `description` dos cards.
- Cards do relatório rápido: Preço de venda; Menor preço para não ficar no prejuízo (popover "Como calculamos?" explica que é o preço de equilíbrio); Vendas necessárias no mês (destaque, absorve o faturamento necessário); Margem de lucro / quanto sobra a cada R$ 100 (absorve o resultado do mês; popover explica margem de lucro em linguagem leiga); Desconto máximo sem prejuízo. O simulador de desconto continua como card interativo abaixo.
- Cards do detalhado: Unidades necessárias no mês (destaque), Faturamento para cobrir os gastos, Margem (+ resultado do mês), Quanto entraria (+ custos do mês).
- Regra de cor: `minimum` positivo se preço ≥ menor preço, crítico se menor; `sales` positivo se volume informado ≥ Q*, crítico se menor ou se Q* não existe, neutro no cenário; `margin` positivo/atenção/crítico por resultado > 0 / = 0 / < 0; `discount` positivo se limite > 0, atenção se 0; indisponível → neutro.
- O simulador aceita uma base derivada do cenário (sem alterar o `discountSimulationBase` persistido) e, nesse modo, mostra quantas vendas seriam necessárias com o desconto.

### Impactos propagados

- Dashboard: `toDashboardReportFocus` seleciona `sales/minimum/margin/discount` (rápido) e `sales/break_even/margin/revenue` (detalhado); `MetricCard` recebe o tone como status.
- IA: contexto marca o cenário como referência, mantendo `volumeState: unknown`; política ganha a regra de nunca tratar o cenário como resultado do mês.
- Wizard: copy do campo de volume e do banner de revisão descrevem o ponto de equilíbrio em vez de "resultado parcial".
- Landing: prévia estática usa o novo layout de indicadores.
