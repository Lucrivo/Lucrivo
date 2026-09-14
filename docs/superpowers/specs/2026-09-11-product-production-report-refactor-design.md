# Refatoração dos relatórios de Produto e Produção

**Data:** 2026-09-11

**Status:** Aprovado para planejamento e implementação

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-07-quick-diagnosis-plain-language-foundation-design.md`
- `docs/superpowers/specs/2026-09-08-service-report-normalization-design.md`

## 1. Objetivo

Refatorar os diagnósticos e relatórios rápidos de Produto e Produção para que
um micro ou pequeno empreendedor entenda, sem vocabulário financeiro
especializado:

1. se cada venda ajuda ou prejudica o negócio;
2. qual foi o resultado do mês com a quantidade informada;
3. qual é o menor preço sem prejuízo aplicável aos dados disponíveis;
4. quantas unidades precisam ser vendidas para pagar os gastos mensais;
5. qual ação merece atenção primeiro.

A entrega também adiciona Produto digital como cenário explícito, trata custo
direto igual a zero como um caso válido e usa zero vendas como base do resultado
mensal quando a quantidade não for informada.

Os textos devem seguir o padrão já aprovado para Serviço: conclusão primeiro,
explicação curta, ação clara e detalhes técnicos somente em ajuda clicável
quando forem necessários.

## 2. Decisões aprovadas

- Evoluir Produto e Produção com contratos versionados próprios.
- Manter todos os relatórios antigos legíveis e imutáveis.
- Não recalcular, reescrever, migrar nem completar snapshots existentes.
- Adicionar uma escolha explícita entre Produto para revenda e Produto digital.
- Permitir custo direto zero nos dois cenários de Produto.
- Produto digital começa sem custo por venda, mas permite informar um valor.
- Uma troca de tipo não apaga silenciosamente um custo já digitado.
- Quando a quantidade mensal estiver vazia, preservar a ausência na resposta
  original e usar zero vendas no cálculo do resultado do mês.
- Manter 20% apenas como faixa interna que separa margem apertada de lucro.
- Não apresentar 20% como meta universal, margem ideal ou recomendação.
- Remover dos novos relatórios o preço calculado para alcançar uma meta de 20%.
- Usar popovers somente quando a explicação muda a interpretação do número.
- Manter textos próprios para Revenda, Produto digital e Produção.
- Preservar a estrutura visual atual dos relatórios.

## 3. Escopo

### 3.1 Incluído

- Escolha do tipo de Produto no diagnóstico rápido.
- Validação, revisão e submissão do novo campo.
- Persistência do tipo de Produto nos novos diagnósticos.
- Nova versão dos cálculos de Produto e Produção.
- Resultado mensal explícito, inclusive quando nenhuma venda for informada.
- Correção dos casos de custo e menor preço iguais a zero.
- Nova versão de conteúdo para resumo executivo, números, seções e simulador.
- Popovers para os conceitos que precisam de explicação complementar.
- Novos contratos transacionais para Produto e Produção.
- Compatibilidade de leitura com os snapshots atuais.
- Atualização das regras de negócio em `docs/QUICK-DIAGNOSIS.md` e da descrição
  do produto em `PRODUCT.md`.
- Testes de domínio, interface, persistência, acessibilidade e responsividade.

### 3.2 Não incluído

- Reprocessamento ou backfill de relatórios existentes.
- Escolha de margem desejada pelo usuário.
- Recomendação de preço de mercado ou comparação com concorrentes.
- Ficha técnica, ingredientes, rendimento, desperdício ou estoque.
- Produtos com cobrança recorrente ou múltiplas unidades de cobrança.
- Unificação dos motores de Produto e Produção em um motor genérico.
- Redesenho visual completo do formulário ou do relatório.
- Mudanças no diagnóstico ou relatório de Serviço.

## 4. Arquitetura e versionamento

Produto e Produção permanecem em fluxos independentes:

```text
respostas do formulário
        ↓
validação no cliente e no servidor
        ↓
comando normalizado da categoria
        ↓
cálculo financeiro determinístico
        ↓
textos específicos do cenário
        ↓
snapshot versionado
        ↓
função transacional autenticada
        ↓
relatório salvo
```

As novas versões serão:

| Categoria | Schema | Cálculo | Conteúdo | Motivo                                             |
| --------- | -----: | ------: | -------: | -------------------------------------------------- |
| Produto   |      2 |       2 |        3 | Inclui tipo do produto e resultados mensais novos. |
| Produção  |      2 |       2 |        3 | Inclui resultados mensais novos.                   |

Os contratos de Produto e Produção `1/1/1` e `1/1/2` continuam legíveis. Somente
os novos fluxos escrevem `2/2/3`.

O perfil de apresentação deve ser escolhido pelo conjunto categoria e versões,
não apenas pela categoria. Dessa forma, títulos e textos persistidos de
relatórios antigos continuam com a apresentação compatível com sua época.

Os dois motores podem compartilhar aritmética inteira, formatação e componentes
visuais. Não devem compartilhar um dicionário genérico de conteúdo. O builder
de Produto recebe o tipo do produto e escolhe texto de Revenda ou Produto
digital; o builder de Produção usa exclusivamente vocabulário de fabricação.

## 5. Diagnóstico de Produto digital

### 5.1 Campo novo

O comando de Produto recebe:

```ts
type ProductKind = "resale" | "digital";
```

O estado inicial ainda não escolhe um tipo. O usuário precisa selecionar uma
das opções antes de avançar:

- `Produto para revenda`;
- `Produto digital`.

O controle deve ser um grupo de opções semântico, operável por teclado e com
erro anunciado por `aria-describedby` e `role="alert"`.

### 5.2 Custo por cenário

Para Revenda, a pergunta principal permanece equivalente a `Quanto você paga
ao fornecedor por unidade?`. O custo é opcional e vazio significa zero.

Para Produto digital, a pergunta será equivalente a `Existe algum gasto a cada
venda?`. O valor começa vazio, significa zero e continua editável. A ajuda
clicável explica que podem existir licença, plataforma, entrega ou outra
cobrança que só acontece quando uma venda é feita.

Ao alternar entre os tipos:

- o valor de custo já digitado é preservado;
- rótulo, descrição e exemplos são atualizados;
- erros relativos ao tipo são limpos quando uma opção válida é escolhida;
- erros relativos ao valor permanecem até o valor ser corrigido.

A revisão mostra `Produto para revenda` ou `Produto digital` e apresenta o
custo como `Sem custo por venda` quando o valor normalizado for zero.

### 5.3 Cenário do relatório

Novos relatórios de Produto usam:

- `resale` para Produto para revenda;
- `digital` para Produto digital.

O cabeçalho, o resumo e as seções devem usar o cenário persistido. O cenário
digital não deve ser apresentado como revenda e não deve mencionar fornecedor
ou custo de compra.

## 6. Cálculo financeiro

### 6.1 Variáveis

Para as fórmulas abaixo:

- `P`: preço atual por unidade;
- `CD`: custo direto por unidade, de compra ou de fabricação;
- `CF`: gastos que existem todo mês;
- `RT`: valor que o usuário quer receber por mês, quando incluído;
- `GM = CF + RT`: total de gastos mensais considerados;
- `Q_original`: quantidade mensal informada, positiva ou `null`;
- `Q = Q_original ?? 0`: quantidade usada no resultado mensal;
- `T`: soma das porcentagens de imposto e cartão;
- `RL`: valor recebido por unidade depois de imposto e cartão;
- `SV`: valor que uma venda deixa para pagar os gastos mensais;
- `RM`: resultado do mês;
- `F`: faixa interna de atenção de 20%.

Todos os valores monetários permanecem em centavos e os percentuais em pontos
base. As operações usam aritmética inteira e arredondam apenas o resultado
final de cada fórmula.

### 6.2 Valor de uma venda

```text
RL = arredondar(P × (1 - T))
SV = RL - CD
```

`SV` pode ser negativo, zero ou positivo. Ele não é apresentado ao usuário
como `receita líquida` nem `margem de contribuição`.

### 6.3 Resultado do mês

```text
RM = (SV × Q) - GM
```

Quando `Q_original` for `null`, o snapshot preserva `null`, mas `Q` vale zero.
Nesse caso:

```text
RM = -GM
```

Isso representa o resultado do mês sem vendas, não uma tentativa de dividir os
gastos mensais por zero.

O snapshot novo registra separadamente:

- `monthlySalesVolumeUsed`, sempre inteiro não negativo;
- `monthlyGrossRevenueCents`;
- `monthlyNetRevenueCents`;
- `monthlyResultCents`.

### 6.4 Resultado por unidade

Quando `Q > 0`:

```text
parte dos gastos mensais por unidade = teto(GM ÷ Q)
custo total por unidade = CD + parte dos gastos mensais por unidade
resultado por unidade = RL - custo total por unidade
```

Quando `Q = 0`, os três resultados que dependem da divisão por unidade
permanecem `null`. O relatório mostra `SV` como o valor que uma futura venda
deixaria para pagar os gastos mensais, sem chamá-lo de lucro final.

### 6.5 Quanto sobra a cada R$ 100

Quando `Q > 0` e `P × Q > 0`:

```text
quanto sobra a cada R$ 100 = RM ÷ (P × Q)
```

Quando `Q = 0`, esse percentual fica indisponível. O relatório não inventa uma
margem mensal sem vendas.

Os 20% permanecem somente como `F`, uma faixa interna para diferenciar margem
apertada de lucro. A ajuda deve declarar que essa faixa é um alerta do Lucrivo,
não uma margem ideal para todo negócio.

### 6.6 Menor preço sem prejuízo

Considere:

```text
taxa líquida = 1 - T
```

Quando `Q > 0`:

```text
menor preço = teto((CD + teto(GM ÷ Q)) ÷ taxa líquida)
```

Quando `Q = 0`:

```text
menor preço direto = teto(CD ÷ taxa líquida)
```

O menor preço direto impede perda causada pela própria venda, mas não promete
pagar os gastos mensais. O card e o popover devem informar essa limitação e
apontar a quantidade necessária como a referência que paga os gastos mensais.

Se a taxa líquida for menor ou igual a zero, o menor preço fica indisponível.
O texto explica que imposto e cartão consomem todo o preço informado e orienta
o usuário a revisar essas porcentagens.

Um menor preço de `R$ 0,00` é válido quando custo direto, gastos mensais
distribuídos e taxas permitem esse resultado. Zero não deve ser confundido com
ausência de dados.

### 6.7 Quantidade necessária

Quando `SV > 0`:

```text
quantidade mensal necessária = teto(GM ÷ SV)
quantidade semanal = teto(quantidade mensal × 100 ÷ 433)
quantidade diária = teto(quantidade semanal ÷ 6)
```

Se `GM = 0`, a quantidade necessária para pagar os gastos mensais é zero. O
texto explica que a primeira venda positiva já começa a deixar dinheiro.

Quando `SV <= 0`, nenhuma quantidade paga os gastos mensais. O relatório
orienta a corrigir preço, custo direto ou taxas antes de buscar mais vendas.

### 6.8 Desconto

O simulador continua limitado de 0% a 50%. Ele deve aceitar menor preço igual a
zero e só ficar indisponível quando faltar um valor realmente necessário.

Com `Q > 0`, o simulador usa o custo total por unidade. Com `Q = 0`, usa o
custo direto e identifica a simulação como anterior aos gastos mensais.

Quando o limite matemático de desconto ultrapassar 50%, a interface não chama
50% de limite absoluto. Ela informa que todos os descontos disponíveis no
simulador permanecem sem prejuízo direto.

## 7. Estados e prioridades

A classificação nova segue esta ordem:

1. Se `SV <= 0`, a venda não deixa dinheiro para pagar os gastos mensais:
   `direct_loss`.
2. Se `Q = 0` e `GM > 0`, o mês termina em prejuízo por ausência de vendas:
   `operational_loss`.
3. Se `Q = 0` e `GM = 0`, não há movimento no mês: `no_sales`.
4. Se `Q > 0` e `RM < 0`, o mês termina em prejuízo: `operational_loss`.
5. Se `Q > 0` e `RM = 0`, o mês apenas paga os gastos: `break_even`.
6. Se `Q > 0`, `RM > 0` e a sobra for menor que 20%, o resultado é
   `tight_margin`.
7. Se `Q > 0`, `RM > 0` e a sobra for igual ou maior que 20%, o resultado é
   `adequate_margin`.

`above_target` continua aceito para snapshots antigos, mas não é produzido
pelo cálculo `2`. `incomplete_volume` também continua legível nos contratos
antigos, mas não é produzido quando a ausência de quantidade passa a valer
zero vendas.

A prioridade continua determinística:

| Estado                         | Prioridade principal                                        |
| ------------------------------ | ----------------------------------------------------------- |
| Venda não deixa dinheiro       | Corrigir custo direto, taxas ou preço antes de vender mais. |
| Zero vendas com gastos mensais | Alcançar a quantidade mensal calculada.                     |
| Zero vendas sem gastos mensais | Realizar e acompanhar as primeiras vendas.                  |
| Prejuízo mensal com vendas     | Rever preço, gastos mensais e quantidade vendida.           |
| Resultado no limite            | Criar uma pequena folga entre preço e gastos.               |
| Margem apertada                | Rever preço e gastos em conjunto.                           |
| Lucro                          | Manter a quantidade e acompanhar a aceitação do preço.      |

As mensagens de `Comece por aqui` usam o vocabulário do cenário. Produção fala
em custo de fabricação; Revenda fala em custo do produto ou custo de compra;
Produto digital fala em custo por venda.

## 8. Conteúdo e hierarquia

### 8.1 Resumo executivo

O primeiro bloco responde nesta ordem:

1. situação do mês;
2. resultado mensal em reais;
3. quanto o usuário cobra e qual referência de preço se aplica;
4. primeira ação;
5. respostas diretas sobre lucro, preço e próximo passo.

Os títulos são específicos:

- `Seu produto para revenda dá lucro?`;
- `Seu produto digital dá lucro?`;
- `Sua produção dá lucro?`.

Os rótulos visíveis de situação serão:

- `Prejuízo por venda`;
- `Prejuízo no mês`;
- `Sem vendas no mês`;
- `No limite`;
- `Margem apertada`;
- `Lucro`.

O resumo não usa `meta alcançada`, `acima da meta` nem `abaixo da meta`.

### 8.2 Números principais

Os novos contratos mostram:

- `Preço atual`;
- `Menor preço sem prejuízo` ou `Menor preço antes dos gastos mensais`;
- `Quanto sobra a cada R$ 100`;
- `Resultado do mês`;
- `Vendas necessárias no mês`.

Quando um número não se aplica, o rótulo permanece e o valor explica o estado,
por exemplo `Sem vendas para calcular`. Zero deve ser formatado como valor
válido, nunca como `Indisponível`.

### 8.3 Seções detalhadas

Os novos snapshots persistem quatro seções narrativas e a entrada do simulador:

1. `Seu menor preço sem prejuízo`;
2. `O que sai de cada venda`;
3. `Quanto sobra no mês`;
4. `Quanto você precisa vender`;
5. `Como um desconto muda o resultado`.

`O que sai de cada venda` apresenta, conforme os dados disponíveis:

- custo de compra, custo por venda digital ou custo de fabricação;
- valor aproximado de imposto e cartão no preço atual;
- parte dos gastos mensais por unidade, somente quando `Q > 0`;
- valor que resta depois desses gastos.

Quando `Q = 0`, a seção mostra os valores diretos conhecidos e mantém os gastos
mensais como total mensal. Ela não os transforma em custo unitário.

### 8.4 Vocabulário proibido no conteúdo principal

Os textos novos de Produto e Produção não usam como mensagem principal:

- `ponto de equilíbrio`;
- `pró-labore`;
- `alíquota`;
- `rateio`;
- `receita líquida`;
- `margem de contribuição`;
- `preço-alvo`;
- `custo operacional`;
- `meta de 20%`;
- `margem ideal`.

Identificadores técnicos internos continuam em inglês e podem manter nomes já
estabelecidos. Um termo técnico só pode aparecer dentro de ajuda acessível,
depois da explicação em linguagem comum, quando ele realmente ajudar o usuário.

## 9. Popovers de detalhes

O componente `PlainLanguageHelp` existente será reutilizado. Os gatilhos devem
continuar como botões operáveis por clique, toque e teclado, com foco gerenciado
e fechamento por `Escape`.

Os novos relatórios usam ajuda nos seguintes pontos:

### 9.1 Menor preço sem prejuízo

Explica quais valores entraram no cálculo. Quando `Q = 0`, informa que o valor
cobre apenas o custo direto e as taxas da venda; os gastos mensais dependem da
quantidade mostrada pelo relatório.

### 9.2 Quanto sobra a cada R$ 100

Explica que o valor considera o resultado do mês dividido pelas vendas do mês.
Também explica que menos de R$ 20 a cada R$ 100 é uma faixa interna de atenção,
não uma recomendação universal de margem.

### 9.3 Gastos mensais com zero vendas

Explica por que não é possível atribuir um valor por unidade sem uma quantidade
de vendas. Declara que o resultado mensal usa zero vendas e conserva os gastos
mensais integralmente.

### 9.4 Custo de Produto digital

Explica que um produto digital pode não ter custo direto, mas pode ter
plataforma, licença, entrega ou outra cobrança por venda. A ajuda aparece no
formulário; o relatório só a repete quando o custo informado for zero e a
explicação for relevante para a leitura.

Não serão criados popovers para repetir textos já evidentes no card.

## 10. Persistência e segurança

### 10.1 Banco de dados

`product_diagnoses` recebe `product_kind text null`. A coluna permanece
opcional para não alterar registros antigos e possui uma restrição que aceita
somente `resale` ou `digital` quando preenchida.

Novos diagnósticos de Produto exigem `product_kind` válido no contrato
transacional. A coluna `diagnoses.scenario` e o snapshot recebem o mesmo valor.
As restrições de cenário que hoje aceitam apenas `resale` para Produto devem
passar a aceitar `digital` para os novos contratos.

`monthly_sales_volume` continua `null` ou maior que zero. Não será gravado zero
nessa coluna quando o usuário omitir a resposta. O zero interpretado fica no
campo `monthlySalesVolumeUsed` do snapshot.

Produção não recebe uma nova resposta de formulário, mas usa um contrato novo
para validar e persistir seu snapshot `2/2/3`.

### 10.2 Funções transacionais

Serão criados contratos aditivos:

- `public.create_product_diagnosis_report_v2`;
- `public.create_production_diagnosis_report_v2`.

Cada wrapper usa `security invoker` e chama uma implementação no schema
`private`. As funções atuais permanecem disponíveis para clientes durante uma
implantação gradual.

As implementações novas:

- exigem `auth.uid()`;
- validam o conjunto exato de versões;
- validam categoria, cenário, unidade, entradas e resultados principais contra
  o JSON recebido;
- preservam a idempotência por usuário e `submissionId`;
- preservam a regra de um relatório gratuito e a verificação de acesso pago;
- gravam diagnóstico, detalhe e snapshot na mesma transação;
- rejeitam reutilização do identificador em outra categoria ou cenário;
- mantêm RLS e propriedade por usuário.

Execução dos wrappers públicos será revogada de `public`, `anon` e
`service_role` e concedida somente a `authenticated`. As implementações
privadas não serão expostas como API pública.

Antes de escrever SQL, a implementação deve consultar o changelog do Supabase,
a documentação atual pertinente e as regras do projeto para migrations
imperativas. A migração será criada pela CLI instalada, não por nome inventado.

## 11. Compatibilidade

- Relatórios salvos preservam seus textos e números originais.
- Schemas de runtime aceitam contratos antigos e novos como união discriminada.
- O presenter só ativa a nova linguagem em Produto e Produção `2/2/3`.
- A listagem reconhece `digital` e mostra `Produto digital`.
- O simulador antigo mantém sua linguagem e comportamento versionados.
- Seeds antigos continuam válidos; novos exemplos cobrem Revenda, Produto
  digital e Produção na versão atual.
- Nenhuma mudança depende de editar JSON histórico no banco.

## 12. Tratamento de erros e limites

- Tipo de Produto ausente volta o usuário ao primeiro controle inválido.
- Falha de submissão preserva todas as respostas e permite nova tentativa com o
  mesmo `submissionId`.
- Sessão expirada mantém o tratamento já usado pelos demais diagnósticos.
- Soma de imposto e cartão que elimina o valor disponível para custos torna as
  referências de preço indisponíveis e gera orientação específica.
- Valores monetários iguais a zero permanecem distinguíveis de valores ausentes.
- Operações que ultrapassarem os limites seguros de inteiro são rejeitadas pela
  validação antes da persistência.
- Nenhum texto afirma conhecer preço de mercado, margem ideal ou aceitação dos
  clientes como fato.

## 13. Testes e verificação

### 13.1 Domínio

- Tabela de classificação para todos os estados novos.
- Quantidade ausente interpretada como zero sem perder o `null` original.
- Resultado mensal com zero vendas e gastos mensais positivos ou iguais a zero.
- Resultado mensal negativo, zero, margem apertada e lucro.
- Limite exato da faixa interna de 20%.
- Custo direto zero com combinações de gastos e taxas.
- Menor preço zero tratado como valor válido.
- Taxas totais iguais ou superiores a 100%.
- Quantidades mensal, semanal e diária com arredondamento para cima.
- Simulador parcial e completo, inclusive quando o limite supera 50%.

### 13.2 Conteúdo

- Revenda menciona compra ou fornecedor e não fabricação.
- Produto digital menciona custo por venda e não fornecedor.
- Produção menciona fabricação e unidades vendidas, não unidades apenas
  produzidas.
- Cada situação apresenta conclusão, consequência e próxima ação coerentes.
- Detector mecânico garante ausência dos termos proibidos no conteúdo principal
  dos novos contratos.
- Popovers apresentam conteúdo complementar e não repetem o card.

### 13.3 Interface

- Escolha do tipo de Produto por mouse e teclado.
- Rótulo de custo muda sem apagar o valor digitado.
- Erros são associados ao controle correspondente e anunciados.
- Revisão distingue Revenda e Produto digital.
- Valores zero aparecem como `R$ 0,00`.
- Relatórios antigos e novos usam apresentações distintas.
- Leitura em celular e desktop, temas claro e escuro e zoom de 200%.

### 13.4 Banco

- Restrição de `product_kind`.
- Correspondência entre tipo, cenário, argumentos, detalhe e snapshot.
- Escrita exclusiva dos contratos `2/2/3` pelas funções novas.
- Rejeição de versões, categorias, cenários e snapshots divergentes.
- Autenticação, propriedade, RLS, permissões e idempotência.
- Preservação da regra de acesso gratuito ou pago.
- Leitura dos contratos antigos.

### 13.5 Verificação final

- Testes Vitest direcionados durante TDD.
- Suíte Vitest completa, tipos, lint e formatação.
- Reconstrução do banco local e suíte pgTAP.
- Lint e advisors do Supabase.
- Geração dos tipos TypeScript do banco e segunda geração sem diff.
- Build otimizado com a configuração local segura descrita no README.
- Detector mecânico do Impeccable nos arquivos de interface alterados.
- Uma inspeção visual agrupada em desktop e celular, seguida de no máximo uma
  rodada de correção e confirmação.

## 14. Critérios de aceite

- O usuário escolhe Produto para revenda ou Produto digital antes de continuar.
- Produto digital aceita custo por venda vazio, zero ou positivo.
- Custo zero não quebra cards, referências nem simulador.
- Quantidade mensal vazia produz um resultado baseado em zero vendas.
- Gastos mensais nunca são descartados do resultado do mês.
- O relatório não divide gastos mensais por zero nem apresenta essa divisão
  como custo por unidade.
- A quantidade mínima mostra como pagar os gastos mensais quando cada venda
  deixa valor positivo.
- Os 20% aparecem apenas na explicação da faixa interna de atenção.
- Nenhum texto novo trata 20% como meta obrigatória ou preço recomendado.
- Revenda, Produto digital e Produção usam vocabulário inequívoco e próprio.
- Popovers explicam detalhes necessários por clique, toque e teclado.
- Relatórios antigos permanecem legíveis e imutáveis.
- Novos relatórios são persistidos de forma autenticada, idempotente e
  compatível com as regras de acesso atuais.
