# Clareza dos relatórios e correções de comparação

Data: 2026-10-06

## 1. Objetivo

Corrigir a hierarquia e a legibilidade da seção `Entenda o resultado`, eliminar
repetições sem valor, preservar as regras financeiras já corretas e remover
comparações enganosas entre itens empatados. Os mesmos conceitos devem chegar ao
dashboard do cliente sem duplicação e com ajuda contextual.

Esta mudança é uma evolução da implementação descrita em
`docs/superpowers/specs/2026-10-05-break-even-reference-and-report-indicators-design.md`.

## 2. Diagnóstico confirmado

### 2.1. Layout

O grid atual usa três colunas em desktop e faz o indicador principal ocupar duas.
O relatório detalhado possui um indicador em destaque e três indicadores
regulares. Depois da primeira linha, sobram dois cards e uma coluna vazia, o que
produz o buraco observado no desktop.

O comportamento mobile não apresenta estouro horizontal. O problema é de
composição nas larguras intermediárias e largas, não de largura mínima dos
cards.

### 2.2. Conteúdo e repetição

O presenter detalhado usa o corpo persistido das seções `sales_goal`,
`break_even` e `margin_diagnosis` como descrição dos indicadores. O componente
de página também volta a renderizar `sales_goal` e `break_even` como cards
independentes.

Isso cria dois problemas:

- a mesma explicação aparece no indicador e novamente abaixo dele;
- a seção persistida `break_even`, que descreve preços de equilíbrio por item,
  aparece dentro do indicador de faturamento de equilíbrio do conjunto.

As referências por item continuam úteis, mas pertencem a `Item por item`, onde
cada item já apresenta seu menor preço e sua referência isolada.

### 2.3. Cores

O valor de atenção usa `text-warning-foreground` sobre uma superfície escura
levemente amarela. No tema escuro essa combinação fica próxima de `1,38:1` de
contraste. Badges semânticos verdes e azuis também usam a cor semântica como
texto pequeno sobre uma variação translúcida da mesma cor, ficando abaixo de
`4,5:1` em alguns estados.

Os números semânticos grandes podem conservar cor quando atingirem o contraste
de texto grande. Labels, badges e explicações pequenas devem usar foreground
legível, mantendo a semântica por ícone, texto do estado, borda e superfície.

### 2.4. Comparações entre itens

As regras `high_volume_low_margin`, `best_unit_contribution` e `concentration`
usam reduções que mantêm o primeiro item quando existe empate. Com valores
iguais, isso pode fazer o primeiro item parecer pior, melhor ou mais concentrado
sem uma diferença factual.

### 2.5. Metas de vários itens

A meta consolidada atual está correta quando todas as quantidades são conhecidas:
ela calcula o total necessário mantendo a proporção informada entre os itens.
Ela não é uma meta exclusiva do primeiro item.

Quando faltam quantidades, não existe uma proporção segura para uma meta única.
O sistema já calcula uma referência isolada para cada item sem quantidade, com a
premissa de que somente aquele item seria vendido. Se apenas um item estiver sem
quantidade, somente ele deve receber essa referência.

Não será criada uma distribuição inteira da meta consolidada entre os itens.
Esse recurso exigiria uma regra de arredondamento e cobertura financeira ainda
não definida e poderia comunicar precisão falsa.

### 2.6. Dashboard do cliente

O dashboard já deriva seus quatro indicadores dos mesmos presenters do
relatório e, portanto, não está desatualizado. Há duas lacunas:

- o desconto máximo aparece como indicador e novamente como fato complementar;
- o conteúdo de ajuda disponível nos indicadores não é entregue ao popover já
  suportado por `MetricCard`.

## 3. Decisões de experiência

### 3.1. Indicadores como núcleo de `Entenda o resultado`

`Entenda o resultado` continuará imediatamente depois de `Comece por aqui` e
será a visão financeira principal do relatório. Os indicadores terão:

- label em tamanho de corpo, não em texto excessivamente pequeno;
- valor com maior peso visual quando calculado;
- uma linha de contexto curta e específica;
- ajuda sob demanda para explicar conceitos e fórmulas;
- estado textual e ícone, sem depender apenas de cor.

Valores indisponíveis terão hierarquia menor que valores calculados. O motivo da
indisponibilidade será visível e específico ao indicador, evitando repetir a
mesma frase em todos os cards.

### 3.2. Grid balanceado

O componente compartilhado continuará ordenando primeiro o indicador destacado.
O layout será calculado conforme a quantidade de indicadores regulares:

- em telas pequenas, uma coluna;
- a partir de `sm`, o destaque ocupa a linha inteira;
- com três regulares, dois dividem uma linha e o último ocupa a linha seguinte
  em larguras intermediárias;
- em desktop largo, o destaque ocupa oito de doze colunas, o primeiro regular
  ocupa quatro e os dois regulares restantes ocupam seis colunas cada;
- com quatro regulares, o destaque ocupa oito colunas, o primeiro regular quatro
  e os três seguintes quatro colunas cada.

Assim, tanto o relatório rápido com cinco indicadores quanto o detalhado com
quatro ficam completos, sem células vazias aparentes.

### 3.3. Remoção de conteúdo redundante

No relatório detalhado:

- os indicadores deixam de receber os corpos persistidos longos como descrição;
- snapshots na versão de conteúdo atual deixam de renderizar cards adicionais
  de `break_even` e `sales_goal`;
- snapshots legados mantêm a narrativa persistida uma única vez em uma área de
  detalhes, sem repeti-la dentro dos indicadores;
- `sales` concentra a meta total e sua premissa;
- `break_even` concentra o faturamento necessário do conjunto;
- `margin` concentra margem e resultado mensal;
- `revenue` concentra faturamento e custos mensais;
- preços mínimos e referências isoladas permanecem nos cards de cada item.

O componente `ReportSectionCard` será removido se não restar consumidor depois
dessa alteração. Como snapshots legados ainda são aceitos, a expectativa é
mantê-lo restrito à apresentação compatível dessas versões.

### 3.4. Estados parciais

Quando faltarem quantidades em um diagnóstico com vários itens:

- o indicador de unidades exibirá `Sem meta única`, em vez de uma indisponibilidade
  sem contexto;
- o texto explicará que falta a proporção completa do mix;
- uma lista compacta mostrará cada referência disponível no formato
  `<Item>: <quantidade> se vendido sozinho`;
- a mesma referência continuará visível no cabeçalho e no conteúdo do item
  correspondente;
- indicadores de faturamento, margem e receita usarão motivos distintos e
  próprios, sem copiar um parágrafo genérico.

O cenário de um único item sem quantidade continuará usando o ponto de equilíbrio
como referência consolidada.

### 3.5. Comparações e empates

As orientações comparativas obedecerão às seguintes regras:

- `high_volume_low_margin` só existe quando o grupo de maior volume possui
  margem estritamente menor que pelo menos outro item comparável;
- se vários itens empatarem no maior volume e também compartilharem a menor
  margem estrita, todos serão citados com título e frase no plural;
- se todos os itens comparáveis tiverem a mesma margem, nenhuma orientação de
  menor margem será criada;
- `best_unit_contribution` só existe quando o melhor resultado unitário é
  estritamente maior que o de pelo menos outro item;
- empates no melhor resultado citam todos os vencedores quando existir pelo
  menos um item com resultado inferior;
- `concentration` exige um líder único acima do limite de 45%; um empate na
  liderança não gera a afirmação de que um item concentra o conjunto.

A ordem original dos itens será preservada ao listar empates.

### 3.6. Dashboard

O dashboard continuará apresentando quatro métricas por relatório em foco.

- `MetricCard` receberá como `helpText` a descrição da ajuda do indicador.
- O fato complementar `discount_limit` será removido, pois repete o indicador
  de desconto máximo.
- A ressalva de que o limite não é uma recomendação será incorporada ao texto de
  ajuda do próprio indicador de desconto.
- Contagens de itens analisados, itens com perda, itens sem quantidade e data de
  atualização permanecem como fatos complementares.

## 4. Contraste e temas

As correções serão feitas no nível semântico mais estreito possível:

- badges semânticos usarão texto de foreground com contraste normal, enquanto
  ícone, label, borda e superfície continuarão comunicando o estado;
- o valor de atenção usará uma cor clara no tema escuro;
- avisos do simulador, prévia de edição e estado de relatório indisponível usarão
  a variante adequada para superfícies escuras;
- mensagens informativas dentro de `Item por item` usarão texto normal e ícone
  informativo colorido, evitando texto azul pequeno de baixo contraste;
- `text-muted-foreground` será preservado onde já supera `4,5:1` nos dois temas.

Não haverá troca da identidade visual nem introdução de cores fora dos tokens
semânticos existentes.

## 5. Arquitetura e arquivos

### Apresentação do relatório

- `src/modules/reports/components/report-indicators.tsx`: layout balanceado,
  hierarquia dos estados e renderização da lista compacta.
- `src/modules/reports/components/report-tone.ts`: correção das variantes de
  texto por tema.
- `src/modules/reports/components/detailed-report-detail.tsx`: remoção dos cards
  persistidos duplicados.
- `src/modules/reports/components/detailed-item-card.tsx`: contraste das
  mensagens informativas e preservação das referências por item.
- `src/modules/reports/components/discount-simulator.tsx` e
  `src/modules/reports/components/report-preview.tsx`: correções de atenção no
  tema escuro.
- `src/components/ui/badge.tsx`: contraste de texto dos badges semânticos.

### View models e domínio

- `src/modules/reports/presenters/to-detailed-report-view-model.ts`: textos
  específicos, estado parcial e referências estruturadas por item.
- `src/modules/reports/presenters/to-report-view-model.ts`: ajuda de desconto
  inclui a ressalva usada pelo dashboard.
- `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`: tratamento
  explícito de empates e comparação estrita.

### Dashboard

- `src/modules/client-dashboard/to-dashboard-report-focus.ts`: remoção do fato
  duplicado.
- `src/modules/client-dashboard/client-dashboard.types.ts`: remoção da chave
  `discount_limit`.
- `src/modules/client-dashboard/components/dashboard-report-focus.tsx`: repasse
  do texto de ajuda aos cards.

Não haverá alteração em tabelas, RPCs, migrations, schemas persistidos,
`calculationVersion` ou `contentVersion`. Snapshots existentes continuarão
legíveis.

`ReportIndicatorViewModel` ganhará dois campos opcionais derivados:

```ts
type ReportIndicatorDetail = {
  id: string;
  label: string;
  value: string;
};

type ReportIndicatorViewModel = {
  // campos existentes
  unavailable?: boolean;
  details?: ReportIndicatorDetail[];
};
```

`unavailable` controla apenas hierarquia visual e não substitui `tone`.
`details` será usado para referências curtas e estruturadas; não receberá
parágrafos persistidos nem HTML livre.

## 6. Compatibilidade

Os presenters continuarão respeitando as versões de conteúdo dos snapshots. As
mudanças de layout e contraste se aplicam a relatórios antigos e novos. Para a
versão atual, as novas estruturas auxiliares e os textos específicos serão
derivados em tempo de leitura. Para versões legadas, os corpos persistidos serão
mantidos em uma única área de detalhes. Nenhuma versão terá o mesmo corpo
simultaneamente no indicador e em um card separado.

A remoção visual dos cards persistidos não remove os dados do snapshot. A IA
continua recebendo `snapshot.sections` e permanece sujeita às regras descritas em
`docs/report-ai-interpretation-behavior.md`.

## 7. Testes e validação

### Domínio

- valores e volumes completamente iguais não geram comparação arbitrária;
- empate relevante lista todos os itens envolvidos;
- concentração empatada não escolhe o primeiro item;
- diferenças estritas continuam gerando as orientações existentes.

### Presenters

- relatório completo mantém meta consolidada e indicação de proporção;
- relatório parcial com vários itens não inventa meta única;
- todas as referências de itens sem quantidade são expostas e marcadas como
  cenário isolado;
- motivos de margem, receita e faturamento são distintos;
- relatório de um único item mantém o cenário consolidado atual.

### Componentes

- quatro e cinco indicadores recebem classes de grid balanceadas;
- valores indisponíveis têm hierarquia própria;
- o relatório detalhado não renderiza os cards redundantes;
- o dashboard não repete o desconto e expõe ajuda contextual;
- ajuda continua acessível por teclado e devolve o foco ao acionador.

### Verificação visual

A rota `visual-review` será capturada em:

- desktop largo (`1440px`);
- largura intermediária (`1024px`);
- mobile (`390px`);
- tema claro e tema escuro;
- relatório detalhado completo e parcial.

Serão verificados alinhamento, ausência de lacunas, contraste, wrapping de nomes
longos, ausência de rolagem horizontal e leitura dos estados parciais.

### Qualidade geral

Após os testes focados, serão executados `pnpm test`, `pnpm typecheck`,
`pnpm lint` e `pnpm format:check`.

## 8. Fora de escopo

- distribuir a meta consolidada em quantidades inteiras por item;
- mudar fórmulas financeiras, políticas ou versões de cálculo;
- alterar a interpretação por IA;
- redesenhar a identidade visual do relatório;
- adicionar novos indicadores ao dashboard geral;
- alterar persistência, migrations ou o seed.
