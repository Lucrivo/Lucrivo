# Experiência do diagnóstico e relatório detalhado

**Data:** 2026-09-19

**Status:** Aprovado para revisão e planejamento

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/DETAILED-DIAGNOSIS.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-17-detailed-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`

## 1. Objetivo

Tornar o diagnóstico detalhado mais fácil de preencher, revisar, editar e
interpretar sem exigir conhecimento financeiro. A experiência deve ajudar o
cliente a identificar rapidamente como está o negócio, onde agir primeiro e
quais itens ajudam ou prejudicam o resultado.

A entrega corrige a validação silenciosa do custo unitário de ingredientes,
reduz a carga visual da ficha técnica, recolhe os itens no editor de relatórios
e reorganiza o relatório detalhado com linguagem simples e divulgação
progressiva.

O desktop é o principal contexto de uso e deve aproveitar a largura disponível
para comparação, resumo e edição. O celular continua sendo um fluxo completo,
sem perda de informação, ações ou acessibilidade.

## 2. Escopo

### 2.1 Incluído

- Tratar o custo unitário vazio como inválido e mostrar a mensagem junto ao
  campo.
- Aceitar `0` quando o ingrediente realmente não possuir custo.
- Mostrar o erro de custo total da receita na própria seção de ingredientes.
- Pedir somente o nome ao iniciar um ingrediente.
- Preencher o nome inicial como `Ingrediente N` e selecionar o texto para
  substituição rápida.
- Usar o nome definido como título e identificador visual do ingrediente.
- Permitir renomear o ingrediente pelo próprio título.
- Recolher e expandir os dados de cada ingrediente.
- Iniciar todos os itens recolhidos ao editar um relatório detalhado.
- Mostrar no cabeçalho recolhido do item seu nome, situação, preço, custo e
  pendências.
- Reorganizar o relatório detalhado em conclusão, ação prioritária, números,
  comparação e detalhes.
- Traduzir termos financeiros visíveis para linguagem direta.
- Explicar conceitos necessários por popovers acessíveis.
- Melhorar hierarquia, estados, contraste semântico, densidade e comportamento
  responsivo do fluxo detalhado completo.
- Cobrir validação, interações por teclado, estados recolhidos e conteúdo com
  testes automatizados.
- Atualizar a documentação funcional do diagnóstico detalhado.

### 2.2 Excluído

- Alteração das fórmulas financeiras.
- Alteração dos dados persistidos ou das versões do snapshot detalhado.
- Mudança das regras de rendimento, perda, taxas, promoção ou volume mensal.
- Conversão automática de unidades de medida.
- Ordenação manual de itens ou ingredientes.
- Salvamento automático durante o preenchimento.
- Criação de um fluxo separado para celular.
- Redesenho dos diagnósticos rápidos.
- Novos gráficos ou comparações entre relatórios históricos.

## 3. Problema atual

### 3.1 Custo vazio aceito como zero

O parser decimal atual transforma texto vazio em zero. Por isso, a validação do
custo unitário aceita um campo visualmente vazio, apesar de a ficha técnica
exigir o preenchimento. A validação agregada pode emitir que o custo total dos
ingredientes precisa ser positivo, mas esse erro usa o caminho da coleção e não
é apresentado pela interface atual.

O resultado é um bloqueio sem explicação próxima ao campo. A correção precisa
distinguir explicitamente texto vazio do número `0` antes da conversão decimal.

### 3.2 Ingredientes sem identidade visual útil

Os cartões são chamados `Ingrediente 1`, `Ingrediente 2` e assim por diante,
mesmo depois de o cliente informar nomes como farinha ou chocolate. O nome é
apenas mais um campo dentro de um formulário extenso. Isso dificulta localizar,
revisar e corrigir o ingrediente certo.

O UUID continua sendo o identificador técnico estável. O nome passa a ser o
identificador apresentado ao cliente em títulos, ações e mensagens acessíveis.

### 3.3 Editor excessivamente alto

O editor detalhado abre simultaneamente todos os campos de todos os itens e
ingredientes. Relatórios com vários itens produzem uma página muito longa e
dificultam comparar o resumo com o item que está sendo editado.

### 3.4 Relatório orientado a termos

O relatório atual já possui cálculos e sinais corretos, mas distribui a atenção
entre várias métricas e usa termos como `margem de contribuição`, `preço de
equilíbrio` e `piso para promoção` como rótulos principais. O cliente precisa
interpretar o vocabulário antes de entender a decisão.

## 4. Princípios da solução

1. **Ação antes do detalhe:** conclusão e próxima ação aparecem antes das
   métricas e da memória de cálculo.
2. **Nome antes da ficha:** o ingrediente ganha identidade antes de receber os
   dados técnicos.
3. **Resumo antes da expansão:** itens e ingredientes recolhidos continuam
   úteis para localizar problemas.
4. **Linguagem cotidiana primeiro:** o termo técnico fica em uma explicação
   opcional quando ele for necessário.
5. **Uma regra em todos os lugares:** criação, edição e salvamento usam o mesmo
   schema e as mesmas mensagens.
6. **Desktop amplo, mobile completo:** o layout muda de composição, mantendo a
   mesma ordem de decisão e todas as capacidades.

## 5. Validação dos ingredientes

### 5.1 Custo unitário

O custo unitário continua obrigatório na ficha técnica. Texto vazio ou composto
apenas por espaços gera a mensagem:

> Informe o custo unitário. Se este ingrediente não tiver custo, digite 0.

O valor explícito `0` é válido. Valores negativos, formatos inválidos ou mais de
quatro casas decimais continuam inválidos. A mensagem de formato permanece
específica para esses casos.

Essa distinção acontece no schema, antes de `scaledInteger`, porque o conversor
decimal aceita vazio como zero para outros campos opcionais.

### 5.2 Custo total da receita

Uma ficha técnica com ingredientes preenchidos cujo custo calculado total seja
zero continua inválida. A mensagem agregada aparece acima da lista de
ingredientes e participa de `aria-describedby` ou de uma região de alerta
associada ao grupo:

> A receita precisa ter pelo menos um ingrediente com custo maior que zero.

O erro agregado não substitui os erros de cada campo. Ao avançar, o foco vai
para o primeiro custo vazio ou inválido; se todos os campos forem válidos e o
total continuar zero, vai para o alerta da seção.

## 6. Cadastro e edição de ingredientes

### 6.1 Entrada pelo nome

Ao clicar em `Adicionar ingrediente`, a seção apresenta uma linha compacta com:

- um campo `Nome do ingrediente` preenchido com `Ingrediente N`;
- o texto inicial selecionado quando o controle recebe foco;
- a ação principal `Continuar`;
- a ação secundária `Cancelar` para ingredientes recém-adicionados.

O primeiro ingrediente criado com um novo item segue a mesma entrada compacta.
Confirmar um nome vazio mantém a etapa aberta e mostra `Informe um nome.`. O
nome padrão é válido, mas a seleção automática incentiva sua substituição.

Cancelar remove somente o ingrediente que ainda está na etapa inicial. A ficha
técnica nunca pode terminar sem ingrediente: quando o cancelamento deixaria a
lista vazia, a seção volta ao estado de adicionar o primeiro ingrediente.

### 6.2 Cartão do ingrediente

Depois de continuar, o ingrediente vira um cartão recolhível. Seu cabeçalho
mostra:

- nome informado;
- resumo de quantidade e unidade quando disponíveis;
- estado `Preenchimento pendente` quando faltar dado obrigatório;
- ação de expandir ou recolher;
- remoção, respeitando o mínimo de um ingrediente.

O título é um botão de renomeação separado do acionador de expansão. Ao clicar,
ele vira um campo inline com `Salvar nome` e `Cancelar`. Renomear não altera o
UUID, a posição ou os demais dados.

O conteúdo expandido possui apenas três campos: `Quantidade usada`, `Unidade de
compra` e `Custo por unidade de compra`. Os rótulos deixam claro que quantidade
e custo devem usar a mesma unidade. O campo de nome deixa de ser repetido no
corpo.

Na criação, o cartão recém-confirmado abre para preenchimento. Ingredientes já
preenchidos podem iniciar recolhidos quando o usuário retorna à etapa. Na edição
de um relatório, todos iniciam recolhidos.

## 7. Editor do relatório detalhado

### 7.1 Itens recolhidos por padrão

Ao entrar em `Editar diagnóstico`, todos os itens começam recolhidos, inclusive
o primeiro. O usuário pode abrir ou fechar cada item independentemente. Abrir
um item não fecha os demais.

O cabeçalho de cada item mostra:

- nome;
- `Preço de venda`;
- `Custo por unidade`, quando a prévia válida o calcular;
- estado principal, como `Deixa valor por venda`, `Perda por venda` ou
  `Revise os campos`;
- quantidade de campos pendentes, quando existir.

O resumo usa a última prévia válida para valores financeiros. Pendências vêm da
validação atual e nunca são ocultadas por números antigos. Um item com erro usa
texto e ícone além da cor.

### 7.2 Expansão e foco

O editor reutiliza o `Accordion` acessível do projeto em modo de múltiplos itens
abertos. Os acionadores expõem nome e estado ao leitor de tela. Quando o cliente
tenta salvar com erros, o primeiro item inválido é aberto e o foco segue para o
primeiro campo inválido.

Adicionar um item cria e abre somente o novo item. Remover um item mantém os
demais estados de expansão. Ingredientes seguem a hierarquia definida na seção
6 dentro do item de produção.

### 7.3 Composição responsiva

Em telas largas, a área de edição mantém campos à esquerda e a prévia fixa à
direita. Dentro de um item expandido, campos relacionados usam duas colunas e
blocos de largura total separam ficha técnica e ingredientes. Os cabeçalhos
recolhidos distribuem nome, métricas e estado horizontalmente, sem depender de
truncamento para nomes comuns.

Em telas pequenas, o cabeçalho vira uma pilha curta: nome e estado primeiro,
resumo financeiro depois e ações ao final. Campos usam uma coluna, áreas de
toque possuem pelo menos 44 px e não existe rolagem horizontal.

## 8. Arquitetura de apresentação do relatório

### 8.1 Modelo de apresentação

Um apresentador específico converte `CurrentDetailedReportSnapshot` em um
modelo de leitura. Ele não recalcula valores e não altera o snapshot. O modelo
organiza:

- identidade e metadados;
- conclusão em linguagem direta;
- ação prioritária;
- números principais com rótulo, valor, tom e ajuda;
- comparação ordenada dos itens;
- resumo e detalhes de cada item;
- explicações dos termos financeiros.

Os componentes recebem esse modelo em vez de decidir linguagem e prioridade a
partir do snapshot em vários arquivos. Isso permite testar o conteúdo separado
do layout e mantém as fórmulas no domínio existente.

As orientações persistidas continuam disponíveis como evidência do snapshot.
O apresentador pode simplificar seus títulos e corpos para exibição usando
`key`, `tone` e `itemIds`, sem modificar o conteúdo armazenado ou suas versões.

### 8.2 Ordem de leitura

O relatório responde, nesta ordem:

1. **Como está meu negócio?** Conclusão direta e indicação de análise completa
   ou parcial.
2. **O que devo fazer primeiro?** Uma ação prioritária em destaque, derivada do
   veredito e da primeira orientação aplicável.
3. **Quais são os números principais?** Resultado mensal, faturamento e
   referência necessária para cobrir os gastos, quando disponíveis.
4. **Quais itens ajudam ou prejudicam?** Comparação visual e textual.
5. **Como cada item chegou a esse resultado?** Cartões e ficha técnica por
   divulgação progressiva.

### 8.3 Linguagem

Os rótulos principais usam:

- `Sobra por venda` em vez de destacar `contribuição unitária`;
- `Quanto sobra das vendas para pagar os gastos` para explicar margem de
  contribuição;
- `Menor preço sem prejuízo na venda` no lugar de `preço de equilíbrio`;
- `Menor preço para a promoção planejada` no lugar de `piso para promoção`;
- `Quanto sobrou ou faltou no mês` para contextualizar resultado mensal;
- `Quanto precisa vender para cobrir os gastos` para contextualizar faturamento
  de equilíbrio.

Termos técnicos necessários aparecem em `PlainLanguageHelp`, com explicação
curta e o campo opcional `Nome usado nos cálculos`. Popovers não contêm valores
essenciais nem ações exclusivas; o relatório continua compreensível sem
abri-los.

Valores indisponíveis deixam de aparecer apenas como `Indisponível`. O texto
explica o motivo, como `Informe as vendas mensais para calcular` ou `Não foi
possível calcular com estas taxas`.

### 8.4 Hierarquia visual

No desktop, conclusão e ação prioritária formam o primeiro bloco, acompanhadas
por um resumo financeiro lateral. A comparação aproveita a largura para alinhar
nome, estado e valor sem transformar todas as métricas em cartões concorrentes.

No celular, a ordem é conclusão, ação, números, comparação e detalhes. Cores
semânticas reforçam estados críticos, de atenção, informativos e positivos, mas
todo estado também possui texto e ícone. Fundos, bordas e tipografia seguem os
tokens atuais; a melhoria vem da hierarquia e da densidade, não de decoração.

Os detalhes de cada item e da produção começam recolhidos. Um resumo útil fica
visível no acionador para que o cliente escolha o que deseja investigar.

## 9. Componentes e responsabilidades

### 9.1 Fluxo de criação

- `detailed-diagnosis.schema.ts`: diferencia custo vazio, zero e formato
  inválido; mantém a regra agregada.
- `detailed-wizard-state.ts`: fornece nomes padrão e preserva dados ao
  adicionar, cancelar, remover ou renomear ingredientes.
- `ingredient-name-entry.tsx`: controla somente a entrada inicial do nome.
- `ingredient-card.tsx`: controla título, renomeação, expansão, resumo, campos e
  remoção.
- `ingredient-fields.tsx`: orquestra a coleção, o erro agregado e a ação de
  adicionar.

### 9.2 Edição

- `detailed-report-editor-fields.tsx`: orquestra dados gerais e a lista de itens
  recolhíveis.
- `detailed-editor-item.tsx`: apresenta resumo, pendências, expansão e remoção
  de um item.
- Os componentes de ingrediente do fluxo são reutilizados quando a interface de
  estado permitir; regras e textos permanecem compartilhados mesmo quando a
  ligação de estado exigir adaptadores distintos.
- `report-editor.tsx`: entrega a prévia detalhada e abre o primeiro item inválido
  em tentativas de salvamento.

### 9.3 Relatório

- `to-detailed-report-view-model.ts`: concentra linguagem, prioridade,
  indisponibilidade e ajuda contextual.
- `detailed-report-detail.tsx`: compõe a ordem de leitura.
- `detailed-business-summary.tsx`: mostra conclusão, ação prioritária e números
  principais.
- `detailed-item-breakdown.tsx`: compara itens com linguagem simples.
- `detailed-item-card.tsx`: mostra resumo recolhido e detalhes por item.
- `detailed-guidance-list.tsx`: apresenta ações secundárias sem competir com a
  prioridade principal.

Arquivos que crescerem além de uma responsabilidade são divididos durante a
implementação. Componentes compartilhados existentes, como `Accordion`,
`PlainLanguageHelp`, `Badge`, `Card` e campos do fluxo, são preferidos a novos
primitivos.

## 10. Acessibilidade e interação

- Expansão, renomeação, continuação, cancelamento e remoção funcionam por
  teclado.
- Título clicável e acionador de expansão são controles distintos, com nomes
  acessíveis explícitos.
- Erros usam `role="alert"`, `aria-invalid` e associação descritiva adequada.
- O foco vai para o primeiro campo inválido depois de avançar ou salvar.
- Estados não dependem somente de cor.
- Acionadores informam o estado expandido pelos atributos do primitivo de
  accordion.
- A ordem de tabulação acompanha a ordem visual em desktop e celular.
- A interface respeita movimento reduzido e não adiciona animações além das
  transições já usadas pelos componentes do projeto.

## 11. Testes e critérios de aceite

### 11.1 Validação

- Custo unitário `""` e espaços retornam a mensagem de obrigatoriedade.
- Custo unitário `"0"` passa na validação do campo.
- Uma receita composta somente por custos zero retorna o erro agregado.
- O erro agregado é visível e focalizável no fluxo.
- Criação e edição usam as mesmas mensagens.

### 11.2 Ingredientes

- O primeiro ingrediente e novos ingredientes começam pela entrada do nome.
- `Ingrediente N` aparece selecionável como valor inicial.
- Continuar cria o cartão com o nome no título e três campos técnicos.
- Cancelar não deixa uma ficha técnica vazia.
- Renomear muda título e nomes acessíveis sem mudar ID ou valores.
- Remoção respeita o mínimo de um ingrediente.

### 11.3 Editor

- Todos os itens existentes iniciam recolhidos.
- O cabeçalho mostra nome, situação, preço, custo e pendências aplicáveis.
- Vários itens podem permanecer expandidos.
- Adicionar item abre somente o novo.
- Salvar com erro abre o item correspondente e focaliza o campo.
- Desktop e celular mantêm todas as ações sem rolagem horizontal.

### 11.4 Relatório

- A conclusão e a ação prioritária aparecem antes das métricas secundárias.
- Relatórios completos, parciais, com perda direta e com margem positiva usam
  textos coerentes e estados explícitos.
- Conceitos financeiros possuem explicação em popover e rótulo cotidiano.
- Indisponibilidades informam a causa.
- Itens e detalhes de produção iniciam recolhidos e podem ser operados por
  teclado.
- Os valores apresentados permanecem idênticos ao snapshot de entrada.

### 11.5 Verificação final

- Testes focados de schema, reducer, etapas, editor, apresentador e relatório.
- Suíte completa Vitest.
- TypeScript, ESLint e Prettier.
- Build de produção com configuração válida de Turnstile.
- Detector de interface nos arquivos alterados.
- Inspeção do fluxo em viewport desktop amplo, desktop intermediário e celular.

## 12. Documentação

`docs/DETAILED-DIAGNOSIS.md` passa a registrar:

- custo unitário obrigatório com zero explícito permitido;
- entrada de ingrediente pelo nome;
- cartões recolhíveis e renomeação;
- divulgação progressiva do editor;
- ordem de leitura e linguagem do relatório.

`PRODUCT.md` não precisa mudar: seus princípios de clareza, ação, cálculo
determinístico, responsividade e acessibilidade já cobrem esta entrega.
