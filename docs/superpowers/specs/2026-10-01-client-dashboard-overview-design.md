# Dashboard do cliente: visão geral dos diagnósticos

**Data:** 2026-10-01

**Status:** Proposto para revisão

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/report-ai-interpretation-behavior.md`
- `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`
- `docs/superpowers/specs/2026-09-27-diagnosis-report-corrections-design.md`

## 1. Objetivo

Substituir os quatro indicadores estáticos de `/dashboard` por uma visão geral
dos diagnósticos pertencentes ao cliente. A página deve ajudar a pessoa a
responder três perguntas:

1. quantos diagnósticos existem no recorte selecionado;
2. quais situações e prioridades aparecem nesses diagnósticos;
3. o que o relatório atualmente em foco permite concluir.

O dashboard será uma central de diagnósticos e prioridades. Ele não será
apresentado como acompanhamento contínuo do desempenho real do negócio, pois os
relatórios podem descrever ofertas, categorias, unidades e períodos diferentes.

## 2. Decisões de produto

### 2.1. Dois níveis de informação

A página terá dois níveis claramente separados:

- **Visão geral:** agrega apenas contagens e classificações comparáveis entre
  todos os relatórios filtrados.
- **Relatório em foco:** mostra valores financeiros de um único snapshot
  validado, preservando a unidade e as indisponibilidades daquele relatório.

Nenhum card financeiro deve aparentar ser uma soma, média ou resultado
consolidado de relatórios diferentes.

### 2.2. Relação com a biblioteca

`/dashboard` será a entrada resumida e orientada à decisão. `/reports`
continuará sendo a biblioteca completa, com paginação e gestão dos relatórios.
O dashboard mostrará somente os relatórios recentes do recorte e oferecerá
`Ver biblioteca completa` e `Novo diagnóstico`.

Os filtros do dashboard não alterarão a biblioteca nesta entrega. O link para a
biblioteca abre `/reports` sem prometer que o mesmo recorte foi preservado.

### 2.3. Sem classificação universal de margem

O dashboard não usará `Na meta`, `margem boa`, `margem ruim`, `saudável` ou
expressões equivalentes. Uma margem positiva será apresentada como valor
descritivo do relatório em foco, nunca como uma avaliação universal.

### 2.4. Sem evolução financeira nesta entrega

O gráfico `Evolução da margem` será removido. A criação de relatórios não forma
uma série temporal confiável: relatórios podem representar ofertas diferentes,
uma substituição sobrescreve o snapshot anterior e uma cópia nova não possui
vínculo persistido com sua origem.

Uma evolução de margem ou resultado exigirá, em iniciativa posterior, uma
identidade estável da oferta, período financeiro de referência e histórico de
versões ou vínculo entre cópias.

## 3. Escopo

### 3.1. Incluído

- Carregar um snapshot agregado dos relatórios legíveis do usuário autenticado.
- Filtrar por data do diagnóstico, categoria, modalidade, situação, prioridade,
  cenário e estado dos dados.
- Exibir quatro indicadores globais de contagem.
- Exibir distribuições por situação e prioridade.
- Exibir até seis relatórios recentes dentro do recorte.
- Selecionar um relatório em foco por parâmetro de URL.
- Usar o relatório mais recente do recorte quando não houver seleção válida.
- Exibir métricas financeiras adaptadas ao relatório em foco.
- Exibir métricas complementares já sustentadas pelo snapshot.
- Preservar valores ausentes como indisponíveis, acompanhados do motivo já
  conhecido.
- Cobrir permissões, contrato agregado, filtros, estados e acessibilidade com
  testes automatizados.

### 3.2. Excluído

- Média ou soma de margem, preço, resultado, faturamento ou meta de vendas.
- Comparação financeira entre relatórios.
- Evolução histórica de margem ou resultado.
- Comparação entre versões substituídas.
- Criação de identidade persistente para uma oferta.
- Filtro por período financeiro do negócio.
- Alterações nos cálculos dos diagnósticos.
- Novas fórmulas no dashboard.
- Integração da IA com mais de um relatório.
- Mudanças nos filtros ou na paginação de `/reports`.

## 4. Filtros

### 4.1. Contrato de URL

Os filtros serão representados por parâmetros de busca validados no servidor.
Valores desconhecidos serão ignorados e a URL canônica refletirá apenas valores
aceitos.

Filtros previstos:

- `from` e `to`: data de criação do diagnóstico; início inclusivo e fim
  exclusivo;
- `category`: `service`, `product` ou `production`;
- `mode`: `quick` ou `detailed`;
- `scenario`: cenários persistidos compatíveis com as categorias escolhidas;
- `verdict`: um ou mais vereditos persistidos;
- `priority`: `cost`, `data`, `price`, `margin` ou `volume`;
- `dataState`: `all`, `complete` ou `pending`;
- `report`: identificador do relatório em foco.

O estado padrão não limita período, categoria, modalidade ou situação. Isso
evita esconder relatórios de contas que possuem pouco histórico.

Datas sem horário serão interpretadas no fuso `America/Sao_Paulo`: `from`
começa às 00:00 da data escolhida e `to` representa o início do dia seguinte à
última data visível no controle. O banco continuará comparando `timestamptz`.

### 4.2. Apresentação

A barra principal mostrará inicialmente:

- Data do diagnóstico;
- Categoria;
- Modalidade;
- Situação;
- Estado dos dados.

`Cenário` e `Prioridade` ficarão em `Mais filtros`. Cenário será limitado pelas
categorias selecionadas. Serviço continuará aparecendo apenas como modalidade
rápida; a interface não oferecerá uma combinação impossível.

Filtros ativos serão apresentados como chips removíveis e haverá a ação
`Limpar filtros`. Todos os controles terão rótulo textual, foco visível e área
de interação mínima de 44 por 44 pixels.

### 4.3. Significado das situações

A interface traduzirá os vereditos sem alterar seu significado:

- `positive_result`: resultado positivo;
- `break_even`: zero a zero;
- `operational_loss`: prejuízo no cenário informado;
- `direct_loss`: perda por venda;
- `no_sales`: mês informado sem vendas;
- `incomplete_volume`: volume não informado;
- `missing_price`: preço não informado.

`Com perda ou prejuízo` é um atalho visual que aplica `direct_loss` e
`operational_loss`. `Com dados pendentes` aplica `incomplete_volume` e
`missing_price`, além de preservar `is_partial = true` para snapshots que
registram explicitamente esse estado.

`dataState=pending` usa exatamente essa regra. `dataState=complete` usa sua
negação; `no_sales` permanece completo porque zero informado é diferente de
volume desconhecido.

## 5. Indicadores globais

Os quatro cards superiores serão:

1. **Relatórios no recorte:** total de relatórios legíveis que correspondem aos
   filtros.
2. **Com resultado positivo:** quantidade com `positive_result`.
3. **Com perda ou prejuízo:** quantidade com `direct_loss` ou
   `operational_loss`.
4. **Com dados pendentes:** quantidade com `incomplete_volume`,
   `missing_price` ou estado parcial explícito.

Os cards mostrarão contagens inteiras, nunca porcentagens classificatórias. Os
cards de situação poderão aplicar o filtro correspondente. O texto do card e
seu nome acessível comunicarão o estado; cor e ícone serão complementares.

Relatórios em `break_even` e `no_sales` permanecem no total e aparecem na
distribuição por situação, mas não são forçados para nenhum dos três cards de
subconjunto.

## 6. Distribuições

### 6.1. Situação dos diagnósticos

Uma lista de barras horizontais mostrará a contagem de cada veredito presente no
recorte. A ordem seguirá proteção e ação, não uma escala universal de qualidade:

1. perda por venda;
2. preço não informado;
3. volume não informado;
4. prejuízo no cenário informado;
5. mês sem vendas;
6. zero a zero;
7. resultado positivo.

Cada linha terá rótulo e valor visíveis. As barras não dependerão de hover e não
usarão cor como única distinção. Vereditos com zero poderão ser omitidos quando
o recorte tiver resultados, mas todos os estados aceitos permanecerão descritos
para tecnologias assistivas no resumo textual.

### 6.2. Prioridades encontradas

Outra lista de barras mostrará quantos relatórios persistiram cada prioridade:

- revisar custos;
- completar dados;
- revisar preço;
- avaliar margem;
- avaliar volume.

O dashboard não elegerá uma nova prioridade consolidada. Ele apenas contará as
prioridades persistidas pelo motor e poderá dizer, por exemplo, `Preço aparece
como prioridade em 4 de 7 relatórios`.

## 7. Relatórios recentes

O recorte exibirá até seis relatórios, ordenados por `created_at desc, id desc`.
Cada entrada mostrará:

- categoria;
- cenário;
- modalidade;
- data do diagnóstico;
- veredito;
- prioridade;
- estado completo ou pendente;
- número de itens, quando detalhado;
- resultado mensal e margem somente quando disponíveis;
- ação `Ver neste dashboard`;
- ação `Abrir relatório`.

`Ver neste dashboard` preservará os filtros atuais e alterará apenas `report`.
O foco selecionado será textual e não dependerá apenas de uma borda ou cor.

## 8. Relatório em foco

### 8.1. Seleção

O RPC receberá o identificador solicitado em `report` como `p_focus_id`. Quando
ele corresponder a um relatório legível dentro do recorte, devolverá esse valor
como `focusReportId`. Se estiver ausente, inválido ou fora do recorte, devolverá
o identificador do relatório mais recente do recorte. O parâmetro inválido não
produzirá erro nem permitirá abrir relatório de outro usuário.

Com recorte vazio, a seção não será renderizada. Com um único relatório, o
controle de troca poderá ser omitido, mantendo a identificação explícita.

### 8.2. Métricas principais

O cabeçalho identificará categoria, cenário, modalidade, data de criação e, se
for diferente, data da última atualização. O conteúdo reutilizará as métricas e
explicações dos presenters dos relatórios atuais.

- **Produto ou Produção rápidos:** resultado do mês, quanto sobra a cada
  R$ 100, menor preço sem prejuízo e vendas ou unidades necessárias.
- **Serviço:** resultado por hora ou atendimento, quanto sobra a cada R$ 100,
  menor preço sem prejuízo e quantidade de serviços necessária.
- **Produto ou Produção detalhados:** resultado mensal consolidado, quanto sobra
  a cada R$ 100, faturamento de equilíbrio e unidades necessárias mantendo a
  proporção informada.

Valores ausentes mostrarão `Ainda não calculado` ou `Indisponível` e a razão já
fornecida pelo relatório. Um valor ausente nunca será convertido em zero.

### 8.3. Métricas complementares do MVP

Quando aplicáveis e já sustentadas pelo snapshot, a seção mostrará:

- quantidade de itens com perda direta no relatório detalhado;
- quantidade de itens sem volume informado;
- quantidade de ofertas analisadas: uma no rápido e `item_count` no detalhado;
- data da última atualização;
- limite de desconto antes do prejuízo, somente nos relatórios rápidos em que
  `breakEvenDiscountPercent` já estiver persistido e disponível, sempre
  descrito como limite e nunca como recomendação.

A quantidade analisada usará texto específico da categoria: um serviço, um
produto, uma produção ou o número persistido de itens no modo detalhado.

Não entram nesta entrega: percentual de cobertura dos gastos mensais, diferença
entre volume atual e necessário ou qualquer outra métrica que exija uma fórmula
financeira nova.

## 9. Arquitetura de dados

### 9.1. Abordagem escolhida

Uma função versionada `public.get_client_dashboard_v1` retornará um snapshot
agregado em JSON. A função será `stable` e `security invoker`, usará a política
de leitura existente de `public.diagnoses` e filtrará explicitamente pelo
`user_id = (select auth.uid())` e por `deleted_at is null`.

A execução será revogada de `public`, `anon` e `service_role` e concedida apenas
a `authenticated`. A função não receberá `user_id`; a identidade sempre virá da
sessão autenticada.

Todos os filtros usarão predicados estáticos e valores validados. Não haverá SQL
dinâmico. O contrato limitará o número de valores repetidos e rejeitará
intervalos invertidos antes da chamada. A ausência de intervalo continuará
significando todo o histórico legível.

### 9.2. Resposta agregada

O JSON retornará:

```text
generatedAt
filters
focusReportId
metrics
  totalReports
  positiveResultReports
  lossReports
  pendingDataReports
verdictCounts[]
  verdict
  count
priorityCounts[]
  priority
  count
recentReports[]
  id
  businessCategory
  scenario
  analysisMode
  createdAt
  updatedAt
  verdict
  priority
  isPartial
  itemCount
  realMarginBasisPoints
  monthlyResultCents
  schemaVersion
  calculationVersion
  contentVersion
```

`recentReports` terá no máximo seis entradas e não incluirá `report_snapshot`.
`verdictCounts` sempre terá os sete vereditos aceitos e `priorityCounts` sempre
terá as cinco prioridades aceitas, inclusive com contagem zero. As contagens, a
seleção do foco e a lista serão calculadas sobre o mesmo conjunto filtrado
dentro da mesma instrução para evitar divergência entre cards e lista.

### 9.3. Relatório em foco

Depois de receber `focusReportId` no snapshot agregado, o serviço reutilizará
`getOwnedReport` para carregar e validar somente o snapshot do relatório em
foco. Os presenters atuais continuarão responsáveis por formatar as métricas
financeiras e as explicações de indisponibilidade. Um foco mais antigo poderá
ser validado mesmo que não esteja entre os seis relatórios recentes.

O snapshot agregado nunca transportará todos os `report_snapshot` do usuário.

### 9.4. Índices

O índice parcial existente em `(user_id, created_at desc, id desc) where
deleted_at is null` atende o recorte padrão e a lista recente. A implementação
deve verificar o plano das consultas representativas antes de adicionar
índices.

Não serão criados índices para toda combinação de filtros. Se os testes com
volume realista demonstrarem necessidade, o primeiro candidato será um índice
parcial alinhado ao filtro de igualdade mais frequente e à faixa de data. A
decisão será baseada em `EXPLAIN`, não apenas na presença de novos predicados.

### 9.5. Alternativas descartadas

- **Agregar no browser:** exigiria transferir todos os relatórios ou snapshots,
  aumentaria exposição de dados e custo proporcional ao histórico.
- **Executar várias consultas independentes:** cards, distribuições e lista
  poderiam observar conjuntos diferentes e aumentariam a latência.
- **Criar tabela ou materialized view de dashboard:** adicionaria sincronização
  e invalidação sem necessidade para o volume atual; as colunas resumidas de
  `diagnoses` já sustentam o MVP.

## 10. Aplicação e componentes

O carregamento permanecerá no Server Component de `/dashboard`. A organização
proposta é:

- `dashboard-filters`: lê e altera a query string;
- `client-dashboard-metric-grid`: quatro contagens globais;
- `diagnosis-status-distribution`: vereditos e seus valores;
- `diagnosis-priority-distribution`: prioridades e seus valores;
- `dashboard-recent-reports`: seis relatórios do recorte;
- `dashboard-report-focus`: identidade e métricas do snapshot selecionado;
- `client-dashboard.schema.ts`: contrato estrito do RPC;
- `client-dashboard-filters.ts`: parse, normalização e serialização;
- `get-client-dashboard.service.ts`: chamada do RPC e composição do view model.

Os componentes reutilizarão `MetricCard`, `Badge`, `Card`, os formatadores e os
presenters de relatórios. Nenhum componente React classificará margem, escolherá
prioridade ou recalculará resultado financeiro.

## 11. Estados da experiência

### 11.1. Conta sem relatórios

Mostrar uma explicação curta do valor do primeiro diagnóstico e a ação `Criar
primeiro diagnóstico`. Não renderizar gráficos, filtros sem utilidade ou cards
com zero como se fossem desempenho.

### 11.2. Filtros sem resultado

Manter a barra de filtros e mostrar:

> Nenhum relatório corresponde aos filtros selecionados.

Oferecer `Limpar filtros` e `Novo diagnóstico`. Esse estado não é igual ao de
uma conta sem histórico.

### 11.3. Relatório parcial

Exibir as métricas disponíveis e explicar o dado que impede as restantes. Não
reduzir toda a seção a `faltam dados`.

### 11.4. Snapshot legado indisponível

Se o resumo agregado existir, mas o snapshot em foco não puder ser validado,
manter os indicadores globais e a lista. A seção em foco explicará que o
relatório continua listado, mas não pode ser resumido nessa visão, oferecendo
`Abrir relatório` quando a rota de leitura compatível puder tratá-lo.

### 11.5. Falha de leitura

Uma falha do snapshot agregado usa o `error.tsx` da rota ou estado equivalente.
Uma falha apenas do relatório em foco não derruba as contagens globais; a seção
isolada informa indisponibilidade temporária.

### 11.6. Carregamento

O skeleton deve reservar o espaço da barra de filtros, dos quatro cards, das
duas distribuições e da lista, evitando mudança brusca de layout. A seção em
foco pode carregar junto no servidor; não haverá atualização silenciosa em
tempo real.

## 12. Responsividade e acessibilidade

- A ordem semântica será: título e ações, filtros, indicadores, distribuições,
  relatórios recentes e relatório em foco.
- No celular, os filtros resumem-se em uma linha com botão `Filtros`, mantendo
  os chips ativos visíveis.
- Os cards formam uma coluna no menor viewport, duas colunas em telas médias e
  quatro em telas largas.
- As distribuições ficam empilhadas no celular e lado a lado quando houver
  espaço.
- Números usam algarismos tabulares e rótulos permanecem visíveis.
- Todo gráfico possui o mesmo conteúdo em texto; tooltip não será a única forma
  de acessar valores.
- Estados não dependem exclusivamente de verde, amarelo ou vermelho.
- Controles têm foco visível, nomes acessíveis e funcionam por teclado.
- Mudanças por filtro navegam para uma URL nova; o título da página recebe foco
  somente quando a navegação completa exigir reposicionamento, sem roubar foco
  durante interação comum.

## 13. Testes e verificação

### 13.1. Banco

Testes pgTAP devem provar:

- `anon` e `service_role` não executam o RPC;
- usuário autenticado recebe somente relatórios próprios e ainda legíveis pelas
  políticas de acesso histórico;
- relatórios excluídos não contam;
- todos os filtros são aplicados antes das contagens e do limite de recentes;
- combinações vazias retornam contagens zero e listas vazias;
- agrupamentos de perda e dados pendentes usam somente os vereditos definidos;
- a ordenação recente é estável em `(created_at desc, id desc)`;
- o limite de seis é respeitado;
- o payload não contém `report_snapshot`, dados de outro usuário ou colunas
  específicas não aprovadas.

### 13.2. Serviço

Testes unitários devem validar:

- contrato Zod estrito;
- rejeição de valores negativos, datas inválidas, enum desconhecido e campos
  adicionais;
- normalização e serialização estáveis dos filtros;
- chamada do RPC com argumentos validados;
- seleção do relatório em foco solicitado ou fallback para o mais recente;
- erro isolado do foco sem descarte do snapshot agregado.

### 13.3. Interface

Testes de componentes e página devem cobrir:

- conta vazia e filtros sem resultado como estados distintos;
- quatro cards com contagens corretas;
- atalhos dos cards aplicando os vereditos correspondentes;
- distribuições com texto e valores independentes de cor;
- filtros dependentes de categoria e modalidade;
- remoção individual e limpeza total de filtros;
- seleção do foco preservando filtros;
- métricas adaptadas aos quatro tipos de relatório suportados;
- indisponibilidade preservada em vez de zero;
- snapshot legado ou foco com falha sem derrubar a visão geral;
- navegação completa por teclado e nomes acessíveis.

### 13.4. Verificação final

- Executar testes SQL específicos e a suíte de relatórios.
- Executar testes do dashboard, typecheck, lint e formatação.
- Verificar planos das consultas padrão, por data e por situação.
- Capturar e revisar desktop e mobile em conta vazia, histórico misto,
  resultado filtrado e relatório parcial.
- Confirmar ausência de rolagem horizontal e de informações acessíveis apenas
  por cor ou hover.

## 14. Critérios de aceite

A entrega estará concluída quando:

- nenhum valor demonstrativo permanecer em `/dashboard`;
- todos os indicadores globais forem contagens de fatos persistidos;
- nenhum valor financeiro agregar relatórios diferentes;
- filtros alterarem cards, distribuições e recentes de forma consistente;
- um único snapshot validado alimentar o relatório em foco;
- relatórios parciais preservarem valores desconhecidos;
- a página não apresentar evolução financeira sem série comparável;
- permissões impedirem leitura cruzada entre usuários;
- os estados vazios, de erro, carregamento e responsividade estiverem cobertos.
