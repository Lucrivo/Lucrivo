# Regras de negócio — Diagnóstico detalhado do Lucrivo

## 1. Objetivo e escopo

O diagnóstico detalhado compara financeiramente um ou mais itens do mesmo negócio. Ele está disponível para **Produto** e **Produção**; Serviço continua somente com o diagnóstico rápido.

Neste recurso, o conjunto representa os itens analisados em um mesmo negócio. O Lucrivo **não** controla estoque físico, entradas e saídas, lotes, validade, reposição ou disponibilidade de mercadoria.

O cálculo é determinístico. A interface coleta as entradas, o servidor valida e normaliza os valores, calcula o resultado e salva um snapshot imutável. Não há cálculo financeiro feito pelo navegador para decidir o relatório final.

## 2. Entrada e categorias

Depois de escolher o que deseja analisar, o usuário seleciona uma modalidade:

- **Produto → Diagnóstico detalhado:** escolhe uma única vez entre itens de
  revenda e produtos digitais;
- **Produção → Diagnóstico detalhado:** cria itens fabricados começando pelo custo
  total por unidade, com ficha técnica completa como alternativa;
- **Serviço:** não exibe a modalidade detalhada.

Uma análise usa um único cenário em todos os itens. Produto não mistura Revenda e
Digital; Produção usa exclusivamente itens fabricados. A escolha é preservada ao
voltar entre as etapas e ao adicionar novos itens.

## 3. Jornada implementada

Depois da escolha de categoria e modalidade, Produto escolhe Revenda ou Digital
antes do primeiro item. Em seguida, o fluxo detalhado usa perguntas curtas; os
itens adicionais reutilizam somente os passos próprios do item e mantêm o cenário
escolhido.

```text
0. Produto: escolher Revenda ou Digital uma vez para todo o diagnóstico
1. nome do item
2. preço e custos do item
3. gastos mensais do negócio
4. vendas mensais do item
5. valor recebido pelo trabalho do dono
6. impostos e cartão/plataforma
7. revisar os itens
   +--> adicionar, editar ou solicitar remoção
   +--> itens adicionais repetem nome, preço/custos e vendas mensais
8. revisar e gerar o diagnóstico
```

Cada avanço valida somente os campos visíveis no passo atual. Erros aparecem junto ao campo. Se o servidor devolver um erro final, o fluxo retorna ao passo correspondente e move o foco para o primeiro campo inválido.

Durante a submissão, o botão fica bloqueado para impedir relatórios duplicados. Em caso de falha recuperável, as respostas permanecem preenchidas para nova tentativa.

## 4. Parâmetros comuns do negócio

### 4.1 Gastos fixos mensais

Representam aluguel, energia, sistemas, salários fixos e outros gastos que existem mesmo sem vendas. O valor é único para todo o diagnóstico.

### 4.2 Pró-labore

O pró-labore é perguntado separadamente dos gastos fixos. Quando ligado, entra integralmente no gasto mensal efetivo:

```text
gasto mensal efetivo = gastos fixos + pró-labore
```

Quando desligado, o valor considerado de pró-labore é zero. A mão de obra direta de uma produção é um custo variável por unidade e não substitui o pró-labore do dono.

### 4.3 Taxas e faixa interna de atenção

Imposto e taxa de cartão/plataforma são percentuais aplicados igualmente a todos os itens:

```text
taxa total = imposto + cartão
valor da taxa por unidade = preço de venda × taxa total
```

Não existe margem promocional escolhida pelo usuário. O relatório usa
internamente uma faixa de atenção de 20% para explicar a folga em simulações de
desconto. Essa faixa não é uma meta universal, não altera o preço informado e
não promete um preço de mercado.

## 5. Informações comuns de cada item

Todo item possui:

- identificador estável;
- posição no conjunto;
- nome obrigatório;
- preço de venda unitário positivo;
- volume mensal de vendas opcional.

O volume tem três estados:

- **vazio:** volume desconhecido; o resultado geral fica parcial;
- **zero:** mês conhecido sem vendas daquele item;
- **positivo:** quantidade conhecida de vendas mensais.

O sistema nunca preenche ou altera automaticamente o volume. A meta de equilíbrio é uma referência do relatório, não uma mutação da resposta do usuário.

## 6. Custos de Produto

### 6.1 Revenda

Para um item de revenda, o usuário informa:

- custo de compra por unidade;
- embalagem por unidade.

Campos opcionais vazios são normalizados para zero.

```text
custo variável unitário = custo de compra + embalagem
```

### 6.2 Produto digital

Para um item digital, o usuário informa o gasto direto a cada venda, como taxa de
plataforma, licença ou entrega digital. O campo é opcional e vazio é normalizado
para zero. Embalagem não aparece na interface e permanece igual a zero no
contrato persistido; campos de fabricação também não são aceitos.

```text
custo variável unitário = gasto direto por venda
```

## 7. Custos de Produção

Cada produção usa uma das duas formas de custo. Um item novo — inclusive um
item adicional — começa em **Custo total por unidade**; a escolha por ficha
técnica continua disponível e relatórios salvos preservam o modo registrado.

### 7.1 Custo resumido

O usuário informa um custo total positivo para a unidade pronta. Esse valor é usado como custo variável unitário.

### 7.2 Ficha técnica completa

A ficha técnica exige:

- ao menos um ingrediente;
- nome, quantidade, unidade de medida e custo unitário de cada ingrediente;
- rendimento inteiro maior que zero;
- perda entre 0% e menos de 100%;
- embalagem por unidade;
- mão de obra direta por unidade;
- outros custos variáveis por unidade.

O custo unitário de cada ingrediente é obrigatório. Digitar `0` declara
explicitamente que aquele ingrediente não tem custo; deixar o campo vazio não
tem o mesmo significado e impede o avanço.

O Lucrivo não converte unidades de medida. Quantidade e custo precisam usar a mesma unidade informada pelo usuário.

```text
custo dos ingredientes da receita = soma(quantidade × custo unitário)
custo de ingredientes por unidade vendável =
  custo dos ingredientes ÷ rendimento ÷ (1 - perda)

custo variável unitário =
  ingredientes por unidade vendável
  + embalagem
  + mão de obra direta
  + outros custos variáveis
```

A receita completa precisa ter ao menos um ingrediente com custo maior que
zero. Valores monetários são persistidos como inteiros escalados; os cálculos
não dependem de ponto flutuante do navegador.

## 8. Gerenciamento dos itens

Depois de preencher custos, o usuário revisa os itens cadastrados. Pode:

- adicionar outro item;
- editar um item preservando seus valores;
- solicitar a remoção de um item;
- confirmar ou cancelar a remoção em um diálogo;
- avançar para a revisão final.

Sempre deve existir ao menos um item. A remoção do único item fica desabilitada
e um tooltip explica o motivo. Ingredientes seguem a mesma regra: uma ficha
técnica mantém ao menos uma linha. Remover um item ou ingrediente preenchido
exige confirmação; cancelar preserva os dados e devolve o foco ao acionador.

Um novo ingrediente começa pela definição do nome, sugerido como
`Ingrediente N`. Depois da confirmação, esse nome vira o título editável do
cartão e os campos de quantidade, unidade e custo são revelados. Ingredientes e
itens usam divulgação progressiva para reduzir a rolagem sem ocultar
pendências.

## 9. Cálculo por item

Considere:

- **P** = preço de venda unitário;
- **CV** = custo variável unitário;
- **T** = imposto + cartão;
- **Q** = volume mensal conhecido;

```text
taxa por unidade = P × T
receita líquida unitária = P - taxa por unidade
contribuição unitária = receita líquida unitária - CV
margem de contribuição = contribuição unitária ÷ P
```

Um item tem perda direta quando a contribuição unitária é negativa. Nesse caso, vender mais amplia a perda antes mesmo dos gastos mensais.

Quando o volume é conhecido:

```text
receita mensal do item = P × Q
contribuição mensal do item = contribuição unitária × Q
```

Quando o volume está vazio, os dois valores mensais do item ficam indisponíveis.

### 9.1 Referências de preço

O relatório calcula uma referência de preço por item quando matematicamente possível:

- **menor preço sem prejuízo na venda:** cobre o custo variável e as taxas da
  própria venda, sem contribuição positiva.

Taxas que eliminem o denominador deixam a referência indisponível; o sistema
não inventa um valor. A referência e o simulador individual não rateiam os
gastos mensais: esses gastos permanecem no resultado geral do negócio.

## 10. Resultado geral

Se todos os volumes forem conhecidos:

```text
faturamento mensal = soma das receitas mensais
contribuição mensal = soma das contribuições mensais
resultado mensal = contribuição mensal - gasto mensal efetivo
margem final = resultado mensal ÷ faturamento mensal
faturamento de equilíbrio = gasto mensal efetivo ÷ margem de contribuição ponderada
```

A margem de contribuição do conjunto é ponderada pelo faturamento. Não é a média aritmética das margens individuais.

Se qualquer volume estiver vazio, o relatório é **parcial**:

- identifica nominalmente os itens pendentes;
- mantém custos, contribuição unitária, margens unitárias e preços de referência;
- deixa faturamento, contribuição, resultado, margem final e equilíbrio do conjunto indisponíveis;
- ordena a comparação pela posição original, e não por uma contribuição mensal inexistente.

Volume zero não torna o relatório parcial. Ele representa um mês conhecido sem vendas.

### 10.1 Quantidade necessária de vendas

Quando todos os volumes são conhecidos e a contribuição mensal total é positiva,
o relatório estima quantas unidades cobrem os gastos mantendo a proporção atual
entre os itens:

```text
quantidade necessária = teto(gasto mensal efetivo × volume total
  ÷ contribuição mensal total)
```

A referência informa que preserva a mesma proporção de vendas. Ela fica visível,
mas indisponível e acompanhada do motivo, quando falta o volume de algum item, o
volume total é zero ou a contribuição mensal total é zero ou negativa. O sistema
não inventa uma quantidade nem converte volume desconhecido em zero. Quando
disponível, as referências semanal e diária usam o divisor 4,33 e seis dias de
operação por semana.

## 11. Veredito, prioridade e orientações

O motor classifica o cenário com um veredito e uma prioridade entre custo, dados, preço, margem e volume. A ordem protege o negócio:

1. sinaliza itens com perda direta;
2. pede volumes ausentes;
3. verifica mês sem vendas ou perda operacional;
4. identifica equilíbrio ou margem apertada;
5. reconhece quando o conjunto de itens cobre os gastos com folga.

As orientações podem destacar:

- volumes ausentes;
- itens que não se pagam por venda;
- concentração da contribuição em um item;
- maior contribuição por unidade;
- item de alto volume com margem menor;
- resultado consolidado do negócio.

Cor nunca é a única forma de comunicar o estado. Alertas, valores negativos e positivos também aparecem em texto.

## 12. Revisão e relatório salvo

A revisão final lista todos os itens e avisa quando o resultado será parcial. Um volume ausente não impede a geração do relatório.

Ao confirmar, o servidor executa na ordem:

1. validação e normalização;
2. autenticação;
3. cálculo determinístico;
4. construção do snapshot versionado;
5. persistência atômica.

O registro principal, os itens, os ingredientes e o snapshot são gravados na mesma transação. Se uma parte falhar, nada é salvo. Repetir o mesmo identificador de submissão retorna o mesmo relatório, evitando duplicação.

O snapshot detalhado atual usa as versões `1/1/1` de schema, cálculo e conteúdo.
Clientes com plano pago podem editar relatórios compatíveis diretamente no
detalhe e acompanhar uma prévia determinística em tempo real. O editor preserva
o cenário salvo, inclusive Digital, e usa seus campos e textos específicos.

Ao salvar, a pessoa pode substituir o mesmo registro ou criar um novo relatório.
A substituição validada por staging ocorre em uma única transação: preserva o
identificador e a data de criação, incrementa a versão uma vez, copia snapshot e
linhas normalizadas e remove integralmente a árvore temporária. Ela não mantém
uma versão anterior oculta. A exclusão explícita é lógica.

No editor, todos os itens começam recolhidos. Mais de um item pode ser aberto ao
mesmo tempo, um item recém-adicionado abre automaticamente e uma tentativa de
salvar dados inválidos abre e leva o foco ao primeiro item com pendência. O card
fechado mantém nome, preço de venda, custo direto e situação em regiões
explícitas. Remover item ou ingrediente exige confirmação, e cancelar preserva o
rascunho.

Relatórios legados permanecem somente para leitura e seus snapshots não são recalculados com regras futuras. Um relatório gerado durante um período de assinatura continua acessível ao proprietário depois que esse período termina.

## 13. Biblioteca e detalhe do relatório

Na biblioteca, um diagnóstico detalhado usa o título **Análise de produtos** ou
**Análise de produções** e mostra categoria, cenário — incluindo **Produto
digital** —, veredito e a quantidade de itens analisados. Quando disponíveis,
também apresenta resultado mensal e
margem final. Relatórios parciais usam o veredito **Falta informar as vendas** e
não exibem um total mensal inventado. O conjunto não possui um único “preço
atual”.

O detalhe prioriza a decisão nesta ordem:

- resumo executivo com as três respostas principais;
- números gerais e as quatro análises persistidas;
- detalhes, simulador e memória de cálculo item por item;
- comparação entre itens;
- orientações adicionais.

A linguagem visível explica o efeito prático dos valores. Termos financeiros
são apresentados em ajudas contextuais quando necessários. O primeiro item do
relatório começa aberto no desktop e no celular; os demais começam recolhidos.
O gatilho de cada item mantém nome, preço, valor deixado no mês e estado
legíveis. No editor, todos os itens salvos continuam recolhidos até a interação
do usuário.

Em relatórios completos, a comparação é ordenada pela contribuição mensal. Em relatórios parciais, usa a posição cadastrada e compara contribuição unitária.

## 14. Limites desta entrega

Esta entrega não inclui:

- controle físico de estoque;
- mistura de Revenda, Digital ou Produção dentro do mesmo diagnóstico;
- diagnóstico detalhado de Serviço;
- interpretação ou controles de IA;
- geração de PDF;
- compartilhamento público;
- comparação entre relatórios históricos;
- convite pós-relatório para converter um diagnóstico rápido em detalhado.

Esses limites não alteram o cálculo nem a persistência dos relatórios detalhados implementados.
