# Correção de preço mínimo, rateio e leitura de margem

**Data:** 2026-09-28

**Status:** Aprovado para implementação

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/DETAILED-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-27-diagnosis-report-corrections-design.md`

## 1. Objetivo

Corrigir a forma como os relatórios tratam o menor preço sem prejuízo, o
rateio dos gastos mensais, a margem e a simulação de desconto.

A entrega deve garantir que:

- o menor preço sem prejuízo inclua custo direto, gastos mensais, pró-labore
  ativado, impostos e cartão quando existir volume para fazer o rateio;
- a margem real represente o que sobra depois de todos esses valores;
- quando o volume não for conhecido, o sistema calcule quantas vendas são
  necessárias no preço atual, sem inventar um rateio;
- nenhuma margem fixa seja usada para dizer que um resultado é bom, ruim,
  adequado ou apertado;
- a apresentação continue acolhedora, clara e compreensível para quem não
  domina termos financeiros.

A correção vale para Serviço, Produto, Produção e Diagnóstico detalhado. As
particularidades de cada fluxo são preservadas.

## 2. Decisão principal

Os cálculos terão duas leituras diferentes e explicitamente nomeadas:

1. **Quanto a venda deixa para ajudar no mês:** preço depois de impostos e
   cartão menos o custo direto. Esse valor existe mesmo sem volume e serve
   para calcular a quantidade necessária de vendas.
2. **Quanto sobra de verdade:** resultado depois de custo direto, impostos,
   cartão e parte dos gastos mensais. Esse valor só existe quando há uma
   quantidade válida para dividir os gastos mensais.

O sistema não apresentará a primeira leitura como lucro ou margem real. Isso
evita que uma venda pareça lucrativa enquanto aluguel, contas e pró-labore
ainda não foram pagos.

## 3. Termos e fórmulas comuns

Considere:

- `P`: preço de venda;
- `CD`: custo direto ou variável por venda;
- `T`: soma das taxas percentuais, como imposto e cartão;
- `F`: gastos mensais efetivos;
- `Q`: volume mensal informado;
- `RL`: receita líquida por venda;
- `C`: valor deixado por venda para ajudar nos gastos do mês.

O pró-labore só entra quando estiver ativado:

```text
F = custos fixos + pró-labore ativado
RL = P × (1 − T)
C = RL − CD
```

Na interface, `C` será apresentado como `Valor deixado por venda` ou uma frase
equivalente. Termos técnicos como `margem de contribuição` ficarão restritos a
ajudas opcionais e documentação interna.

### 3.1 Quando o volume é positivo

```text
parte dos gastos do mês por unidade = F ÷ Q
custo completo por unidade = CD + parte dos gastos do mês por unidade
menor preço sem prejuízo = custo completo por unidade ÷ (1 − T)
resultado do mês = C × Q − F
margem real = resultado do mês ÷ faturamento bruto do mês
```

O rateio será arredondado para cima em centavos, seguindo a política
conservadora já usada por Produto e Produção. O resultado mensal continuará
subtraindo `F` uma única vez, sem multiplicar o rateio arredondado; assim o
total do mês permanece exato.

### 3.2 Quando o volume está vazio

O vazio significa que a pessoa não sabe ou não informou quantas vendas faz.
Ele não será convertido em zero e o sistema não escolherá uma quantidade
artificial para calcular preço ou margem.

Se `C > 0`:

```text
vendas necessárias no preço atual = teto(F ÷ C)
```

Nesse estado:

- o custo completo por unidade fica indisponível;
- o menor preço com todos os gastos fica indisponível;
- o lucro por unidade fica indisponível;
- o resultado mensal e a margem real ficam indisponíveis;
- a quantidade mínima mensal permanece disponível;
- as referências semanal e diária permanecem ocultas, porque ainda não há uma
  rotina real de vendas informada.

Se `C <= 0`, não existe quantidade de vendas capaz de pagar os gastos mensais
no preço atual. A orientação deve explicar com cuidado que primeiro é
necessário rever o preço ou o custo direto.

### 3.3 Quando o volume informado é zero

Zero representa um mês conhecido sem vendas:

- faturamento igual a zero;
- resultado mensal igual a `−F`;
- margem real indisponível, porque não existe faturamento;
- custo completo e menor preço por unidade indisponíveis, porque não se divide
  gasto mensal por zero;
- quantidade necessária calculada normalmente quando `C > 0`.

## 4. Produto e Produção no diagnóstico rápido

Os motores atuais já calculam corretamente o rateio quando `Q > 0`. A mudança
principal será impedir que o preço baseado somente no custo direto seja
apresentado como menor preço quando o volume estiver vazio ou for zero.

Após a correção:

- `fixedAllocationCents`, `totalUnitCostCents`, `unitProfitCents`,
  `minimumPriceCents` e `realMarginBasisPoints` serão nulos sem volume
  positivo;
- `unitContributionCents` continuará disponível;
- `monthlySalesGoal` continuará usando gastos fixos e pró-labore;
- `priceReferencesPartial` deixará de justificar um preço parcial: uma
  referência incompleta não será tratada como preço sem prejuízo;
- o relatório explicará que a quantidade necessária foi calculada usando o
  preço atual.

O custo direto de Revenda deve incluir todos os gastos unitários coletados
pelo fluxo. Produto digital usa seu gasto direto por venda. Produção usa o
custo resumido ou a composição validada da unidade.

## 5. Serviço

Serviço continuará usando a rotina de trabalho informada para distribuir
custos fixos e o valor que a pessoa deseja retirar no mês. Essa capacidade é o
equivalente ao denominador de rateio no fluxo de serviços.

Quando a capacidade mensal for válida:

- o custo da estrutura por hora ou atendimento continuará sendo calculado;
- o menor preço continuará incluindo estrutura, retirada mensal, material e
  taxas;
- a margem calculada continuará disponível como estimativa baseada na rotina
  informada;
- a quantidade necessária continuará mostrando quantas horas ou atendimentos
  pagam as contas e a retirada mensal.

O preço-alvo interno de 15% será removido do contrato atual. Serviço não usará
15% nem qualquer outra porcentagem para classificar a margem.

Quando não houver capacidade válida, preço completo e margem ficarão
indisponíveis. O relatório explicará qual informação de rotina precisa ser
preenchida, sem substituir o dado por uma estimativa silenciosa.

## 6. Diagnóstico detalhado

### 6.1 Rateio entre vários itens

Os gastos mensais pertencem ao negócio inteiro e não serão aplicados
integralmente a cada item. Quando todos os volumes forem conhecidos e a soma
for positiva:

```text
volume total = soma das unidades de todos os itens
parte dos gastos por unidade = F ÷ volume total
```

Cada unidade do conjunto recebe a mesma parcela dos gastos mensais. Para cada
item:

```text
custo completo do item = custo direto do item + parte dos gastos por unidade
lucro do item por venda = receita líquida do item − custo completo do item
margem real do item = lucro do item por venda ÷ preço do item
menor preço do item = custo completo do item ÷ (1 − T)
```

O resultado mensal geral continuará usando as contribuições mensais de todos
os itens e subtraindo `F` uma única vez.

### 6.2 Dados por item

O resultado atual de cada item acrescentará:

```ts
type DetailedItemFullCostResult = {
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  breakEvenUnitPriceCents: number | null;
};
```

`breakEvenUnitPriceCents` passará a significar sempre o menor preço com todos
os gastos. Ele não usará mais somente o custo variável.

Os valores atuais de contribuição continuam existindo para explicar quanto a
venda ajuda a pagar o mês, mas não serão rotulados como lucro ou margem real.

### 6.3 Volume desconhecido no detalhado

- Com um único item e volume vazio, a quantidade necessária será calculada por
  `teto(F ÷ C)`.
- Com vários itens e qualquer volume ausente, a quantidade combinada ficará
  indisponível, porque o sistema não sabe qual será a proporção entre itens
  com contribuições diferentes.
- Com todos os volumes conhecidos e soma positiva, a quantidade necessária
  continuará preservando a proporção informada:

```text
quantidade necessária = teto(F × volume total ÷ contribuição mensal total)
```

- Com vários itens e volume total igual a zero, a quantidade combinada também
  ficará indisponível por não existir uma proporção observada.

O sistema não presumirá divisão igual entre itens, não preencherá o formulário
automaticamente e não mudará a resposta original da pessoa.

## 7. Margem sem meta universal

Os contratos corrigidos não terão `targetMarginBasisPoints`,
`attentionBandBasisPoints` nem `targetPriceCents` como políticas ou resultados
ativos de margem.

Serão removidas das decisões atuais as classificações:

- `tight_margin`;
- `adequate_margin`;
- `above_target`.

O resultado positivo usará um estado objetivo, `positive_result`. O conjunto
de estados novos será formado, conforme o tipo de relatório, por:

- preço ausente;
- venda que não deixa valor para o mês;
- volume ainda não informado;
- mês sem vendas;
- resultado negativo;
- equilíbrio;
- resultado positivo.

A margem continuará sendo exibida numericamente. Por exemplo:

> Depois de pagar os valores considerados neste diagnóstico, sobram R$ 10 a
> cada R$ 100 vendidos.

O sistema não completará essa frase com `bom`, `ruim`, `saudável`, `apertado`,
`adequado`, `ideal` ou `abaixo da meta`.

Comparações factuais entre itens do próprio negócio podem continuar, desde que
não transformem uma diferença relativa em recomendação universal. Exemplo:
`Este item deixa menos por venda do que os outros itens informados.`

Os motores corrigidos não emitirão prioridade `margin`. O campo técnico de
prioridade poderá continuar aceito no banco para reduzir o alcance da
migração, mas a interface não apresentará uma única “alavanca” escolhida por
uma faixa percentual.
Orientações serão derivadas de fatos objetivos:

- contribuição não positiva: rever preço ou custo antes de buscar volume;
- resultado mensal negativo com contribuição positiva: mostrar tanto a
  quantidade necessária no preço atual quanto o menor preço no volume atual;
- equilíbrio: explicar que os gastos foram pagos, sem sobra;
- resultado positivo: informar o valor e a margem sem julgar sua qualidade.

## 8. Linguagem e experiência

### 8.1 Princípios de texto

- Começar pelo significado para a pessoa, não pelo nome técnico.
- Usar frases curtas e explicar de onde o valor veio.
- Não responsabilizar ou constranger a pessoa por um resultado negativo.
- Dizer claramente quando um número é estimativa ou depende de uma informação.
- Diferenciar `ajuda a pagar o mês` de `sobra de verdade`.
- Manter termos técnicos apenas em `Entenda este valor` ou memória de cálculo.

### 8.2 Vocabulário principal

| Conceito interno        | Texto principal recomendado            |
| ----------------------- | -------------------------------------- |
| Custo variável unitário | Quanto esta unidade custa              |
| Rateio do custo fixo    | Parte dos gastos do mês                |
| Custo total unitário    | Custo completo por unidade             |
| Contribuição unitária   | Valor deixado por venda                |
| Lucro unitário          | Quanto sobra por venda                 |
| Margem real             | Quanto sobra a cada R$ 100             |
| Ponto de equilíbrio     | Quantas vendas pagam o mês             |
| Preço de equilíbrio     | Menor preço para não ficar no prejuízo |

### 8.3 Mensagens por situação

Com volume conhecido:

> Considerando as 200 vendas informadas, cada unidade recebe R$ 20,00 dos
> gastos do mês. Por isso, o menor preço para não ficar no prejuízo é R$ 38,71.

Sem volume e com contribuição positiva:

> Como você ainda não informou quantas vendas faz, não dividimos os gastos do
> mês por uma quantidade estimada. No preço atual, você precisa de cerca de
> 114 vendas para pagar esses gastos e separar o valor informado para você.

Sem pró-labore ativado, a parte final será simplesmente `para pagar os gastos
do mês`.

Sem contribuição positiva:

> No preço atual, cada nova venda ainda não deixa valor para pagar os gastos do
> mês. Antes de buscar mais vendas, vale rever o preço ou o custo desta unidade.

Resultado positivo:

> Com os valores informados, o resultado estimado do mês é R$ 3.030,00. Isso
> representa R$ 27,55 a cada R$ 100 vendidos.

Nenhuma dessas mensagens afirmará que o negócio inteiro é saudável ou que o
preço é adequado ao mercado.

## 9. Cards e memória de cálculo

O card detalhado de cada item separará visualmente:

1. preço e valor após impostos e cartão;
2. custo direto da unidade;
3. parte dos gastos do mês, quando calculável;
4. custo completo da unidade;
5. quanto sobra por venda e a margem real;
6. menor preço para não ficar no prejuízo;
7. quanto a venda deixa para ajudar a pagar o mês.

Quando o volume estiver ausente, os itens 3 a 6 não mostrarão zero nem o piso
do custo direto. Mostrarão uma explicação curta de que falta uma quantidade
para dividir os gastos mensais. A quantidade necessária no preço atual terá
destaque próprio.

As ajudas opcionais poderão apresentar os nomes `custo direto`, `rateio`,
`contribuição` e `margem`, mas o conteúdo principal não dependerá desses termos
para ser entendido.

## 10. Simulador de desconto

O simulador terá somente quatro estados objetivos:

- indisponível;
- resultado positivo;
- no limite;
- prejuízo.

Serão removidos `target` e `below_target`, assim como mensagens de boa folga,
pouca folga ou preservação de meta.

Com custo completo disponível, a simulação continuará recalculando:

```text
preço com desconto
receita líquida com desconto
quanto sobra por unidade
quanto sobra a cada R$ 100
```

Sem volume positivo em Produto, Produção ou item detalhado, o simulador não
afirmará quanto desconto pode ser dado sem prejuízo, porque não existe custo
completo por unidade. O controle ficará indisponível com uma explicação
acolhedora:

> Para calcular um desconto seguro, primeiro precisamos de uma quantidade para
> dividir os gastos do mês.

Serviço continuará usando o custo completo derivado da rotina de trabalho.

O simulador passará a usar apenas o contrato objetivo corrigido. Não será
criado um modo legado paralelo.

## 11. Versões e compatibilidade

Como ainda não existem usuários nem dados de produção, a correção será feita
no contrato atual, sem criar uma família paralela de versões.

- Os números atuais de versão de schema, cálculo e conteúdo serão mantidos.
- Os schemas, builders, apresentadores e motores atuais serão corrigidos no
  lugar.
- Não serão criados adaptadores, conversores, backfills ou caminhos de leitura
  para snapshots anteriores à correção.
- Fixtures, seeds e dados locais poderão ser atualizados ou recriados para o
  contrato corrigido.
- Snapshots locais produzidos pelo comportamento antigo não têm garantia de
  leitura depois da mudança.

Essa escolha reduz a complexidade temporária e mantém o código mais fácil de
alterar enquanto o produto ainda não entrou em produção. Antes da primeira
liberação com dados reais, a estratégia de versionamento e compatibilidade
deverá ser revista.

## 12. Persistência no Supabase

A persistência continuará validando o snapshot contra os parâmetros
normalizados recebidos; o cliente não será a fonte de verdade isolada.

Os RPCs públicos atuais serão mantidos para evitar uma camada descartável de
compatibilidade:

- `create_service_diagnosis_report_v4`;
- `create_product_diagnosis_report_v3`;
- `create_production_diagnosis_report_v3`;
- `create_detailed_diagnosis_report`.

Suas assinaturas serão preservadas. No RPC detalhado, os novos resultados por
item viajarão dentro de `p_items`, que já é um argumento JSON. As funções
serão substituídas por uma migração nova; migrações históricas não serão
editadas.

Os wrappers públicos permanecerão `security invoker`. As implementações
privadas que precisam coordenar escrita continuarão com `security definer`,
`search_path = ''`, validação explícita de `auth.uid()` e privilégios mínimos.
`PUBLIC` não receberá execução implícita.

A constraint de veredito em `public.diagnoses` passará a aceitar
`positive_result`. Valores antigos poderão continuar aceitos no banco quando
removê-los não trouxer benefício direto à correção, mas não serão emitidos
pelos motores atuais. A prioridade `margin` seguirá a mesma regra.

`public.detailed_diagnosis_items` receberá colunas anuláveis para o novo
resultado completo por item:

- `fixed_allocation_cents`;
- `total_unit_cost_cents`;
- `unit_profit_cents`;
- `real_margin_basis_points`.

As constraints garantirão valores não negativos para rateio e custo total e
coerência entre campos disponíveis e indisponíveis.

O RPC detalhado, a substituição staged e a cópia de filhos passarão a validar
e copiar as novas colunas. Não serão mantidas assinaturas antigas em paralelo.

A migração será criada pelo fluxo imperativo do projeto, sem editar migrações
históricas. Antes da aplicação, o alvo deve ser confirmado como local. Depois,
serão verificados privilégios, constraints, funções, migrações locais e testes
pgTAP.

## 13. Editor e prévia

O editor usará exatamente os mesmos motores das ações de criação. Não haverá
uma fórmula para a prévia e outra para o relatório salvo.

Ao remover ou preencher um volume:

- o custo completo, menor preço, lucro e margem aparecerão ou ficarão
  indisponíveis juntos;
- a quantidade necessária será recalculada a partir do preço atual;
- nenhum valor antigo permanecerá visualmente como se ainda fosse válido.

Editar preço, custo, imposto, cartão, gastos fixos ou pró-labore atualizará
todas as referências dependentes na mesma prévia.

## 14. Casos-limite

- Taxas totais iguais ou superiores a 100% tornam o menor preço indisponível.
- Contribuição igual ou menor que zero impede uma meta de vendas útil.
- Volume vazio, zero e positivo permanecem estados distintos.
- Pró-labore desligado sempre contribui com zero para `F`, mesmo que exista um
  valor residual no formulário ou em payload inválido.
- O custo fixo nunca é aplicado uma vez para cada item do detalhado.
- Arredondamentos monetários usam os utilitários inteiros existentes; não serão
  introduzidos cálculos financeiros em ponto flutuante.
- Um centavo de diferença por arredondamento nunca mudará o resultado mensal
  exato, que subtrai o gasto mensal efetivo uma única vez.
- Valores indisponíveis nunca serão substituídos visualmente por `R$ 0,00` ou
  `0%`.

## 15. Exemplo de aceite

Entrada:

- custo direto: R$ 16,00;
- gastos fixos: R$ 2.000,00;
- pró-labore ativado: R$ 2.000,00;
- volume: 200 unidades;
- imposto e cartão: 7%;
- preço: R$ 55,00.

Resultado esperado:

```text
gastos mensais efetivos = R$ 4.000,00
parte dos gastos por unidade = R$ 20,00
custo completo por unidade = R$ 36,00
menor preço sem prejuízo = R$ 38,71
receita líquida por unidade = R$ 51,15
valor deixado por venda = R$ 35,15
quanto sobra por venda = R$ 15,15
resultado do mês = R$ 3.030,00
margem real ≈ 27,55%
vendas necessárias no preço atual = 114
veredito objetivo = resultado positivo
```

Com a mesma entrada e volume vazio:

```text
valor deixado por venda = R$ 35,15
vendas necessárias no preço atual = 114
custo completo por unidade = indisponível
menor preço sem prejuízo = indisponível
quanto sobra por venda = indisponível
resultado do mês = indisponível
margem real = indisponível
```

## 16. Testes e verificação

### 16.1 Domínio

- Exemplo de aceite completo para Produto, Produção e item único detalhado.
- Mesmo exemplo sem volume, preservando somente contribuição e meta mensal.
- Pró-labore ligado e desligado.
- Volume zero, vazio, positivo e volumes maiores que reduzem o rateio.
- Contribuição positiva, zero e negativa.
- Taxas abaixo, iguais e acima de 100%.
- Rateio detalhado pelo volume total sem duplicar gastos mensais.
- Detalhado com um item sem volume calcula a meta.
- Detalhado com vários itens e volume ausente não inventa uma proporção.
- Serviço mantém rateio por capacidade e remove qualquer decisão de 15%.
- Uma margem positiva de 1%, 10% ou 30% recebe o mesmo estado objetivo
  `positive_result`.

### 16.2 Conteúdo e componentes

- Nenhum relatório corrigido mostra `margem adequada`, `margem apertada`, `boa
folga`, `pouca folga`, `acima da meta` ou preço-alvo.
- Contribuição e lucro não usam o mesmo rótulo.
- Valores indisponíveis explicam por que não foram calculados.
- A mensagem de vendas necessárias menciona a retirada da pessoa somente
  quando pró-labore estiver ativado.
- O simulador usa apenas estados objetivos e fica indisponível sem custo
  completo.
- Prévia, detalhe, biblioteca e edição usam a mesma linguagem corrigida.
- Leitores de tela recebem rótulos completos; cor não é a única indicação de
  resultado positivo, equilíbrio ou prejuízo.

### 16.3 Banco

- RPCs atuais aceitam somente a forma corrigida esperada.
- Snapshot, argumentos do RPC e linhas normalizadas precisam corresponder.
- `positive_result` é aceito; valores desconhecidos continuam rejeitados.
- Colunas completas do item detalhado respeitam nulabilidade e limites.
- Substituição de relatório copia os novos campos e remove o staged.
- As funções substituídas preservam os privilégios e proteções necessários.
- Propriedade, acesso pago, idempotência por submissão e versão otimista
  permanecem protegidos.
- Tipos gerados do banco são atualizados depois da migração local.

### 16.4 Verificação final

- testes Vitest direcionados dos quatro motores;
- testes dos schemas e snapshots atuais corrigidos;
- testes de apresentadores, cards e simulador;
- testes dos adaptadores e prévia do editor;
- testes pgTAP dos quatro contratos e do ciclo de substituição;
- suíte completa, typecheck, lint e formatação;
- nenhuma verificação com Playwright, navegador automatizado ou ferramenta
  equivalente faz parte deste trabalho.

## 17. Fora de escopo

- Sugerir uma margem ideal por setor, produto ou região.
- Pesquisar concorrentes ou recomendar preço de mercado.
- Criar um campo de meta de margem.
- Preencher automaticamente o volume informado pela pessoa.
- Supor uma combinação de itens quando o mix de vendas é desconhecido.
- Preservar, converter ou reescrever snapshots produzidos antes da correção.
- Transformar pró-labore em lucro; ele continua sendo parte do valor mensal que
  o negócio precisa pagar.

## 18. Critérios de aceite

- Com volume positivo, o menor preço inclui custo direto, rateio, pró-labore
  ativado e taxas.
- Sem volume, o relatório mostra quantas vendas pagam o mês no preço atual e
  não apresenta preço completo ou margem real inventados.
- O card detalhado deixa de mostrar o piso baseado somente no custo variável
  como `menor preço sem prejuízo`.
- Margens são informadas numericamente, sem comparação com 15%, 20%, 25% ou
  qualquer padrão universal.
- O simulador não usa metas ou faixas internas para avaliar o desconto.
- Serviço, Produto, Produção e Detalhado seguem a mesma semântica, respeitando
  seus dados disponíveis.
- A linguagem principal é humana, acolhedora e compreensível sem conhecimento
  contábil.
- Fixtures, seeds e dados locais usam somente o contrato atual corrigido.
