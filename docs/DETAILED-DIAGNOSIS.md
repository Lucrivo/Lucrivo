# Regras de negócio — Diagnóstico detalhado do Lucrivo

## 1. Objetivo e escopo

O diagnóstico detalhado compara financeiramente um ou mais itens do mesmo negócio. Ele está disponível para **Produto** e **Produção**; Serviço continua somente com o diagnóstico rápido.

Neste recurso, “mix” ou “estoque” significa o conjunto de itens analisados. O Lucrivo **não** controla estoque físico, entradas e saídas, lotes, validade, reposição ou disponibilidade de mercadoria.

O cálculo é determinístico. A interface coleta as entradas, o servidor valida e normaliza os valores, calcula o resultado e salva um snapshot imutável. Não há cálculo financeiro feito pelo navegador para decidir o relatório final.

## 2. Entrada e categorias

Depois de escolher o que deseja analisar, o usuário seleciona uma modalidade:

- **Produto → Diagnóstico detalhado:** cria itens de revenda;
- **Produção → Diagnóstico detalhado:** cria itens fabricados e inicia a ficha técnica completa;
- **Serviço:** não exibe a modalidade detalhada.

Uma análise não mistura itens de revenda e fabricação. A categoria escolhida vale para todos os itens do relatório.

## 3. Jornada implementada

O progresso usa sete etapas estáveis. Os subpassos de um item compartilham a etapa 6.

```text
1. categoria
2. modalidade
3. gastos fixos mensais
4. pró-labore
5. taxas comuns e margem promocional
6. informações e custos de cada item
   +--> revisar itens
   +--> adicionar, editar ou remover
7. revisar e gerar o diagnóstico
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

### 4.3 Taxas e margem promocional

Imposto e taxa de cartão/plataforma são percentuais aplicados igualmente a todos os itens:

```text
taxa total = imposto + cartão
valor da taxa por unidade = preço de venda × taxa total
```

A margem promocional define um piso de preço para simulações. Ela não altera o preço informado nem promete um preço de mercado.

## 5. Informações comuns de cada item

Todo item possui:

- identificador estável;
- posição no mix;
- nome obrigatório;
- preço de venda unitário positivo;
- volume mensal de vendas opcional.

O volume tem três estados:

- **vazio:** volume desconhecido; o relatório do mix é parcial;
- **zero:** mês conhecido sem vendas daquele item;
- **positivo:** quantidade conhecida de vendas mensais.

O sistema nunca preenche ou altera automaticamente o volume. A meta de equilíbrio é uma referência do relatório, não uma mutação da resposta do usuário.

## 6. Custos de Produto

Para um item de revenda, o usuário informa:

- custo de compra por unidade;
- embalagem por unidade.

Campos opcionais vazios são normalizados para zero.

```text
custo variável unitário = custo de compra + embalagem
```

## 7. Custos de Produção

Cada produção usa uma das duas formas de custo.

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

O custo total dos ingredientes precisa ser maior que zero. Valores monetários são persistidos como inteiros escalados; os cálculos não dependem de ponto flutuante do navegador.

## 8. Gerenciamento dos itens

Depois de preencher custos, o usuário revisa os itens cadastrados. Pode:

- adicionar outro item;
- editar um item preservando seus valores;
- solicitar a remoção de um item;
- confirmar ou cancelar a remoção em um diálogo;
- avançar para a revisão final.

Sempre deve existir ao menos um item. A remoção do único item fica desabilitada. Ingredientes seguem a mesma regra: uma ficha técnica mantém ao menos uma linha.

## 9. Cálculo por item

Considere:

- **P** = preço de venda unitário;
- **CV** = custo variável unitário;
- **T** = imposto + cartão;
- **Q** = volume mensal conhecido;
- **MP** = margem promocional.

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

O relatório calcula duas referências por item quando matematicamente possíveis:

- **preço de equilíbrio:** cobre custo variável e taxas, sem contribuição positiva;
- **piso para promoção:** preserva a margem promocional configurada.

Taxas ou margens que eliminem o denominador deixam a referência indisponível; o sistema não inventa um valor.

## 10. Resultado do mix

Se todos os volumes forem conhecidos:

```text
faturamento mensal = soma das receitas mensais
contribuição mensal = soma das contribuições mensais
resultado mensal = contribuição mensal - gasto mensal efetivo
margem final = resultado mensal ÷ faturamento mensal
faturamento de equilíbrio = gasto mensal efetivo ÷ margem de contribuição do mix
```

A margem de contribuição do mix é ponderada pelo faturamento. Não é a média aritmética das margens individuais.

Se qualquer volume estiver vazio, o relatório é **parcial**:

- identifica nominalmente os itens pendentes;
- mantém custos, contribuição unitária, margens unitárias e preços de referência;
- deixa faturamento, contribuição, resultado, margem final e equilíbrio do mix indisponíveis;
- ordena a comparação pela posição original, e não por uma contribuição mensal inexistente.

Volume zero não torna o relatório parcial. Ele representa um mês conhecido sem vendas.

## 11. Veredito, prioridade e orientações

O motor classifica o cenário com um veredito e uma prioridade entre custo, dados, preço, margem e volume. A ordem protege o negócio:

1. sinaliza itens com perda direta;
2. pede volumes ausentes;
3. verifica mês sem vendas ou perda operacional;
4. identifica equilíbrio ou margem apertada;
5. reconhece quando o mix cobre os gastos com folga.

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

O snapshot detalhado atual usa as versões `1/1/1` de schema, cálculo e conteúdo. Relatórios salvos são imutáveis e reabertos sem recalcular os números com regras futuras.

## 13. Biblioteca e detalhe do relatório

Na biblioteca, um diagnóstico detalhado mostra categoria, quantidade de itens, estado completo/parcial e, quando disponíveis, resultado mensal e margem final. Ele não possui um único “preço atual”, pois representa um mix.

O detalhe apresenta:

- conclusão geral;
- totais do negócio;
- comparação entre itens;
- custos, margem, equilíbrio e piso promocional por item;
- ficha técnica das produções;
- orientações prioritárias.

Em relatórios completos, a comparação é ordenada pela contribuição mensal. Em relatórios parciais, usa a posição cadastrada e compara contribuição unitária.

## 14. Limites desta entrega

Esta entrega não inclui:

- controle físico de estoque;
- mistura de revenda e produção no mesmo diagnóstico;
- diagnóstico detalhado de Serviço;
- interpretação ou controles de IA;
- geração de PDF;
- compartilhamento público;
- comparação entre relatórios históricos;
- convite pós-relatório para converter um diagnóstico rápido em detalhado.

Esses limites não alteram o cálculo nem a persistência dos relatórios detalhados implementados.
