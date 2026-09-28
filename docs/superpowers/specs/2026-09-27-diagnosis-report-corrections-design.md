# Correções do diagnóstico detalhado e dos relatórios

**Data:** 2026-09-27

**Status:** Aprovado

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/DETAILED-DIAGNOSIS.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-24-detailed-diagnosis-quick-alignment-design.md`
- `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`

## 1. Objetivo

Corrigir a primeira etapa de inconsistências encontradas entre os diagnósticos
rápido e detalhado e tornar o relatório mais seguro e acionável. A entrega:

- adiciona Produto digital ao diagnóstico detalhado;
- torna o custo resumido o padrão da Produção detalhada;
- destaca quantas unidades precisam ser vendidas para cobrir os gastos;
- corrige a substituição de um relatório detalhado já criado;
- reorganiza o cartão `Itens do diagnóstico`;
- exige confirmação antes de remover itens e ingredientes;
- melhora a aparência e a explicação das ações destrutivas.

A implementação preservará relatórios detalhados existentes e não permitirá
misturar Revenda e Produto digital no mesmo diagnóstico.

## 2. Decisão de arquitetura

A mudança ampliará o contrato detalhado atual de forma compatível. Um
diagnóstico detalhado de Produto terá um único cenário:

- `resale`, apresentado como `Produto para revenda`; ou
- `digital`, apresentado como `Produto digital`.

Todos os itens do diagnóstico usarão o cenário escolhido. O cenário será
derivado do tipo dos itens e persistido no campo já existente de cenário do
relatório. Não será criado um novo modo misto, uma nova categoria ou uma nova
versão incompatível do snapshot apenas para essa extensão.

Relatórios detalhados de Revenda já salvos continuarão válidos. O schema
aceitará o novo cenário e continuará recalculando e validando os resultados a
partir das entradas normalizadas.

Foram descartadas estas alternativas:

- permitir que cada item escolha independentemente entre Revenda e Digital,
  pois isso tornaria a identidade, os textos e a edição do relatório ambíguos;
- reiniciar os relatórios detalhados ou substituir o contrato atual por uma
  versão incompatível, pois a extensão pode preservar os snapshots existentes;
- unificar os motores rápido e detalhado, pois o detalhado continua tendo
  regras próprias para vários itens.

## 3. Produto digital no diagnóstico detalhado

### 3.1 Fluxo de criação

Depois de escolher Produto e `Diagnóstico detalhado`, a pessoa escolherá
`Produto para revenda` ou `Produto digital` antes de cadastrar o primeiro item.
A escolha será única para todo o diagnóstico e será preservada ao voltar entre
as etapas.

Os controles, rótulos e textos de ajuda serão compartilhados com o diagnóstico
rápido sempre que representarem a mesma informação.

Para Revenda, cada item continuará solicitando:

- valor pago ao fornecedor por unidade;
- preço de venda;
- embalagem por unidade.

Para Produto digital, cada item solicitará:

- gasto direto a cada venda, opcional;
- preço de venda.

Produto digital não exibirá embalagem. Internamente, o campo já usado para o
custo direto continuará sendo normalizado para zero quando estiver vazio. O
campo técnico de embalagem permanecerá com zero no contrato para manter a
compatibilidade estrutural, mas não participará do formulário nem do custo do
cenário digital.

Adicionar itens manterá o cenário do diagnóstico. O schema recusará uma lista
em que um item tenha tipo diferente dos demais.

### 3.2 Edição e relatório

Assim como no editor rápido atual, o cenário original não será trocado dentro
do editor de um relatório salvo. O editor mostrará a identidade correta e
usará os textos correspondentes:

- Revenda fala em fornecedor, compra e embalagem;
- Digital fala em custo por venda, plataforma, licença ou entrega digital;
- Digital não menciona fornecedor, compra física, embalagem ou fabricação.

A biblioteca e o cabeçalho do relatório usarão `Produto digital` quando esse
for o cenário persistido.

### 3.3 Persistência

A tabela de itens detalhados passará a aceitar `digital` no tipo do item. A
constraint de formato permitirá ao item digital os campos de custo direto já
usados por Produto e impedirá campos exclusivos de Produção.

A função de criação deixará de inferir automaticamente `resale` apenas pela
categoria `product`. Ela validará que:

- Produto usa exclusivamente `resale` ou exclusivamente `digital`;
- Produção usa exclusivamente `manufacturing`;
- o cenário do snapshot corresponde aos tipos dos itens;
- os itens persistidos correspondem às entradas e aos resultados validados.

As assinaturas públicas dos RPCs permanecerão inalteradas.

## 4. Padrão de custo da Produção

Um novo item de Produção detalhada começará com `Custo total por unidade`
selecionado. A pessoa ainda poderá escolher `Ficha técnica completa`.

O novo padrão valerá para o primeiro item e para itens adicionais. Relatórios
salvos manterão o modo de custo registrado; abrir um relatório com ficha
técnica no editor não o converterá para custo resumido.

## 5. Quantidade necessária de vendas

### 5.1 Situação atual

Os relatórios rápidos atuais já calculam uma meta mensal exata para Produto e
Produção:

```text
meta mensal = teto(gastos fixos efetivos / contribuição por unidade)
```

Ela aparece em `Seus números` como `Vendas necessárias no mês`. O valor usa
cor e tamanho de destaque, mas permanece no fim da lista e não possui uma
superfície visual própria.

O relatório detalhado não possui uma quantidade total. Ele mostra apenas o
faturamento necessário para cobrir os gastos, porque os itens podem deixar
valores diferentes a cada venda.

### 5.2 Decisão para o relatório rápido

A entrada de chave `sales` será apresentada no início de `Seus números` em uma
superfície destacada. Produto usará `vendas`; Produção usará `unidades`; Serviço
manterá sua unidade própria.

Referências semanal e diária continuarão aparecendo quando puderem ser
calculadas. O destaque não duplicará a mesma meta no resumo executivo.

### 5.3 Decisão para o relatório detalhado

Quando todos os volumes forem conhecidos e o conjunto tiver contribuição
positiva, o relatório calculará quantas unidades seriam necessárias mantendo a
mesma proporção entre os itens informados.

Se:

- `F` é o total de gastos fixos mensais e pró-labore;
- `V` é a soma das unidades mensais informadas;
- `C` é a contribuição mensal somada dos itens;

então:

```text
unidades necessárias = teto(F × V / C)
```

Essa fórmula escala proporcionalmente a combinação atual de itens. O texto de
apoio dirá: `Estimativa mantendo a mesma proporção de vendas entre os itens.`

A meta ficará indisponível quando:

- faltar o volume de qualquer item;
- o volume total for zero;
- a contribuição mensal total for zero ou negativa.

Nesses casos, a superfície permanecerá visível com uma explicação curta do
dado que falta ou da impossibilidade do cálculo. O sistema não apresentará uma
quantidade inventada nem tratará volume desconhecido como zero.

A referência mensal poderá ser convertida para semana usando o divisor 4,33 e
para dia usando seis dias de operação por semana, seguindo a política já
registrada no snapshot detalhado.

O cálculo será uma função determinística sobre as entradas e resultados já
persistidos. Não será necessário invalidar snapshots antigos para exibir a
nova referência.

## 6. Correção da edição de relatório detalhado

### 6.1 Causa confirmada

O cliente envia corretamente a edição para `saveReportEdit`, a conta do caso
reproduzido possui acesso pago e o relatório está na versão atual.

A falha ocorre dentro de
`private.replace_owned_diagnosis_from_staged_v1_impl`. O fluxo cria um
diagnóstico temporário validado e, ao copiar sua linha de
`detailed_diagnoses` para o identificador original, mantém temporariamente a
linha de origem com o mesmo par `(user_id, submission_id)`. Isso viola a
constraint `detailed_diagnoses_user_submission_key` antes que a origem seja
removida.

### 6.2 Correção

A substituição continuará atômica e manterá a ordem consistente de bloqueio.
Depois de remover os filhos do destino e antes de inserir sua nova linha
detalhada, a implementação liberará temporariamente a chave de submissão da
linha staged. A nova linha do destino receberá explicitamente a submissão
validada do relatório staged.

Depois serão copiados itens e ingredientes, a árvore staged será removida e a
linha principal do destino será atualizada. Toda a operação continuará dentro
da mesma transação do RPC. Em qualquer erro, o Postgres reverterá o conjunto
inteiro.

A correção preservará:

- identificador e `created_at` do relatório original;
- incremento otimista de `version`;
- propriedade do relatório;
- snapshot, linhas normalizadas e submissão validados;
- exigência de acesso pago atual;
- remoção integral do registro temporário.

O tratamento do cliente continuará distinguindo plano necessário, conflito e
erro genérico. O `console.log(result)` temporário usado no diagnóstico será
removido depois que a regressão estiver coberta e o fluxo real passar.

## 7. Card `Itens do diagnóstico`

O cabeçalho de cada item do editor terá quatro regiões explícitas no desktop:

1. nome;
2. preço de venda;
3. custo direto calculado;
4. situação ou número de pendências.

O acionador do acordeão ocupará o espaço disponível e o botão de remoção ficará
em uma coluna própria. A grade declarará as quatro colunas; nenhum elemento
dependerá de uma coluna implícita.

No celular, nome, resumo financeiro e situação serão empilhados dentro do
acionador, enquanto expandir e remover continuam com alvos de toque separados.
Textos longos poderão truncar sem deslocar os controles. Nomes truncados e
ações representadas apenas por ícone terão tooltip acessível.

O card manterá nome, venda, custo e situação visíveis quando fechado. O
conteúdo aberto continuará agrupando os campos editáveis e preservará o foco
no primeiro erro.

## 8. Ações destrutivas

Todas as remoções persistentes ou que descartem um conjunto preenchido dentro
do escopo terão confirmação:

- item no editor do relatório;
- ingrediente no assistente detalhado;
- ingrediente no editor do relatório.

A remoção de item na revisão do assistente e a exclusão do relatório já usam
confirmação e serão preservadas. A exclusão administrativa de usuário também
já possui diálogo próprio e fica fora desta mudança.

Os botões de lixeira usarão um estilo neutro em repouso e destrutivo em hover,
foco e estado ativo. A cor não será a única indicação: rótulo acessível,
tooltip e diálogo nomearão a ação e o elemento afetado.

O diálogo informará o que será descartado, oferecerá `Cancelar` como ação
segura e usará `Remover item` ou `Remover ingrediente` como ação destrutiva.
Itens ou ingredientes que não podem ser removidos continuarão desabilitados e
explicarão o motivo por tooltip.

## 9. Erros, acessibilidade e responsividade

- Controles novos terão rótulos semânticos e mensagens associadas por
  `aria-describedby`.
- Tooltips complementarão, mas não substituirão, nomes acessíveis.
- Diálogos devolverão o foco ao acionador quando cancelados.
- Confirmações funcionarão por teclado e não dependerão de hover.
- Estados destrutivos serão comunicados por texto, ícone e cor.
- O card será verificado nos tamanhos móvel e desktop.
- Uma falha ao salvar manterá todo o rascunho preenchido e exibirá uma ação
  clara para tentar novamente.

## 10. Organização da implementação

A entrega será dividida nestas responsabilidades:

1. **Tipo de Produto compartilhado:** controle e textos comuns ao rápido e ao
   detalhado.
2. **Estado e validação detalhados:** cenário único, itens digitais e padrão de
   custo resumido.
3. **Cálculo e apresentação:** meta rápida destacada e meta proporcional do
   detalhado.
4. **Persistência:** constraints para Digital e correção atômica da
   substituição staged.
5. **Componentes de segurança:** layout do card, tooltips, hover destrutivo e
   confirmações.

Refatorações que não servirem diretamente a essas responsabilidades ficam fora
do escopo.

## 11. Testes e verificação

### 11.1 Aplicação

- Estado inicial de Produção usa custo resumido no primeiro item e nos itens
  adicionais.
- Produto detalhado exige uma escolha entre Revenda e Digital.
- Todos os itens mantêm o cenário escolhido.
- Digital aceita custo vazio, zero ou positivo e não mostra embalagem.
- Textos de Digital não usam vocabulário de Revenda ou Produção.
- Snapshots detalhados antigos de Revenda continuam válidos.
- Biblioteca, relatório e editor reconhecem o cenário Digital.
- Meta detalhada calcula corretamente proporção, arredondamento para cima e
  indisponibilidades.
- `Seus números` destaca a meta sem duplicá-la no resumo.
- Card de item mantém as quatro regiões na mesma linha no desktop e uma ordem
  coerente no celular.
- Remover item ou ingrediente exige confirmação e cancelar preserva os dados.
- Teclado, foco, nomes acessíveis e mensagens de erro permanecem cobertos.

### 11.2 Banco

- Constraint aceita itens `digital` válidos e rejeita combinações de campos
  inválidas.
- RPC cria relatório detalhado Digital com cenário e itens coerentes.
- RPC rejeita mistura entre Revenda e Digital.
- Substituição detalhada reproduz o caso da chave única e passa após a
  correção.
- A substituição preserva identificador e criação, incrementa versão, copia
  filhos e remove o staged.
- Plano pago continua obrigatório e conflitos de versão continuam recusados.

### 11.3 Comandos finais

- testes Vitest direcionados;
- teste pgTAP da criação detalhada e do ciclo de vida;
- suíte completa;
- typecheck;
- lint;
- verificação de formatação;
- detector mecânico da skill de interface nos arquivos alterados;
- uma inspeção visual conjunta em desktop e celular, seguida de no máximo uma
  rodada de confirmação.

## 12. Critérios de aceite

- A pessoa consegue criar, consultar e editar um detalhado inteiramente Digital.
- Produção abre em `Custo total por unidade`.
- A quantidade necessária recebe destaque e não promete precisão quando o
  detalhado não possui dados suficientes.
- Uma conta paga consegue substituir o relatório detalhado sem violação de
  chave única.
- O card de itens permanece alinhado com nomes e valores longos.
- Nenhum item ou ingrediente preenchido desaparece com um único clique
  acidental.
- Relatórios detalhados existentes de Revenda continuam legíveis.
