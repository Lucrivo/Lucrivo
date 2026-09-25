# Alinhamento do diagnóstico detalhado ao diagnóstico rápido

**Data:** 2026-09-24

**Status:** Aprovado em conversa; aguardando revisão do documento

**Documentos relacionados:**

- `docs/DETAILED-DIAGNOSIS.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-17-detailed-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-19-detailed-diagnosis-experience-design.md`
- `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`

## 1. Objetivo

Fazer o diagnóstico detalhado parecer uma continuação natural do diagnóstico
rápido. Campos, ordem de preenchimento, explicações e apresentação do resultado
devem ser iguais sempre que representam a mesma informação. O detalhado mantém
somente o que o diferencia: vários itens, custos mais completos e comparação
entre os itens.

A interface deve usar linguagem cotidiana. Termos financeiros só aparecem
quando forem necessários e acompanhados de uma explicação simples.

Este documento substitui decisões anteriores quando houver conflito sobre:

- a ordem das etapas do diagnóstico detalhado;
- o campo de margem para promoções;
- a estrutura inicial do relatório detalhado;
- a ordem de `Item por item` e `Comparação`;
- a abertura inicial dos itens no relatório;
- os nomes e selos exibidos na biblioteca de relatórios;
- a necessidade de preservar relatórios detalhados já salvos.

O diagnóstico rápido existente não terá seus textos, cálculos ou fluxo
alterados por esta entrega.

## 2. Decisão principal

A solução compartilhará partes visuais e explicações entre os dois
diagnósticos, sem transformar os dois cálculos em um único cálculo.

Isso permite que campos equivalentes tenham o mesmo nome, ajuda e
comportamento, enquanto o detalhado continua calculando vários itens e seus
custos próprios. Não será criada uma segunda cópia dos mesmos campos apenas
para que pareçam iguais.

Foram descartadas duas alternativas:

- manter os fluxos separados e apenas copiar a aparência, porque as duas
  experiências voltariam a divergir com facilidade;
- juntar completamente os diagnósticos rápido e detalhado, porque as regras de
  um item e de vários itens não representam exatamente o mesmo problema.

## 3. Escopo

### 3.1 Incluído

- Reordenar o preenchimento detalhado para acompanhar a sequência do rápido.
- Reutilizar rótulos, explicações, ajudas e controles sempre que os campos
  forem equivalentes.
- Manter nome, múltiplos itens, embalagem e ficha técnica como diferenças do
  detalhado.
- Remover o campo `Margem mínima para simular promoções` de criação, edição,
  salvamento e relatório.
- Aplicar internamente a mesma faixa de atenção de 20% usada pelo rápido.
- Substituir os cartões iniciais do relatório detalhado pela estrutura de
  conteúdo do relatório rápido, adaptada para vários itens.
- Levar a simulação de desconto para dentro de cada item.
- Colocar `Item por item` antes de `Comparação`.
- Abrir o primeiro item por padrão e dar mais destaque aos detalhes abertos.
- Remover a palavra `mix` dos textos apresentados ao usuário.
- Alinhar títulos, informações e situações da biblioteca ao padrão dos
  relatórios rápidos.
- Atualizar o editor de relatórios detalhados para usar os mesmos nomes e
  explicações do novo fluxo.
- Atualizar o contrato atual do detalhado e reiniciar os dados de
  desenvolvimento, sem criar compatibilidade para relatórios antigos.
- Cobrir o fluxo, os resultados, a persistência e a apresentação com testes.

### 3.2 Excluído

- Alterar o diagnóstico rápido.
- Criar diagnóstico detalhado para Serviço.
- Adicionar Produto digital ao diagnóstico detalhado.
- Dividir gastos mensais entre itens para fabricar um custo completo por
  unidade.
- Criar controle de estoque, catálogo ou fornecedores.
- Criar gráficos, comparação histórica ou exportação dedicada.
- Manter a leitura dos relatórios detalhados atuais do ambiente de
  desenvolvimento.
- Renomear identificadores internos que não aparecem para o usuário e não
  atrapalham a mudança.

## 4. Novo fluxo de preenchimento

A sequência será:

1. Escolher `Produto` ou `Produção`.
2. Escolher `Diagnóstico rápido` ou `Diagnóstico detalhado`.
3. Informar o nome do primeiro item.
4. Informar preço e custos do primeiro item usando a mesma experiência do
   rápido.
5. Informar os gastos mensais do negócio.
6. Informar a quantidade mensal do primeiro item.
7. Informar o valor mensal do trabalho do dono.
8. Informar imposto e taxa de cartão.
9. Revisar os itens e escolher entre adicionar outro ou concluir.
10. Revisar todos os dados e gerar o relatório.

Ao adicionar outro item, repetem-se apenas nome, preço, custos e quantidade
mensal. Gastos mensais, valor do trabalho do dono, imposto e cartão pertencem
ao negócio e não são solicitados novamente.

Na Produção, a escolha entre custo pronto e ficha técnica permanece dentro da
parte de custos do item. A ficha técnica continua permitindo ingredientes,
rendimento, perda, embalagem, trabalho direto e outros gastos variáveis.

Voltar entre etapas preserva exatamente o que já foi preenchido. Editar um
item não altera os demais. O diagnóstico continua exigindo ao menos um item.

## 5. Campos e linguagem

Campos equivalentes ao rápido devem usar os mesmos:

- rótulos;
- textos de apoio;
- exemplos;
- opções;
- mensagens de erro;
- ajudas abertas por ícone;
- regras de moeda, porcentagem e quantidade.

Quando a estrutura dos dados for diferente, uma adaptação ligará o mesmo
controle ao item correto do detalhado. A pessoa não deve perceber diferença de
comportamento causada apenas pela forma como os dados são guardados.

Os campos exclusivos do detalhado são:

- nome do item;
- lista com vários itens;
- embalagem do Produto, quando aplicável;
- ficha técnica completa da Produção;
- dados necessários para explicar e comparar cada item.

O campo `Margem mínima para simular promoções` será removido de todos os pontos
do produto. O usuário não precisará escolher uma regra financeira antes de ver
o resultado.

## 6. Estrutura do relatório

A página seguirá esta ordem:

1. Cabeçalho do relatório.
2. Resultado geral com o conteúdo do diagnóstico rápido adaptado.
3. `Item por item`.
4. `Comparação`.
5. Orientações adicionais.

### 6.1 Resultado geral

O bloco que hoje abre o relatório detalhado será substituído pela mesma ordem
de leitura do relatório rápido:

- resumo principal;
- resposta direta sobre a situação do negócio;
- resultado mensal;
- quanto sobra de cada R$ 100 vendidos;
- faturamento atual e quanto seria necessário para cobrir os gastos;
- prioridade recomendada;
- respostas para `Estou ganhando dinheiro?`, `Meus preços pagam os gastos?` e
  `O que preciso fazer agora?`;
- seção `Seus números`;
- seção `Entenda o resultado`.

Dentro de `Entenda o resultado`, o detalhado apresentará:

- os menores preços sem prejuízo, com os valores exatos em cada item;
- o que sai das vendas;
- quanto sobra ou falta no mês;
- quanto o negócio precisa vender.

Os textos atuais do relatório rápido serão preservados quando continuarem
verdadeiros. Somente referências a um único item e flexões de singular ou
plural poderão ser adaptadas. O relatório rápido em si não será reescrito.

A simulação de desconto, por depender de preço e custo individuais, ficará em
`Item por item` em vez de aparecer como um único simulador geral.

### 6.2 Item por item

O primeiro item começará aberto. Os demais começarão fechados e poderão ser
abertos independentemente.

O cabeçalho de cada item mostrará:

- nome;
- preço;
- situação;
- resultado mensal, quando estiver disponível.

O item aberto terá mais espaço, borda e fundo de destaque. A cor reforçará a
situação, mas texto e ícone também comunicarão o significado.

Os detalhes serão agrupados em:

- venda;
- gastos da venda;
- menor preço sem prejuízo;
- resultado mensal;
- simulação de desconto;
- ficha técnica, quando existir.

Cada item terá seu próprio simulador de desconto. O simulador mostrará o preço
com desconto, o que ainda sobra na venda e quando a venda passa a gerar perda.
Também chamará atenção para descontos acima de 20%, seguindo a regra implícita
do diagnóstico rápido.

Junto ao menor preço, o relatório explicará:

> Este valor cobre os gastos desta venda. Os gastos mensais são analisados no
> resultado geral.

Assim, o valor individual não será confundido com um preço que, sozinho,
garante o pagamento de todos os gastos do negócio.

### 6.3 Comparação e orientações

A comparação continuará reunindo os itens lado a lado, mas virá depois dos
detalhes individuais. Ela usará nomes e frases simples e não repetirá toda a
explicação já apresentada nos itens.

As orientações adicionais permanecem ao final para aprofundamento, sem
competir com a conclusão e a ação principal.

## 7. Resultados completos e incompletos

A quantidade mensal continua podendo ficar em branco. Vazio significa que a
pessoa ainda não sabe; zero significa que não houve vendas; um número positivo
significa a quantidade vendida.

Quando todos os itens tiverem quantidade conhecida, o relatório poderá mostrar
o resultado mensal completo do negócio.

Quando faltar a quantidade de pelo menos um item:

- preço, gastos da venda, menor preço e simulador continuam disponíveis para
  cada item que tiver dados suficientes;
- resultados mensais individuais aparecem somente para itens com quantidade
  conhecida;
- o relatório não apresenta um total mensal parcial como se fosse o resultado
  completo do negócio;
- números gerais que dependem de todas as quantidades são substituídos por uma
  explicação curta indicando o que falta;
- a situação permanece neutra quando a única pendência for a quantidade.

O sistema nunca transforma silenciosamente uma quantidade vazia em zero.

## 8. Regras dos cálculos

O diagnóstico rápido e o detalhado continuam com cálculos próprios. Partes
visuais compartilhadas recebem resultados já preparados e não escolhem nem
alteram regras financeiras.

Para cada item, o menor preço sem prejuízo considera os gastos próprios da
venda, como custo, embalagem, imposto e cartão. Os gastos mensais do negócio
são avaliados apenas no resultado geral e não serão divididos artificialmente
entre os itens.

A simulação de desconto combina duas verificações:

- se o preço com desconto ainda cobre os gastos daquela venda;
- se o desconto ultrapassa a faixa de atenção de 20%.

A faixa de 20% é uma regra do sistema, não uma resposta do usuário. Ela será
registrada no resultado para que a explicação continue ligada à regra usada na
geração do relatório.

Resultados gerais que dependem do peso de cada item nas vendas só serão
mostrados quando existirem dados suficientes. Não serão criadas estimativas
ocultas para preencher números ausentes.

## 9. Biblioteca de relatórios

Os cartões de relatórios detalhados seguirão a mesma linguagem visual dos
relatórios rápidos.

- Remover o selo `Diagnóstico detalhado`.
- Usar `Produto` ou `Produção` e a modalidade aplicável como identificação.
- Mostrar a situação do resultado com o mesmo padrão de selo do rápido.
- Mostrar a quantidade como texto auxiliar, por exemplo `3 itens analisados`.
- Usar `Análise de produtos` ou `Análise de produções` no lugar de
  `Resultado do mix`.

Não haverá um selo extra de preenchimento completo ou parcial. Quando faltarem
quantidades, a própria situação do resultado informará `Falta informar as
vendas` ou mensagem equivalente.

A palavra `mix` não aparecerá em fluxos, relatórios, biblioteca, ajudas ou
mensagens. Conforme o contexto, serão usados `resultado geral`, `todos os
itens`, `conjunto de itens` ou `comparação entre itens`.

## 10. Edição e tratamento de erros

O editor continuará sendo uma tela direta, sem transformar a edição em um novo
assistente passo a passo. Seus campos, porém, usarão os mesmos rótulos, ajudas e
mensagens do fluxo de criação.

Ao tentar avançar ou salvar:

- a mensagem aparece junto ao campo que precisa de correção;
- o primeiro item com erro é aberto;
- o foco segue para o primeiro campo inválido;
- os dados já preenchidos são preservados.

Se a geração ou o salvamento falhar, o formulário permanece preenchido e a
pessoa recebe uma ação clara para tentar novamente. Nenhum erro será indicado
somente por cor.

## 11. Organização interna

A implementação será separada em quatro responsabilidades:

1. **Campos compartilhados:** exibem os mesmos controles e explicações do
   rápido, aceitando a ligação necessária para cada formulário.
2. **Fluxo detalhado:** controla a sequência, o item atual, a revisão e a
   inclusão ou remoção de itens.
3. **Cálculos detalhados:** calculam os itens e o resultado geral sem depender
   dos componentes visuais.
4. **Apresentação do relatório:** transforma o resultado detalhado na mesma
   ordem de leitura do rápido e prepara os textos adaptados para vários itens.

O relatório reutilizará blocos visuais quando eles aceitarem os dois contextos
com clareza. Quando o significado for diferente, será criado um bloco próprio
com a mesma aparência, evitando condições difíceis de entender espalhadas por
um único componente.

## 12. Dados e transição

Como o sistema ainda não está em produção e não possui usuários, a mudança será
direta:

- o campo de margem promocional será removido da entrada, validação, estado,
  editor, envio, relatório e armazenamento;
- a regra interna de atenção de 20% substituirá o campo escolhido pelo usuário;
- o contrato atual do relatório detalhado será atualizado no lugar, sem criar
  uma segunda versão apenas para compatibilidade;
- a estrutura de desenvolvimento será reiniciada;
- relatórios detalhados atuais poderão ser descartados;
- os tipos usados pela aplicação serão atualizados depois da mudança.

Nenhuma limpeza de dados será executada como parte da documentação ou do
planejamento. A reinicialização acontecerá somente durante a implementação,
com o alvo conferido antes da execução.

## 13. Acessibilidade e telas

No computador, o relatório aproveitará a largura para separar resumo, números
e detalhes sem criar uma sequência excessiva de cartões. No celular, a mesma
ordem de leitura será mantida em uma coluna, sem esconder informações ou
ações.

Os itens poderão ser abertos por teclado. O controle informará se o conteúdo
está aberto ou fechado. Áreas de toque terão tamanho confortável, o foco será
visível e nenhum significado dependerá apenas da cor ou de uma ajuda aberta.

## 14. Verificação

A entrega deve comprovar:

- igualdade de rótulos, ajudas e comportamento dos campos compartilhados;
- funcionamento dos fluxos de Produto e Produção;
- funcionamento do custo pronto e da ficha técnica de Produção;
- inclusão, edição e remoção de vários itens;
- preservação dos dados ao voltar ou corrigir erros;
- ausência do campo de margem promocional em criação e edição;
- aplicação automática da faixa de atenção de 20%;
- cálculo separado do resultado de cada item e do resultado geral;
- comportamento correto quando a quantidade está vazia, zerada ou preenchida;
- nova ordem e conteúdo do relatório;
- primeiro item aberto e demais fechados;
- simulação independente de desconto em cada item;
- nova ordem da comparação;
- biblioteca alinhada ao rápido;
- ausência da palavra `mix` em qualquer texto visível;
- mensagens e foco corretos diante de erros;
- uso por teclado e leitura em telas grandes e pequenas;
- salvamento e leitura de um novo relatório após a reinicialização;
- ausência de regressões nos diagnósticos rápidos.

## 15. Critérios de conclusão

A mudança estará concluída quando uma pessoa puder alternar do diagnóstico
rápido para o detalhado e reconhecer os mesmos campos, explicações e ordem
mental; cadastrar vários itens sem repetir dados do negócio; entender primeiro
a situação geral e depois cada item; simular descontos sem configurar uma
margem; e localizar o relatório na biblioteca sem termos ou selos
inconsistentes.
