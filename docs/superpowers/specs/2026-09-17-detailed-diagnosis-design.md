# Diagnóstico detalhado de Produto e Produção

**Data:** 2026-09-17

**Status:** Aprovado para revisão e planejamento

**Documentos relacionados:**

- `docs/DETAILED-DIAGNOSIS.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-08-31-product-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-01-production-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-11-product-production-report-refactor-design.md`

## 1. Objetivo

Implementar o diagnóstico detalhado para Produto e Produção como uma análise
financeira de um conjunto de itens. O fluxo deve coletar os dados de cada item
passo a passo, calcular a contribuição individual e consolidada e salvar um
relatório imutável na biblioteca existente.

Neste recurso, **estoque** significa exclusivamente o conjunto de produtos
analisados. Não haverá controle de saldo, entradas, saídas, lotes, validade,
reposição ou qualquer outra função de inventário físico.

A entrega também corrige o tratamento de volume mensal ausente nos diagnósticos
rápidos de Produto e Produção. Ausência de resposta, zero vendas e volume
positivo passarão a representar estados distintos.

## 2. Escopo aprovado

### 2.1 Incluído

- Habilitar `Diagnóstico detalhado` na etapa `Que tipo de resultado você quer
ver?` das trilhas Produto e Produção.
- Manter o modo detalhado indisponível para Serviço.
- Manter todos os itens como revenda na trilha Produto.
- Manter todos os itens como fabricação na trilha Produção.
- Coletar uma vez os gastos fixos, pró-labore, imposto e taxa de cartão do
  negócio.
- Cadastrar um ou mais itens em um subfluxo repetível e sequencial.
- Permitir revisar, editar, adicionar e remover itens antes do envio.
- Permitir volume mensal desconhecido, zero ou positivo.
- Calcular custo variável, valor deixado por venda, margem de contribuição,
  resultados mensais, ponto de equilíbrio e pisos de preço quando os dados
  necessários estiverem disponíveis.
- Oferecer custo total conhecido ou ficha técnica na Produção.
- Incluir ingredientes, rendimento, perda, embalagem, trabalho direto e
  outros gastos variáveis na ficha técnica.
- Gerar e persistir um relatório detalhado imutável e versionado.
- Exibir relatórios detalhados na biblioteca e na rota de detalhe existentes.
- Corrigir o cenário de volume ausente nos novos diagnósticos rápidos de
  Produto e Produção.
- Preservar a leitura de todos os relatórios antigos sem recalculá-los.
- Cobrir domínio, componentes, aplicação, persistência, acessibilidade e
  regressões com testes automatizados.

### 2.2 Excluído

- Diagnóstico detalhado de Serviço.
- Mistura de itens revendidos e fabricados no mesmo diagnóstico.
- Produto digital no diagnóstico detalhado.
- Convite para o detalhado depois da conclusão do diagnóstico rápido.
- Interpretação ou geração de conteúdo por IA.
- Geração dedicada de PDF.
- Comparação histórica entre diagnósticos detalhados.
- Edição ou recálculo de um relatório salvo.
- Cadastro de catálogo, SKU, fornecedor ou movimentação de estoque.
- Conversão automática entre unidades de ingredientes.
- Pesquisa de preço de mercado ou previsão de demanda.

## 3. Princípios de produto

1. A conclusão vem antes da explicação técnica.
2. Ausência de dado não pode ser interpretada silenciosamente como zero.
3. Um resultado parcial deve parecer informativo e neutro, não um prejuízo.
4. Metas matemáticas precisam declarar suas premissas e limitações.
5. O sistema não altera respostas do usuário para produzir um cenário.
6. Regras financeiras são determinísticas, versionadas e calculadas no
   servidor antes da persistência.
7. Relatórios antigos permanecem imutáveis.

## 4. Jornada do usuário

### 4.1 Entrada

O usuário escolhe `Produto` ou `Produção` na etapa de categoria e, em
seguida, escolhe entre `Diagnóstico rápido` e `Diagnóstico detalhado`.

O detalhado não será acessado a partir de um relatório rápido concluído nesta
entrega.

### 4.2 Fases do detalhado

```text
Categoria
→ Rápido ou detalhado
→ Gastos mensais do negócio
→ Valor mensal do trabalho do dono
→ Imposto e cartão
→ Item N: identificação, preço e volume
→ Item N: custos
→ Adicionar outro item ou revisar o conjunto
→ Revisão final
→ Gerar e salvar relatório
```

Os dados gerais são preenchidos uma vez. O subfluxo de item é repetido para
cada produto. Depois de concluir um item, o usuário vê um resumo e escolhe
`Adicionar outro produto` ou `Revisar diagnóstico`.

Editar um item reabre seu subfluxo sem apagar os demais. Remover um item exige
confirmação quando ele já contém dados. A revisão sempre mantém ao menos um
item; o último item não pode ser removido sem que outro seja criado.

### 4.3 Progresso

O indicador principal usa fases estáveis, pois o total de itens é dinâmico.
Durante o subfluxo repetível, um indicador local informa, por exemplo,
`Produto 2 · custos`. O sistema não mostra um total de etapas que se torne
incorreto quando um item for adicionado.

Ao mudar de Rápido para Detalhado ou de Detalhado para Rápido antes do envio,
o estado da modalidade abandonada não é reaproveitado. Voltar entre etapas da
mesma modalidade preserva as respostas exatas.

## 5. Contrato de entrada

### 5.1 Dados do negócio

- Identificador UUID da submissão.
- Categoria: `product` ou `production`, determinada pela trilha.
- Gastos fixos mensais, obrigatórios e maiores ou iguais a zero.
- Indicador de inclusão do pró-labore.
- Pró-labore mensal positivo quando habilitado e zero quando desabilitado.
- Imposto e cartão obrigatórios, individualmente entre 0% e 100%.
- Margem mínima da simulação promocional entre 0% e menos de 100%, iniciada
  em 15%.
- Um ou mais itens.

Imposto e cartão são médias globais aplicadas igualmente a todos os itens. A
margem promocional é um parâmetro de simulação escolhido pelo usuário, não
uma margem ideal recomendada pelo Lucrivo.

### 5.2 Campos comuns dos itens

- Identificador UUID local do item.
- Posição inteira, única dentro do diagnóstico.
- Nome obrigatório depois de remover espaços laterais.
- Preço de venda positivo, com até duas casas decimais.
- Volume mensal opcional: vazio, zero ou inteiro positivo.

O campo de volume usa o rótulo `Quantas unidades você vende por mês?`, a
indicação `Opcional` e a orientação visível:

> Se você já vende este item, informe a média mensal. Digite 0 se não vendeu
> nenhuma unidade. Se ainda não sabe ou quer descobrir quanto precisa vender,
> deixe em branco — o resultado será parcial e a meta aparecerá apenas como
> referência.

O resumo do item diferencia `Volume ainda não informado`, `Nenhuma venda no
mês` e `{quantidade} unidades por mês`.

### 5.3 Item de Produto

- Modo fixo `resale`.
- Custo de compra por unidade maior ou igual a zero.
- Embalagem por unidade maior ou igual a zero.

O custo de compra zero é válido, de acordo com o contrato atual do
diagnóstico rápido. O detalhado de Produto não oferece Produto digital.

### 5.4 Item de Produção

O item usa exatamente um dos modos:

- `summarized`: custo total conhecido da unidade pronta;
- `technical_sheet`: ficha técnica completa.

No modo resumido, o custo informado é positivo e inclui todos os gastos
variáveis necessários para entregar uma unidade pronta. Componentes de ficha
técnica não participam do comando normalizado.

No modo de ficha técnica:

- rendimento da receita positivo;
- perda maior ou igual a 0% e menor que 100%;
- embalagem por unidade maior ou igual a zero;
- trabalho direto por unidade maior ou igual a zero;
- outros gastos variáveis por unidade maiores ou iguais a zero;
- uma ou mais linhas de ingrediente;
- soma calculada dos ingredientes maior que zero.

Cada ingrediente possui nome obrigatório, quantidade positiva, unidade de
medida obrigatória e custo unitário maior ou igual a zero. Quantidade aceita
até seis casas decimais. Custo unitário do ingrediente aceita até quatro
casas decimais para representar custos inferiores a um centavo por unidade.
O texto de unidade não produz conversão; quantidade e custo precisam usar a
mesma unidade.

## 6. Tratamento do volume mensal

### 6.1 Estados distintos

| Entrada          | Significado          | Comportamento                    |
| ---------------- | -------------------- | -------------------------------- |
| Vazio            | Volume desconhecido  | Relatório parcial e neutro       |
| `0`              | Nenhuma venda no mês | Cenário conhecido de zero vendas |
| Inteiro positivo | Volume conhecido     | Relatório mensal completo        |

Valores negativos, fracionários ou maiores que o limite seguro são
inválidos.

### 6.2 Correção do diagnóstico rápido

Nos novos contratos de Produto e Produção, volume vazio permanece `null` em
todo o cálculo. Ele não é transformado em zero.

Com volume desconhecido e contribuição unitária positiva:

- o veredito é `incomplete_volume`;
- a apresentação usa `Falta informar as vendas`;
- resultado mensal, margem mensal, rateio fixo por unidade e custo total por
  unidade são `null`;
- o valor que uma venda deixa após custos diretos e taxas continua disponível;
- a meta mensal de equilíbrio pode ser calculada quando a contribuição
  unitária é positiva;
- metas diárias e semanais ficam ocultas;
- não há sinalização visual de prejuízo causada somente pela ausência;
- aparece a orientação:

> Como você ainda não informou quanto vende, esta meta é apenas uma
> referência. Se ela parecer fora da realidade, revise preço, custos e gastos
> mensais antes de tomar uma decisão.

Uma contribuição unitária menor ou igual a zero continua produzindo o
veredito unitário correspondente, mesmo sem volume, porque preço, custo direto
e taxas já são suficientes para essa conclusão. Nesse caso, a sinalização não
é causada pela ausência de volume.

Quando o usuário informa zero explicitamente, o cálculo usa zero e pode
apresentar `Sem vendas no mês`. O resultado mensal conhecido equivale ao
negativo dos gastos mensais considerados, mas o veredito permanece
`no_sales`, em vez de classificar o cenário como falha de preço. A interface do
rápido passa a aceitar zero para permitir essa distinção.

Relatórios rápidos antigos mantêm seus snapshots e sua apresentação atuais.

### 6.3 Diagnóstico detalhado parcial

Um detalhado é completo somente quando todos os itens possuem volume
conhecido, inclusive zero. Se ao menos um item tiver volume `null`:

- cada item ainda recebe custos e resultados unitários;
- itens com volume conhecido podem exibir seu resultado mensal individual;
- totais mensais conhecidos podem ser preservados internamente, mas não são
  classificados como resultado completo do negócio;
- resultado mensal consolidado, margem final do negócio, concentração do
  mix e ponto de equilíbrio ponderado ficam indisponíveis;
- a conclusão é neutra e informa os nomes dos itens pendentes;
- a revisão e o relatório oferecem ação de retorno aos dados apenas antes da
  persistência; relatórios salvos não são editáveis.

O sistema não preenche automaticamente os volumes. O botão mutável
`Calcular equilíbrio` do protótipo não será implementado. Metas são resultados
explicados, não alterações nas respostas.

## 7. Cálculos

Os cálculos de domínio usam inteiros. Dinheiro de saída é expresso em
centavos e taxas em pontos-base. Quantidades e custos fracionários de
ingredientes usam escalas inteiras declaradas no contrato.

### 7.1 Custo variável

Para Produto:

```text
custo variável unitário = custo de compra + embalagem
```

Para Produção resumida:

```text
custo variável unitário = custo total informado da unidade pronta
```

Para cada ingrediente da ficha:

```text
custo da linha = quantidade × custo unitário
```

Para Produção com ficha:

```text
ingredientes da receita = soma dos custos das linhas
ingredientes por unidade vendável =
  ingredientes da receita ÷ rendimento ÷ (1 - perda)

custo variável unitário =
  ingredientes por unidade vendável
  + embalagem
  + trabalho direto
  + outros gastos variáveis
```

O arredondamento para centavos ocorre na fronteira explicitada pelo motor de
cálculo e é coberto por testes de valores-limite. O mesmo valor arredondado é
usado no snapshot, nos resumos e na persistência relacional.

### 7.2 Resultado por item

Considere:

- `P`: preço unitário;
- `CV`: custo variável unitário;
- `T`: imposto mais cartão;
- `Q`: volume mensal conhecido;
- `RL`: valor recebido depois das taxas;
- `SV`: valor que uma venda deixa para os gastos mensais.

```text
RL = arredondar(P × (1 - T))
SV = RL - CV
margem de contribuição = SV ÷ P
receita mensal do item = P × Q
contribuição mensal do item = SV × Q
```

Receita e contribuição mensais são `null` quando `Q` é desconhecido e zero
quando `Q` foi explicitamente informado como zero.

### 7.3 Resultado consolidado

```text
gastos mensais considerados = gastos fixos + pró-labore
receita mensal = soma das receitas mensais dos itens
sobra das vendas = soma das contribuições mensais dos itens
resultado mensal = sobra das vendas - gastos mensais considerados
margem de contribuição do mix = sobra das vendas ÷ receita mensal
margem final do negócio = resultado mensal ÷ receita mensal
faturamento de equilíbrio =
  gastos mensais considerados ÷ margem de contribuição do mix
```

Os resultados consolidados que dependem do mix são produzidos somente quando
todos os volumes são conhecidos. Divisores iguais ou menores que zero
produzem `null`, nunca infinito.

### 7.4 Pisos de preço

```text
piso sem prejuízo variável = CV ÷ (1 - T)
piso promocional = CV ÷ (1 - T - margem promocional)
```

Os pisos cobrem custos variáveis e taxas. Eles não pagam automaticamente os
gastos mensais. Quando o denominador não é positivo, o resultado é `null` e a
interface explica que não há piso matematicamente possível com aquelas taxas
e margem.

### 7.5 Orientações determinísticas

O relatório pode identificar, quando os dados necessários existem:

- item cuja venda não cobre o próprio custo variável e as taxas;
- item com melhor contribuição unitária;
- item com maior contribuição mensal;
- item mais vendido com contribuição proporcionalmente baixa;
- dependência superior a 45% da contribuição consolidada em um único item;
- resultado consolidado abaixo, igual ou acima do equilíbrio;
- informações ausentes que impedem uma conclusão mensal.

As orientações são regras de domínio versionadas. Nenhuma delas usa IA.

## 8. Arquitetura da aplicação

### 8.1 Fronteiras

O orquestrador atual continua responsável pela categoria. Cada wizard rápido
mantém seu estado e seus contratos. Ao escolher `detailed`, Produto e Produção
entram em um módulo próprio de diagnóstico detalhado.

```text
QuickDiagnosisWizard
├── ServiceDiagnosisWizard
├── ProductDiagnosisWizard
│   ├── fluxo rápido existente
│   └── DetailedDiagnosisWizard(category = product)
└── ProductionDiagnosisWizard
    ├── fluxo rápido existente
    └── DetailedDiagnosisWizard(category = production)
```

O módulo detalhado compartilha somente responsabilidades neutras:

- estado de dados gerais e coleção ordenada de itens;
- navegação do subfluxo repetível;
- shell, progresso, campos e resumos acessíveis;
- aritmética inteira e formatação;
- persistência e apresentação de propriedades comuns do mix.

Produto e Produção mantêm validadores, normalizadores, cálculos de custo e
textos específicos. O detalhado não reutiliza comandos ou snapshots do rápido.

### 8.2 Estado do navegador

O navegador preserva strings cruas para evitar alteração visual dos valores
digitados. O reducer possui a fase atual, item ativo, dados gerais, itens
ordenados, erros por campo e estado de submissão.

Operações do reducer:

- alterar campo geral;
- alterar campo do item ativo;
- adicionar, confirmar, editar e remover item;
- adicionar e remover ingrediente;
- avançar e voltar entre fases;
- aplicar erros normalizados do servidor;
- bloquear submissões concorrentes;
- reiniciar com novo identificador depois de submissão consumida.

Uma troca de modo de custo em Produção preserva temporariamente os valores
da alternativa no navegador para permitir retorno sem redigitação. Somente o
modo confirmado entra no comando normalizado e no snapshot.

### 8.3 Validação e submissão

A mesma definição de schema normaliza entradas no avanço progressivo e na
submissão. O servidor nunca confia em totais calculados pelo navegador.

```text
entrada não confiável
→ validação e normalização completa
→ autenticação
→ verificação do direito de criar diagnóstico
→ cálculo determinístico
→ construção do snapshot
→ persistência transacional autenticada
→ redirecionamento ao relatório
```

Falhas de validação levam ao primeiro campo inválido e preservam todos os
itens. Falhas de autenticação, limite ou persistência mantêm a revisão e
oferecem nova tentativa. O mesmo UUID torna a repetição idempotente.

## 9. Persistência e versionamento

### 9.1 Identidade do diagnóstico

`diagnoses` recebe uma coluna obrigatória que distingue `quick` e `detailed`.
Registros existentes recebem `quick` por padrão. Categoria e cenário mantêm
seus significados atuais:

- Produto detalhado: categoria `product`, cenário `resale`;
- Produção detalhada: categoria `production`, cenário `manufacturing`.

Campos de resumo específicos de um único item não serão sobrecarregados com
totais de um mix. A migração adiciona resumos próprios para receita mensal,
resultado mensal, quantidade de itens e estado parcial quando necessários
para listar relatórios sem ler snapshots completos.

### 9.2 Tabelas detalhadas

A persistência normalizada possui:

- um registro pai com dados gerais e resultados consolidados;
- itens ordenados vinculados ao pai;
- ingredientes ordenados vinculados ao item de Produção.

Restrições de banco garantem categoria, modo de custo, escalas numéricas,
ordenação única, volumes opcionais, forma do pró-labore e pertencimento ao
mesmo usuário. Tabelas de origem são somente leitura para `authenticated`; a
criação ocorre por função transacional `security definer` com `search_path`
vazio e `auth.uid()` verificado internamente.

A função recebe o conjunto normalizado, valida a coerência entre argumentos,
resumos e snapshot, cria todas as linhas atomicamente e devolve o identificador
existente em repetições idempotentes equivalentes.

### 9.3 Snapshot

O snapshot detalhado possui versões próprias de schema, cálculo e conteúdo e
inclui:

- identidade, moeda e unidade;
- políticas e premissas;
- entradas gerais normalizadas;
- itens e ingredientes ordenados;
- resultados unitários e mensais de cada item;
- resultados consolidados anuláveis;
- indicador de análise parcial e campos pendentes;
- conclusão e orientações determinísticas ordenadas.

O parser de relatórios aceita snapshots rápidos antigos, novos snapshots
rápidos corrigidos e snapshots detalhados. A escolha do apresentador considera
categoria, modalidade e versões.

## 10. Apresentação

### 10.1 Revisão antes do envio

A revisão agrupa dados do negócio e itens. Cada item mostra nome, tipo de
custo, preço, volume nos três estados e custo calculado. Itens com volume
desconhecido aparecem em um aviso neutro com ação `Editar`.

`Gerar diagnóstico detalhado` é a única ação de persistência. Um diagnóstico
parcial pode ser salvo com o aviso visível na revisão; não há caixa de
confirmação ou etapa adicional.

### 10.2 Biblioteca

O cartão de um detalhado mostra:

- categoria e rótulo `Diagnóstico detalhado`;
- data e hora;
- quantidade de produtos;
- estado `Completo` ou `Parcial`;
- resultado mensal quando disponível;
- margem final quando disponível;
- ação para abrir o relatório.

### 10.3 Relatório detalhado

O relatório possui apresentação própria e responsiva:

1. conclusão principal em linguagem simples;
2. resultado do negócio e ponto de equilíbrio, quando completos;
3. comparação da contribuição mensal dos itens;
4. itens que não cobrem seus custos variáveis;
5. ficha financeira de cada item;
6. ritmo de vendas;
7. piso sem prejuízo e piso promocional;
8. orientações determinísticas.

Quando o relatório é parcial, as seções que dependem do mix são substituídas
por uma explicação e pela lista dos itens sem volume. A ausência não usa
vermelho, ícone de perda ou linguagem de prejuízo.

O gráfico usa texto e valor junto da cor, preservando compreensão sem depender
somente da percepção cromática. Todos os controles possuem alvo mínimo de
44×44 px, foco visível, rótulo acessível e operação por teclado. Mudanças de
etapa movem o foco para o título. Mensagens de erro ficam associadas ao campo
e são anunciadas.

Não haverá botão ou espaço reservado para IA.

## 11. Erros e casos-limite

- Nenhum cálculo divide por zero ou produz infinito no contrato.
- Taxas que eliminam o valor líquido tornam pisos de preço indisponíveis.
- Contribuição unitária menor ou igual a zero impede meta de equilíbrio por
  volume e gera orientação específica sobre preço ou custo.
- Perda de 100% ou mais é bloqueada no campo e no servidor.
- Itens e ingredientes vazios não podem ser enviados.
- Quantidades, escalas e somas fora de inteiro seguro são rejeitadas.
- Remoção de item preenchido requer confirmação.
- Duplo clique no envio não cria relatórios duplicados.
- Uma resposta do servidor que invalide um item leva o foco àquele item e
  campo.
- Falha de leitura de snapshot usa o estado de relatório indisponível já
  existente.

## 12. Estratégia de testes

### 12.1 Domínio

- Revenda com e sem embalagem.
- Produção resumida.
- Ficha com ingredientes fracionários, rendimento e perda.
- Inclusão de embalagem, trabalho direto e outros gastos.
- Arredondamentos e limites de escala.
- Contribuição negativa, zero e positiva.
- Mix completo lucrativo, equilibrado e deficitário.
- Mix parcial com um ou vários volumes desconhecidos.
- Volume vazio, zero e positivo.
- Pisos disponíveis e impossíveis.
- Regras de concentração e prioridade.

### 12.2 Interface

- Seleção do modo detalhado nas duas categorias.
- Fluxo sequencial de um e vários itens.
- Voltar, editar, adicionar, confirmar remoção e revisar.
- Alternância dos modos de custo de Produção.
- Adição e remoção de ingredientes.
- Texto visível e estados do volume.
- Erros progressivos e foco no primeiro campo inválido.
- Bloqueio de submissão concorrente e nova tentativa.
- Navegação por teclado, nomes acessíveis e anúncios.
- Layout sem rolagem horizontal em viewport móvel.

### 12.3 Aplicação e banco

- Validação integral antes de autenticar e persistir.
- Limite de diagnósticos contado uma vez por mix.
- Criação atômica do pai, itens, ingredientes e snapshot.
- Idempotência por usuário e UUID.
- RLS de leitura por proprietário.
- Rejeição de snapshots ou totais incoerentes.
- Tipos de banco regenerados e contratos de RPC tipados.

### 12.4 Relatórios e regressão

- Parse de todas as versões antigas e novas.
- Cartões rápidos e detalhados na mesma biblioteca.
- Apresentação detalhada completa e parcial.
- Correção do volume ausente no rápido sem alterar snapshots antigos.
- Relatórios de Serviço sem mudança.
- Suíte completa de testes, tipos, lint e formatação.

## 13. Critérios de aceitação

1. Produto e Produção permitem escolher o modo detalhado.
2. Um diagnóstico pode conter um ou vários itens preenchidos sequencialmente.
3. Todos os itens respeitam a categoria escolhida no início.
4. Produção calcula corretamente custo resumido e ficha técnica.
5. Pró-labore é separado dos gastos fixos e participa do resultado mensal.
6. Volume vazio, zero e positivo produzem estados diferentes.
7. Volume vazio não gera prejuízo visual nem resultado mensal inventado.
8. O rápido explica que a meta calculada sem volume é apenas referência e
   oculta metas diárias e semanais.
9. Um mix com volume desconhecido é salvo e exibido como parcial.
10. Um mix completo exibe resultado do negócio, ponto de equilíbrio,
    contribuições e orientações.
11. O envio cria um único diagnóstico transacional e idempotente.
12. A biblioteca distingue diagnósticos rápidos e detalhados.
13. Relatórios antigos permanecem legíveis e imutáveis.
14. Nenhuma interface do escopo oferece IA ou controle de inventário físico.
