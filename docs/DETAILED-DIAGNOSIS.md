# Relatório das regras de negócio — Diagnóstico detalhado do Lucrivo

## 1. Objetivo deste documento

Este documento descreve o funcionamento atual do **diagnóstico detalhado** do Lucrivo, chamado em alguns pontos da interface de **análise de estoque**, **análise aprofundada** ou **ficha técnica**.

O objetivo é permitir que um especialista de domínio avalie:

1. quais informações são solicitadas;
2. como cada número é calculado;
3. como o sistema interpreta o conjunto de produtos;
4. quais mensagens aparecem em cada situação;
5. quais premissas e limitações existem hoje;
6. quais textos podem ser refinados sem que seja necessário consultar o código.

Os textos entre aspas e nos blocos identificados como **texto exibido** reproduzem literalmente o conteúdo da interface atual. Nos textos dinâmicos, valores entre chaves, como `{produto}` e `{valor}`, representam trechos preenchidos pelo sistema.

Esta documentação foi elaborada a partir do comportamento implementado no protótipo atual. Ela descreve o que o sistema faz hoje, inclusive comportamentos que podem não ser os desejados para a versão final.

---

## 2. Escopo e terminologia atual

O diagnóstico detalhado analisa financeiramente um ou mais produtos de um mesmo negócio. Ele não faz controle de quantidade em estoque, movimentação de entradas e saídas, lote, validade ou reposição.

Apesar disso, a interface usa a palavra **estoque** em vários textos, botões e nomes de registros. No comportamento atual, “estoque” significa o **conjunto ou mix de produtos analisados**, e não um módulo de gestão de estoque.

O mesmo recurso recebe nomes diferentes na interface e no código:

| Nome usado            | Onde aparece                        | Significado atual                                         |
| --------------------- | ----------------------------------- | --------------------------------------------------------- |
| Diagnóstico detalhado | Escolha do nível de análise         | Análise de um ou vários produtos com informações por item |
| Análise aprofundada   | Organização interna da jornada      | Estado que abre o cadastro de vários produtos             |
| Análise de estoque    | Textos explicativos, resultado e IA | Análise de rentabilidade do mix de produtos               |
| Ficha técnica         | Produtos fabricados                 | Detalhamento de ingredientes, rendimento e perda          |

Serviços não possuem um diagnóstico detalhado equivalente. O caminho detalhado é aberto a partir de **“Um produto”** ou **“Uma produção”**.

---

## 3. Formas de entrada no diagnóstico detalhado

### 3.1 Entrada direta pela jornada guiada

A jornada começa com os textos:

> **O que você quer analisar?**
>
> Escolha o que mais parece com o seu negócio.

As opções exibidas são:

| Opção            | Descrição exibida                       |
| ---------------- | --------------------------------------- |
| **Um serviço**   | “salão, terapeuta, personal, dentista…” |
| **Um produto**   | “loja, mercadinho, revenda…”            |
| **Uma produção** | “padaria, doceria, marmitaria…”         |

Depois de escolher **“Um produto”** ou **“Uma produção”** e avançar, o sistema apresenta:

> **Como você quer analisar?**
>
> Comece simples ou aprofunde — você escolhe. Dá pra fazer os dois.

As duas opções são:

| Opção                                                       | Descrição exibida                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| **Diagnóstico rápido**                                      | “Análise simples de um produto, com o mínimo de informações.” |
| **Analisar mais de um item ou fazer diagnóstico detalhado** | Texto variável conforme a trilha escolhida                    |

Se o usuário escolheu **“Uma produção”**, a descrição exata da opção detalhada é:

> Abre o preenchimento detalhado (vários produtos, já como **“Eu fabrico”**), com a **ficha técnica em destaque** pra detalhar a produção.

Se escolheu **“Um produto”**, a descrição exata é:

> Abre o preenchimento detalhado (vários produtos, já como **“Compro pronto”**), com opção de detalhar os custos.

O botão **“← voltar”** retorna à escolha anterior.

#### Efeito da escolha inicial

Na entrada direta, o modo do produto fica travado para todos os itens:

- **Um produto:** todos os itens aparecem como **“Compro pronto”**;
- **Uma produção:** todos os itens aparecem como **“Eu fabrico”**.

Nesse caminho, cada cartão mostra a pergunta **“Como esse produto entra?”**, mas exibe apenas a resposta travada; o usuário não pode misturar produtos comprados e fabricados na mesma análise.

### 3.2 Entrada opcional depois do diagnóstico rápido

Após um diagnóstico rápido, a interface também pode apresentar a seção:

> **ETAPA OPCIONAL**
>
> **Você vende outros produtos e quer descobrir quais realmente contribuem pro seu negócio?**
>
> É uma análise de rentabilidade dos seus produtos — quais ajudam e quais atrapalham. Não é controle de estoque.

Botões exibidos:

- **“Não, só este produto”**;
- **“Sim, quero analisar meu estoque →”**.

Ao escolher a primeira opção, aparece:

> Tudo certo — seu diagnóstico acima já está completo. Se mudar de ideia, é só clicar em “Sim”. **voltar**

Ao escolher a segunda, o mesmo componente detalhado é aberto. Nessa entrada opcional, o modo não fica travado: cada item pode alternar entre **“Compro pronto”** e **“Eu fabrico”**, permitindo um mix dos dois tipos.

Observação: no protótipo atual, essa etapa opcional é renderizada depois do diagnóstico rápido tanto de produto quanto de serviço, embora o conteúdo aberto seja sempre uma análise de produtos.

---

## 4. Visão geral do fluxo

```text
Início do diagnóstico
        |
        v
Escolha: “Um produto” ou “Uma produção”
        |
        v
Escolha: “Analisar mais de um item ou fazer diagnóstico detalhado”
        |
        v
Parâmetros comuns do negócio
        +--> custo fixo mensal
        +--> imposto percentual
        +--> cartão percentual
        |
        v
Cadastro de um ou mais produtos
        +--> nome
        +--> preço
        +--> vendas mensais
        +--> custo de compra, ou custo de fabricação
        +--> embalagem
        +--> ficha técnica opcional/aberta na produção
        |
        +--> adicionar produto
        +--> remover produto
        +--> calcular equilíbrio automaticamente
        |
        v
“Analisar meu estoque →”
        |
        v
Resultado consolidado
        +--> sobra das vendas
        +--> custo fixo
        +--> sobra pro dono
        +--> faturamento de equilíbrio
        +--> principais alertas do mix
        +--> contribuição mensal por produto
        +--> ritmo de vendas
        +--> piso de promoção
        +--> orientações automáticas
        |
        +--> salvar estoque
        +--> analisar com IA
        +--> gerar PDF pelo navegador
        +--> limpar informações
```

---

## 5. Cabeçalho e ações gerais da tela

O cabeçalho do diagnóstico exibe:

> **DIAGNÓSTICO**
>
> **A verdade por trás do preço.**
>
> O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.

Durante o fluxo detalhado, ficam disponíveis:

- **“← Recomeçar diagnóstico”**: sai do detalhado e volta ao início da jornada;
- **“PDF”**: chama a impressão do navegador para imprimir ou salvar a tela como PDF;
- **“Salvar estoque”**: salva um retrato dos dados atuais;
- **“✨ Analisar meu estoque com IA”**: aparece somente depois de o botão **“Analisar meu estoque →”** ter sido acionado.

O botão **“Salvar estoque”** aparece mesmo antes de a análise ser concluída.

A ação **“PDF”** não monta um relatório separado: ela imprime o estado que estiver visível na tela naquele momento. Botões e outros elementos marcados como controles são ocultados na impressão, mas cartões abertos, resultados já revelados e demais seções visíveis compõem o documento.

---

## 6. Estado inicial da análise

Ao abrir o diagnóstico detalhado, o sistema inicia com:

- imposto em branco;
- cartão em branco;
- custo fixo em branco;
- margem mínima de promoção em **15%**;
- um produto;
- nome do produto em branco;
- preço em branco;
- vendas mensais em branco;
- embalagem em branco;
- rendimento igual a **1**;
- perda igual a **0%**;
- uma linha de insumo em branco;
- primeiro produto aberto para edição;
- resultado consolidado ainda oculto.

No modo de revenda:

- o produto começa como **“Compro pronto”**;
- a ficha técnica não é exibida;
- o campo de custo é o custo de compra.

No modo de produção:

- o produto começa como **“Eu fabrico”**;
- a ficha técnica já começa aberta;
- cada novo produto também começa com a ficha técnica aberta.

---

## 7. Parâmetros comuns do negócio

A primeira seção do preenchimento exibe:

> **DO NEGÓCIO**
>
> Valem pra todos os produtos de uma vez.

### 7.1 Custo fixo

Texto do campo:

> **Custo fixo** — R$ /mês

Texto da ajuda “?”:

> Gastos que existem mesmo vendendo zero: aluguel, luz, salários, contador. Não coloque insumos nem cartão aqui.

O valor é único e mensal. Diferentemente do diagnóstico rápido, o detalhado não oferece a abertura “Detalhar item a item” para os custos fixos.

### 7.2 Imposto

Texto do campo:

> **Imposto** — %

Texto da ajuda “?”:

> A fatia do faturamento que vira imposto (ex: alíquota do Simples). Vale pra todos os produtos. Confirme a sua no extrato do Simples ou com o contador.

### 7.3 Cartão

Texto do campo:

> **Cartão** — %

Texto da ajuda “?”:

> Média que a maquininha desconta por venda no cartão. Se boa parte é Pix/dinheiro, use um valor menor (a média real).

Imposto e cartão são aplicados igualmente a todos os produtos.

---

## 8. Cadastro dos produtos

A seção começa com o título dinâmico:

> **SEUS PRODUTOS ({quantidade})**

Exemplo com três itens: **“SEUS PRODUTOS (3)”**.

Também são exibidos os botões:

- **“Calcular equilíbrio”**;
- **“+ Produto”**.

Texto explicativo:

> “Calcular equilíbrio” preenche quanto cada produto precisa vender pra você não ter prejuízo.

Cada produto é um cartão recolhível. Fechado, o cartão mostra:

- o nome informado ou **“Produto sem nome”**;
- o texto **“contrib.”**;
- o percentual atual da margem de contribuição;
- um indicador para abrir o cartão.

O cartão sem preço informado recebe aparência neutra. Com contribuição negativa, recebe sinalização vermelha. Nos demais casos, a aparência usa um corte visual interno de 20%: abaixo de 20% fica em atenção; com 20% ou mais fica positiva. Esse corte visual é fixo e não usa a margem mínima da promoção.

### 8.1 Campos comuns de cada produto

#### Nome

Texto do campo:

> **Nome do produto**

O campo não possui placeholder. Se ficar vazio, o cabeçalho usa **“Produto sem nome”**, gráficos e listas usam **“—”** em alguns lugares, e o salvamento usa **“Produto {número}”** no resumo.

#### Forma de entrada

Pergunta exibida:

> **Como esse produto entra?**

Opções quando a análise permite modo misto:

- **“Compro pronto”**;
- **“Eu fabrico”**.

Na entrada direta, apenas a opção travada é mostrada como resposta.

#### Preço de venda

Texto do campo:

> **Preço de venda (por unidade)** — R$

Texto da ajuda “?”:

> O que você cobra do cliente por 1 unidade.

#### Volume

Texto do campo:

> **Vendas por mês** — un

Texto da ajuda “?”:

> Quantas unidades você vende por mês, em média.

#### Embalagem

Texto do campo:

> **Embalagem/un (opcional)** — R$

Texto da ajuda “?”:

> Custo de embalar 1 unidade: saco, pote, caixinha. Deixe vazio se não tiver.

### 8.2 Produto comprado pronto

Texto do campo de custo:

> **Custo de compra (por unidade)** — R$

Texto da ajuda “?”:

> Quanto você paga no fornecedor por 1 unidade.

O custo variável unitário desse produto é:

```text
Custo variável por unidade = custo de compra + embalagem por unidade
```

### 8.3 Produto fabricado sem ficha técnica

Quando a ficha técnica está fechada, o campo exibido é:

> **Custo pra fazer (por unidade)** — R$

Texto da ajuda “?”:

> Quanto custa fazer 1 unidade. Se preferir, detalhe os ingredientes abaixo.

Botão exibido:

> **+ Detalhar ingredientes (ficha técnica)**

Nesse modo:

```text
Custo variável por unidade = custo informado para fazer + embalagem por unidade
```

### 8.4 Produto fabricado com ficha técnica

A ficha aberta exibe:

> **FICHA TÉCNICA**

Botão para sair do detalhamento:

> **usar custo direto**

Orientação exibida:

> Liste os ingredientes de **uma receita** e diga quantas unidades ela faz.

#### Rendimento

Texto do campo:

> **Rendimento da receita** — un

Texto da ajuda “?”:

> Quantas unidades saem de uma receita. Ex: massa que faz 20 pães → 20. Se lançou já por unidade, deixe **1**.

#### Perda

Texto do campo:

> **Perda** — %

Texto da ajuda “?”:

> Quanto da produção não vira venda: quebra, item que estraga. Deixe 0 se não tiver.

#### Tabela de insumos

Cabeçalhos exibidos:

| Item | Qtd | Un  | Custo |
| ---- | --: | --- | ----: |

Placeholders de cada linha:

| Campo          | Placeholder inicial |
| -------------- | ------------------- |
| Nome           | “Insumo”            |
| Quantidade     | “qtd”               |
| Unidade        | “un”                |
| Custo unitário | “R$/un”             |

A unidade inicial da primeira linha é **“g”**, mas pode ser substituída por qualquer texto. Não existe lista fechada de unidades nem conversão automática entre g, kg, ml, l ou unidades.

O botão de remoção “×” possui o rótulo de acessibilidade:

> **Remover insumo**

Os botões de ajuda “?” dos campos possuem o rótulo de acessibilidade **“O que colocar aqui”**.

Botão para criar outra linha:

> **+ Insumo**

#### Conta explicada na tela

Quando a soma dos insumos é maior que zero, aparece um texto dinâmico neste formato:

> A conta: **{total dos ingredientes}** de ingredientes ÷ **{rendimento}** un = **{custo dos insumos por unidade}** por unidade.

Quando existe perda:

> A conta: **{total dos ingredientes}** de ingredientes ÷ **{rendimento}** un (com {perda}% de perda) = **{custo dos insumos por unidade}** por unidade.

Quando também existe embalagem, é acrescentado:

> - {embalagem} de embalagem = **{custo variável total por unidade}**.

### 8.5 Resultados dentro do cartão

O rodapé aberto de cada produto mostra permanentemente:

- **“Custo por unidade”**;
- **“Contribuição/un”**;
- **“Contribuição/mês”**.

Se a contribuição por unidade for negativa, também aparece:

> ⚠ Cada venda deste item tira dinheiro do caixa: o preço nem cobre os custos variáveis. Vender mais piora.

Botão disponível no final do cartão:

> **Remover produto**

Não há confirmação antes da remoção. Também é possível remover o único produto e deixar a análise sem itens.

---

## 9. Cálculo financeiro de cada produto

Considere:

- **P** = preço de venda por unidade;
- **CC** = custo de compra por unidade;
- **CFAB** = custo direto informado para fabricar uma unidade sem ficha;
- **E** = embalagem por unidade;
- **I** = imposto percentual;
- **C** = cartão percentual;
- **V** = total percentual descontado da venda;
- **Q** = vendas mensais do produto;
- **R** = rendimento da receita;
- **D** = perda da produção em forma decimal;
- **INS** = soma dos custos dos insumos de uma receita.

### 9.1 Percentuais sobre a venda

```text
V = (I + C) ÷ 100
```

Não há comissão de plataforma, distinção por meio de pagamento ou percentual diferente por produto no diagnóstico detalhado atual.

### 9.2 Soma dos insumos

Para cada linha:

```text
Custo da linha = quantidade × custo unitário informado
```

Para a receita:

```text
INS = soma de todos os custos das linhas
```

O texto digitado no campo de unidade não participa da conta. O sistema pressupõe que quantidade e custo unitário já estejam na mesma unidade.

### 9.3 Custo de insumos por unidade vendável

```text
Custo de insumos por unidade = INS ÷ R ÷ (1 - D)
```

Se o rendimento estiver vazio, inválido, igual a zero ou negativo, o sistema usa **1** no cálculo.

Se a perda for igual ou superior a 100%, o custo se torna matematicamente infinito e a interface apresenta **“—”** nos valores monetários afetados.

### 9.4 Custo variável unitário

Revenda:

```text
Custo variável unitário = CC + E
```

Produção sem ficha:

```text
Custo variável unitário = CFAB + E
```

Produção com ficha:

```text
Custo variável unitário = (INS ÷ R ÷ (1 - D)) + E
```

### 9.5 Contribuição por unidade

```text
Contribuição por unidade = P × (1 - V) - custo variável unitário
```

Essa é a sobra de cada venda depois de imposto, cartão, custo do produto e embalagem, mas antes do custo fixo.

### 9.6 Margem de contribuição

```text
Margem de contribuição = contribuição por unidade ÷ P
```

Se o preço for zero, a margem é indefinida e aparece como **“—”**.

### 9.7 Receita e contribuição mensais

```text
Receita mensal do produto = P × Q

Contribuição mensal do produto = contribuição por unidade × Q
```

Um produto é marcado como negativo somente quando:

```text
Contribuição por unidade < 0
```

Se a contribuição for exatamente zero, ele não recebe a marca de produto negativo.

---

## 10. Cálculo consolidado do negócio

Depois de clicar em **“Analisar meu estoque →”**, o sistema combina todos os produtos.

### 10.1 Receita total mensal

```text
Receita total = soma da receita mensal de todos os produtos
```

### 10.2 Sobra das vendas

```text
Contribuição total = soma da contribuição mensal de todos os produtos
```

Na interface, a contribuição total recebe o rótulo **“Sobra das vendas/mês”**.

### 10.3 Sobra pro dono

```text
Sobra pro dono = contribuição total - custo fixo mensal
```

No retrato salvo e na IA, o mesmo valor recebe o nome **“Lucro do negócio”**.

O diagnóstico detalhado atual não possui campo de pró-labore. Portanto, “Sobra pro dono” ou “Lucro do negócio” somente representa um lucro após remuneração do proprietário se o usuário tiver incluído o pró-labore dentro do campo **“Custo fixo”** por conta própria.

### 10.4 Margem de contribuição média do mix

```text
Margem de contribuição média = contribuição total ÷ receita total
```

Ela é uma média ponderada pelo faturamento e pelo volume informado, não a média aritmética simples das margens dos produtos.

### 10.5 Faturamento de equilíbrio

```text
Faturamento de equilíbrio = custo fixo ÷ margem de contribuição média
```

O valor só é finito quando a margem de contribuição média é positiva. Com receita zero, contribuição total zero ou margem média negativa, a interface formata o valor como **“—”**.

---

## 11. Botão “Calcular equilíbrio”

O botão altera os campos **“Vendas por mês”** dos produtos. Ele não apenas mostra uma referência.

Produtos cuja contribuição por unidade seja zero ou negativa são ignorados e mantêm seu volume atual.

### 11.1 Quando já existe um mix com contribuição positiva

O sistema soma a contribuição mensal atual apenas dos produtos com contribuição unitária positiva:

```text
Contribuição-base = soma de (contribuição unitária × volume atual)
```

Depois multiplica o volume atual de cada produto positivo pela mesma razão:

```text
Novo volume do produto =
arredondar para cima(
  volume atual do produto × custo fixo ÷ contribuição-base
)
```

Isso preserva aproximadamente a proporção do mix atual.

Consequências do comportamento atual:

- um produto positivo com volume atual zero continua com zero;
- produtos negativos não são usados para pagar o custo fixo e não são alterados;
- por causa do arredondamento individual para cima, a contribuição final pode ficar um pouco acima do custo fixo;
- o cálculo não considera uma meta de lucro além do equilíbrio.

### 11.2 Quando nenhum produto positivo possui volume

Se existem produtos com contribuição unitária positiva, mas a contribuição-base é zero, o custo fixo é dividido igualmente entre esses produtos:

```text
Parcela de custo fixo por produto positivo =
custo fixo ÷ quantidade de produtos positivos

Novo volume =
arredondar para cima(
  parcela de custo fixo ÷ contribuição por unidade
)
```

Se nenhum produto tiver contribuição unitária positiva, o botão não altera nada.

---

## 12. Ação “Analisar meu estoque”

Antes da análise, o resultado consolidado permanece oculto e aparece o botão:

> **Analisar meu estoque →**

O botão não valida os dados e não congela o preenchimento. Ele apenas torna os resultados visíveis. Depois disso, qualquer alteração nos campos recalcula e atualiza a tela imediatamente.

---

## 13. Bloco “O negócio inteiro”

O resultado consolidado começa com:

> **O NEGÓCIO INTEIRO**

Indicadores exibidos:

| Texto exibido            | Cálculo                                              |
| ------------------------ | ---------------------------------------------------- |
| **Sobra das vendas/mês** | Contribuição total                                   |
| **Custo fixo/mês**       | Custo fixo informado, exibido com sinal de subtração |
| **Sobra pro dono**       | Contribuição total menos custo fixo                  |

### 13.1 Texto quando a sobra pro dono é negativa

> No mix atual, o negócio dá **prejuízo de {prejuízo}/mês**. Você precisa faturar **{faturamento de equilíbrio}/mês** (hoje faz {receita atual}) só pra empatar.

### 13.2 Texto quando a sobra pro dono é zero ou positiva

> Ponto de equilíbrio: **{faturamento de equilíbrio}/mês**. Você fatura {receita atual} — está **{diferença}** acima da linha.

A condição usada é estritamente “menor que zero”. Portanto, sobra igual a zero entra no segundo texto.

### 13.3 Principal contribuidor

Se o produto de maior contribuição mensal contribui com valor maior que zero, aparece:

> **{produto}** é quem segura o negócio: sozinho deixa **{contribuição mensal}/mês** ({participação percentual} de tudo).

A participação é calculada sobre a contribuição total líquida, já incluindo eventuais produtos negativos. Por isso, se existirem contribuições negativas, a participação do principal produto pode superar 100%.

### 13.4 Campeão de vendas com pior margem

Se o produto de maior volume também for o de pior margem entre os itens vendidos e não vender no prejuízo, aparece:

> Seu campeão de vendas, **{produto}**, é também o de **pior margem** ({margem}). Você gira muito e ganha pouco nele — girar mais não é o caminho.

### 13.5 Produtos no vermelho

Com um produto negativo:

> **{produto}** vende no vermelho: o preço nem cobre o custo variável. Cada venda desses tira do seu bolso.

Com mais de um:

> **{quantidade} produtos** vendem no vermelho: o preço nem cobre o custo variável. Cada venda desses tira do seu bolso.

---

## 14. Seção “Leitura do mix”

A seção exibe:

> **LEITURA DO MIX**
>
> Quem segura o negócio e até onde dá pra baixar numa promoção.

Ela só aparece quando o usuário informou preço maior que zero ou volume maior que zero em pelo menos um produto.

### 14.1 Gráfico de contribuição mensal

Título:

> **QUANTO CADA PRODUTO CONTRIBUI POR MÊS**

Os produtos são ordenados da maior para a menor contribuição mensal. Somente itens com preço numérico maior que zero aparecem no gráfico.

Cada linha mostra:

- nome do produto ou **“—”**;
- barra proporcional à maior contribuição mensal;
- contribuição mensal em reais.

Itens negativos usam barra vermelha. A barra usa o valor absoluto da largura calculada e fica visualmente limitada pelo contêiner.

### 14.2 Ritmo de vendas e piso de promoção

Título:

> **RITMO DE VENDAS E PISO DE PROMOÇÃO**

Controle exibido:

> **Margem mínima na promoção** {percentual}%

O valor inicial é **15%** e pode ser editado livremente.

Para cada produto com preço maior que zero, aparece uma linha no formato:

> **{produto}** {quantidade diária}/dia · {quantidade semanal}/sem · {quantidade mensal}/mês promo até **{piso com margem}** (piso s/ prejuízo {piso sem prejuízo})

Os volumes são calculados assim:

```text
Volume diário = volume mensal ÷ 26

Volume semanal = volume mensal ÷ 4,33

Volume mensal = volume informado
```

Todos os três valores exibidos são arredondados para cima. O divisor diário é fixo em 26 dias por mês; não existe campo de dias trabalhados no diagnóstico detalhado.

### 14.3 Piso sem prejuízo

```text
Piso sem prejuízo = custo variável unitário ÷ (1 - V)
```

É o preço em que a contribuição por unidade chega a zero. Ele ainda não paga nenhum custo fixo.

### 14.4 Piso com margem mínima de promoção

Considere **MP** como a margem mínima definida na seção:

```text
Piso com margem = custo variável unitário ÷ (1 - V - MP)
```

O resultado é exibido depois da expressão **“promo até”**, embora matematicamente represente o menor preço que preserva a margem informada.

Se imposto + cartão + margem mínima somarem 100% ou mais, o piso não é matematicamente possível e aparece como **“—”**.

O controle da margem de promoção não altera o resultado do negócio, a contribuição atual, o ponto de equilíbrio nem os volumes. Ele altera apenas o piso promocional exibido.

---

## 15. Orientações automáticas do mix

Quando pelo menos uma regra é acionada, aparece:

> **O QUE FAZER COM ISSO**

As mensagens não são mutuamente exclusivas. Mais de uma pode aparecer ao mesmo tempo.

### 15.1 Dependência excessiva de um produto

Condição:

```text
Participação do principal produto na contribuição total > 45%
e contribuição mensal do principal produto > 0
```

Texto exibido:

> **{produto}** banca {participação} de tudo que sobra. É força e risco ao mesmo tempo: se ele faltar ou cair de venda, o negócio sente na hora. Vale desenvolver um segundo produto forte pra não depender de um só.

### 15.2 Produto de maior margem não é o mais vendido

Condição: existe produto com contribuição unitária positiva e volume não negativo, e ele não é o produto de maior volume entre os itens vendidos com contribuição positiva. A mensagem também pode aparecer quando nenhum produto positivo possui volume maior que zero, pois nesse caso não existe um “mais vendido” para a comparação.

Texto exibido:

> **{produto}** é sua maior margem ({margem}). Cada venda dele rende mais que a média — se der pra empurrar (destaque no balcão, combo, sugestão), é aqui que o esforço de venda rende mais.

### 15.3 Mais vendido também é a pior margem

Condição: entre os produtos com volume maior que zero e contribuição positiva, o mais vendido também possui a pior margem.

Texto exibido:

> Você vende muito **{produto}**, mas é sua pior margem ({margem}). Girar mais dele cansa a operação e rende pouco — ou sobe o preço, ou usa ele só como isca pra vender os de margem melhor.

### 15.4 Produto com prejuízo unitário

Com um item negativo:

> **{produto}** dá prejuízo por unidade. Não é caso de vender mais — é subir preço, cortar custo da ficha, ou tirar do cardápio.

Com mais de um:

> **{quantidade} itens** dão prejuízo por unidade. Não é caso de vender mais — é subir preço, cortar custo da ficha, ou tirar do cardápio.

---

## 16. Salvamento do diagnóstico detalhado

O botão exibido é:

> **Salvar estoque**

Ao salvar, o sistema registra:

- identificador e data/hora;
- imposto;
- cartão;
- custo fixo;
- margem mínima de promoção;
- todos os produtos e seus campos;
- modo de cada produto;
- ficha técnica e insumos;
- número de produtos;
- receita mensal total;
- contribuição mensal total;
- sobra ou lucro do negócio;
- margem de contribuição média;
- faturamento de equilíbrio, quando finito;
- nome, margem de contribuição, contribuição mensal, volume e indicador de prejuízo de cada produto.

O nome automático do retrato é:

> Estoque · {quantidade} produto/produtos · {data}

Exemplos:

- **“Estoque · 1 produto · 15/09/2026”**;
- **“Estoque · 3 produtos · 15/09/2026”**.

Confirmação exibida por aproximadamente 2,6 segundos:

> Diagnóstico salvo em Relatórios.

Na tela de relatórios, o cartão de uma análise detalhada mostra:

- **“Estoque · {data e hora}”**;
- **“Margem média”**;
- **“Lucro do negócio”**;
- **“Produtos”**;
- botão **“Relatório IA”**;
- botão **“Excluir”**.

Texto introdutório da tela:

> **Meus produtos salvos**
>
> Seu estoque cadastrado fica aqui — não precisa redigitar. (No app final, salvo na sua conta.)

No ambiente do protótipo, o sistema tenta usar o armazenamento oferecido pelo ambiente. Quando esse recurso não existe ou falha, usa apenas memória temporária; nesse caso, os dados podem desaparecer ao recarregar a página.

---

## 17. Interpretação por IA

Depois de analisar, o botão exibido é:

> **✨ Analisar meu estoque com IA**

O modal mostra:

> **Relatório inteligente**
>
> A IA interpreta os números que o sistema já calculou — ela não recalcula nada.

Durante a espera:

> Analisando seus números…

Em caso de falha:

> Não foi possível gerar o relatório neste ambiente. No app final, a IA interpreta os números aqui e devolve a análise consultiva.

Botão após a falha:

> **Tentar de novo**

### 17.1 Dados enviados para interpretação

A IA recebe os seguintes dados consolidados:

- quantidade de produtos;
- faturamento total mensal;
- contribuição total mensal;
- lucro ou sobra do negócio após o custo fixo;
- margem de contribuição média;
- faturamento para empatar, quando disponível;
- para cada produto: nome, margem de contribuição, contribuição mensal e indicador de venda no prejuízo.

O volume é armazenado no retrato, mas não é incluído na lista textual enviada à IA. Também não são enviados no resumo textual o preço, custo unitário, composição dos insumos, imposto, cartão, custo fixo isolado ou piso de promoção de cada produto.

### 17.2 Orientação dada à IA

O sistema pede um relatório de 250 a 380 palavras, em português claro, que responda, nesta ordem:

1. **O QUE ESTÁ ACONTECENDO?**
2. **QUAL É O PRINCIPAL PROBLEMA?**
3. **QUAL É O RISCO OU A OPORTUNIDADE?**
4. **O QUE FAZER AGORA?**

Para análises de estoque, o comando acrescenta:

> Como é uma análise de ESTOQUE, destaque: quais produtos mais contribuem (mais rentáveis), quais têm baixa contribuição ou margem problemática, quais vendem no prejuízo, quais merecem revisão de preço, e onde estão as prioridades e oportunidades. Não invente produtos nem números que não estejam na lista.

A IA é orientada a interpretar números já calculados, não inventar valores e não refazer os cálculos.

---

## 18. Comparação histórica

Quando existem pelo menos dois retratos salvos, análises detalhadas do tipo “ficha” podem ser comparadas. Os indicadores disponíveis são:

- **“Margem média”**;
- **“Lucro do negócio”**;
- **“Faturamento/mês”**;
- **“Contribuição/mês”**;
- **“Nº de produtos”**.

Os cabeçalhos exibidos são:

- **“Indicador”**;
- **“Antes”**;
- **“Depois”**;
- **“Mudança”**.

Todas as métricas consideram um valor maior como melhoria, inclusive o número de produtos.

Se o usuário tentar comparar uma análise detalhada com um diagnóstico rápido, aparece:

> Pra comparar, escolha dois retratos do mesmo tipo — dois estoques (Ficha técnica) ou dois diagnósticos de um produto. Você está comparando tipos diferentes.

---

## 19. Formatação e tratamento dos valores

### 19.1 Campos numéricos

Os campos aceitam texto com ponto ou vírgula decimal. O sistema substitui a primeira vírgula por ponto e tenta interpretar o começo do conteúdo como número.

Campos vazios, não numéricos ou valores não finitos são tratados como **zero** na maioria dos cálculos.

Não existem atualmente validações de mínimo ou máximo para:

- preço;
- custos;
- imposto;
- cartão;
- volume;
- rendimento;
- perda;
- margem mínima de promoção.

Também não existem mensagens obrigando o preenchimento antes da análise ou do salvamento.

### 19.2 Dinheiro

Valores finitos são formatados em reais conforme o padrão `pt-BR`, por exemplo **“R$ 1.234,56”**. Valores infinitos ou indefinidos aparecem como **“—”**.

### 19.3 Percentuais

Percentuais calculados são exibidos com no máximo uma casa decimal, por exemplo **“18,5%”**. Valores indefinidos aparecem como **“—”**.

### 19.4 Volumes diários, semanais e mensais

Na seção de ritmo de vendas, todos os volumes são arredondados para cima e exibidos sem casas decimais.

---

## 20. Ação “Limpar informações”

O botão exibido no fim da análise é:

> **Limpar informações**

Ao clicar, o sistema:

- limpa imposto;
- limpa cartão;
- limpa custo fixo;
- remove todos os produtos;
- cria um novo produto em branco;
- mantém o modo inicial da análise;
- abre o novo produto.

No comportamento atual, a ação:

- não solicita confirmação;
- não redefine a margem mínima de promoção para 15%;
- não volta a ocultar o resultado caso a análise já tenha sido aberta.

Ao final da tela aparece:

> Cadastre cada produto do seu estoque — o que você compra pronto e o que fabrica. Clique num produto pra abrir.

Esse texto é fixo, inclusive quando a entrada direta travou todos os produtos como revenda ou todos como produção.

---

## 21. Premissas, limites e cuidados de interpretação

1. **A análise detalhada mede rentabilidade do mix, não controla estoque.** A terminologia atual pode sugerir uma funcionalidade operacional que não existe.
2. **O custo fixo não é rateado por produto.** Ele é subtraído apenas depois que todas as contribuições mensais são somadas.
3. **A margem exibida por produto é margem de contribuição.** Não é margem líquida nem margem após rateio de custos fixos.
4. **“Sobra pro dono” não inclui automaticamente pró-labore.** O detalhado não pergunta a remuneração desejada do proprietário.
5. **Imposto e cartão são médias globais.** Todos os itens recebem os mesmos percentuais, mesmo que tenham formas de pagamento ou regimes diferentes.
6. **O custo da ficha depende da coerência das unidades.** O sistema não converte kg em g, l em ml ou embalagem comprada em lote para custo unitário.
7. **Campos esquecidos viram zero.** Isso pode gerar uma análise aparentemente positiva com dados incompletos.
8. **Não há bloqueio para perda de 100% ou mais.** O resultado afetado vira “—”.
9. **Não há bloqueio para taxas iguais ou superiores a 100%.** Pisos de preço podem ficar impossíveis ou assumir resultados pouco úteis.
10. **O equilíbrio preserva o mix atual apenas aproximadamente.** O arredondamento para cima muda levemente as proporções.
11. **Itens negativos são ignorados pelo preenchimento automático de equilíbrio.** Seus volumes atuais permanecem no cadastro e ainda afetam o resultado consolidado.
12. **O piso sem prejuízo cobre somente variáveis.** Ele não garante que o custo fixo do negócio seja pago.
13. **O piso promocional também é anterior ao custo fixo.** A margem mínima escolhida é uma margem de contribuição, não uma margem final do negócio.
14. **A referência diária usa 26 dias por mês.** Não considera a agenda real do negócio.
15. **O corte visual de 20% do cartão é fixo.** Ele não corresponde necessariamente à margem promocional de 15% nem a uma meta escolhida pelo usuário.
16. **Não existe meta de margem normal ou lucro desejado para o mix.** A única margem editável é a margem mínima usada para o preço promocional.
17. **Não há análise de demanda ou concorrência.** Os pisos são referências financeiras, não validações de preço de mercado.
18. **Não há custos variáveis adicionais por item.** Comissão, frete, entrega e outros custos só entram se forem incorporados manualmente no custo ou na embalagem.
19. **Salvar não exige concluir a análise.** É possível guardar um retrato vazio ou incompleto.
20. **Excluir produtos e limpar dados não pedem confirmação.** Essas ações são imediatas na interface atual.
21. **Resultados não finitos podem ser ignorados na consolidação.** Se uma ficha gerar contribuição mensal infinita ou indefinida, por exemplo por perda de 100%, o total mensal considera zero para aquele item em vez de interromper a análise com uma validação.

---

## 22. Exemplo completo de análise

Considere um negócio com:

- custo fixo: R$ 3.000/mês;
- imposto: 6%;
- cartão: 4%;
- margem mínima na promoção: 15%;
- Produto A comprado por R$ 20, com embalagem de R$ 2, preço de R$ 50 e 100 vendas/mês;
- Produto B fabricado com receita de R$ 120, rendimento de 30 unidades, perda de 10%, embalagem de R$ 1, preço de R$ 15 e 200 vendas/mês.

### 22.1 Produto A

```text
Taxas = 6% + 4% = 10%

Custo variável unitário = 20 + 2 = R$ 22

Contribuição unitária = 50 × 90% - 22 = R$ 23

Margem de contribuição = 23 ÷ 50 = 46%

Receita mensal = 50 × 100 = R$ 5.000

Contribuição mensal = 23 × 100 = R$ 2.300
```

### 22.2 Produto B

```text
Custo dos insumos por unidade vendável =
120 ÷ 30 ÷ (1 - 10%) = R$ 4,44

Custo variável unitário = 4,44 + 1 = R$ 5,44

Contribuição unitária = 15 × 90% - 5,44 = R$ 8,06

Margem de contribuição = 8,06 ÷ 15 = 53,7%

Receita mensal = 15 × 200 = R$ 3.000

Contribuição mensal ≈ 8,06 × 200 = R$ 1.611,11
```

### 22.3 Negócio consolidado

```text
Receita total = 5.000 + 3.000 = R$ 8.000

Contribuição total = 2.300 + 1.611,11 = R$ 3.911,11

Sobra pro dono = 3.911,11 - 3.000 = R$ 911,11

Margem de contribuição média = 3.911,11 ÷ 8.000 = 48,9%

Faturamento de equilíbrio = 3.000 ÷ 48,9% ≈ R$ 6.136,36
```

### 22.4 Pisos promocionais

Produto A:

```text
Piso sem prejuízo = 22 ÷ 90% = R$ 24,44

Piso com margem de 15% = 22 ÷ (100% - 10% - 15%) = R$ 29,33
```

Produto B:

```text
Piso sem prejuízo = 5,44 ÷ 90% ≈ R$ 6,05

Piso com margem de 15% = 5,44 ÷ 75% ≈ R$ 7,26
```

Esses pisos não absorvem os R$ 3.000 de custo fixo. A capacidade do mix de pagar a estrutura aparece apenas no resultado consolidado.

---

## 23. Síntese da lógica de decisão

```text
Para cada produto:
  Identificar se é revenda ou produção
        |
        +--> revenda: custo de compra + embalagem
        |
        +--> produção sem ficha: custo direto + embalagem
        |
        +--> produção com ficha:
               somar insumos
               dividir pelo rendimento
               ajustar pela perda
               somar embalagem
        |
        v
  Descontar imposto e cartão do preço
        |
        v
  Calcular contribuição por unidade e por mês
        |
        +--> contribuição negativa: cada venda piora o caixa
        |
        v
Para o negócio:
  Somar faturamento e contribuição de todos os itens
        |
        v
  Subtrair o custo fixo
        |
        +--> resultado negativo: negócio em prejuízo no mix atual
        |
        +--> resultado zero ou positivo: medir distância do equilíbrio
        |
        v
  Identificar concentração, melhor margem, pior margem e itens negativos
        |
        v
  Exibir pisos promocionais e orientações do mix
```

Em resumo, o diagnóstico detalhado atual responde duas questões diferentes: **quanto cada produto deixa para pagar a estrutura** e **se o conjunto dessas contribuições é suficiente para cobrir o custo fixo**. A ficha técnica melhora a precisão do custo dos produtos fabricados; o resultado consolidado mostra se o mix informado fecha a conta do negócio.
