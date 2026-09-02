# Relatório das regras de negócio — Diagnóstico rápido do Lucrivo

## 1. Objetivo e escopo

O diagnóstico rápido do Lucrivo procura responder, em linguagem simples, três perguntas do dono do negócio:

1. **Estou ganhando dinheiro em cada venda ou atendimento?**
2. **O preço que cobro é suficiente para cobrir a operação e atingir minha meta?**
3. **O que devo corrigir primeiro: custo, preço, margem ou volume de vendas?**

Este documento trata somente do **diagnóstico rápido de um único produto, produção ou serviço**. A análise detalhada de vários produtos, a ficha técnica completa do estoque, o painel demonstrativo e a comparação histórica não fazem parte deste escopo.

O sistema não pesquisa preços de concorrentes e não determina um “preço correto de mercado”. Ele calcula referências com base exclusivamente nos números informados pelo usuário e na meta de lucro adotada.

---

## 2. Visão geral do fluxo

```text
Início do diagnóstico
        |
        v
Escolha do que será analisado
        |
        +--> Serviço
        |      +--> cobrança por hora
        |      +--> cobrança por atendimento
        |      +--> cobrança por minuto
        |
        +--> Produto
        |      +--> diagnóstico rápido de revenda
        |      +--> sair do rápido e abrir análise detalhada
        |
        +--> Produção
               +--> diagnóstico rápido de uma unidade
               +--> análise detalhada/ficha técnica (Em breve)
        |
        v
Perguntas sobre custo, preço, capacidade e despesas
        |
        v
Perguntas sobre imposto e cartão
        |
        v
Resultado imediato
        |
        +--> veredito de margem
        +--> principal ponto a corrigir
        +--> preço mínimo e preço-alvo
        +--> lucro e margem por unidade/atendimento
        +--> meta de vendas
        +--> simulador de desconto
        +--> ajustar respostas
        +--> salvar diagnóstico
        +--> solicitar interpretação por IA
        +--> opcionalmente seguir para análise de vários produtos
```

---

## 3. Caminhos disponíveis

### 3.1 Serviço

O usuário informa:

- quanto deseja retirar por mês como pró-labore;
- total das contas fixas mensais;
- quantidade de horas efetivamente faturáveis por mês;
- dias trabalhados por semana;
- como cobra pelo trabalho;
- preço atualmente cobrado;
- duração média, quando a cobrança não é simplesmente por hora;
- percentuais de imposto e cartão.

Existem três formas de cobrança:

| Opção           | Como o preço é interpretado                        | Unidade usada no resultado |
| --------------- | -------------------------------------------------- | -------------------------- |
| Por hora        | O valor informado já é o preço de uma hora         | Hora                       |
| Por atendimento | O valor informado é o preço completo de uma sessão | Atendimento                |
| Por minuto      | Preço por minuto × duração média da sessão         | Atendimento                |

Na cobrança por atendimento ou minuto, a duração é convertida em horas para descobrir quanto da capacidade mensal é consumida por uma sessão.

### 3.2 Produto de revenda

Depois de escolher “Um produto”, o usuário decide entre:

- **Diagnóstico rápido:** analisa um único produto com poucos dados;
- **Análise detalhada:** deixa o fluxo rápido e abre o cadastro de vários itens.

No caminho rápido de revenda, são solicitados:

- custo de compra de uma unidade;
- preço de venda de uma unidade;
- contas fixas mensais;
- volume médio vendido por mês, opcional;
- pró-labore desejado, opcional;
- imposto e taxa de cartão.

### 3.3 Produção própria

O caminho é semelhante ao da revenda, mas o custo informado representa o valor necessário para fabricar uma unidade.

No diagnóstico rápido guiado, o usuário escolhe uma destas formas de informar o custo:

- **custo resumido:** um único valor positivo para o custo da unidade pronta;
- **custo composto:** soma de materiais, embalagem, mão de obra direta e outros custos variáveis por unidade.

A composição fixa de quatro categorias não é uma ficha técnica: ela não cadastra ingredientes, receita, lote, estoque, rendimento ou desperdício. Esses detalhamentos permanecem reservados para uma análise futura.

O volume mensal significa **unidades vendidas**, não unidades apenas produzidas. A mão de obra direta representa o trabalho variável necessário para fabricar cada unidade e não deve repetir a remuneração mensal do dono, que é informada separadamente como pró-labore.

---

## 4. Parâmetros utilizados

### 4.1 Parâmetros comuns

| Parâmetro            | Significado para o negócio                                                        | Efeito no resultado                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Preço atual          | Valor cobrado do cliente                                                          | Base da receita e de todas as margens                                                                                 |
| Custos fixos mensais | Gastos que existem mesmo sem vender, como aluguel, luz, contador e salários fixos | Precisam ser absorvidos pelas vendas ou horas faturáveis                                                              |
| Pró-labore           | Salário desejado pelo dono                                                        | Quando ligado, é tratado como parte do custo mensal                                                                   |
| Imposto              | Percentual do preço destinado a tributos                                          | Reduz o valor líquido de cada venda                                                                                   |
| Taxa de cartão       | Percentual descontado pela forma de pagamento                                     | Reduz o valor líquido de cada venda                                                                                   |
| Meta de margem       | Percentual de lucro usado como referência                                         | Define o preço-alvo e a classificação da margem; no fluxo atual é um valor inicial interno, não perguntado ao usuário |
| Dias por semana      | Dias de funcionamento ou atendimento                                              | Divide a meta mensal em metas semanais e diárias                                                                      |
| Desconto simulado    | Redução percentual aplicada ao preço atual                                        | Recalcula preço, lucro e margem após o desconto                                                                       |

### 4.2 Parâmetros de produtos

| Parâmetro                   | Significado                                            | Observação                                   |
| --------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Custo de compra             | Valor pago ao fornecedor por unidade                   | Usado na revenda                             |
| Custo de produção           | Custo resumido da unidade pronta ou soma da composição fixa | Usado na produção própria                 |
| Embalagem por unidade       | Embalagem consumida para fabricar uma unidade               | Uma das quatro categorias da composição   |
| Mão de obra direta          | Trabalho variável necessário para fabricar uma unidade      | Não deve duplicar o pró-labore mensal     |
| Volume mensal               | Quantidade média de unidades vendidas no mês                 | Permite dividir o custo fixo por unidade  |
| Rendimento                  | Quantas unidades uma receita ou lote produz                  | Fora do diagnóstico rápido; escopo futuro |
| Perda/desperdício           | Parte da produção que não vira venda                        | Fora do diagnóstico rápido; escopo futuro |

### 4.3 Parâmetros de serviços

| Parâmetro              | Significado                                       | Observação                                                               |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Horas faturáveis       | Horas do mês que realmente são pagas por clientes | Não devem incluir estudo, deslocamento, administração ou horários vazios |
| Duração do atendimento | Tempo médio de uma sessão                         | Converte o custo da hora em custo por atendimento                        |
| Forma de cobrança      | Hora, atendimento ou minuto                       | Determina a unidade usada no diagnóstico                                 |

### 4.4 Valores iniciais adotados atualmente

O comportamento atual começa com alguns valores predefinidos:

- meta de margem de **20% para produtos e produção própria**;
- meta de margem de **15% para serviços**;
- simulação inicial de **10% de desconto**;
- referência de **6 dias por semana para produtos e produção própria**;
- referência de **5 dias por semana para serviços**;
- pró-labore inicialmente desligado para produtos e produção própria;
- pró-labore inicialmente ligado para serviços.

No fluxo rápido atual, a meta de margem não é perguntada e também não há um controle visível para alterá-la na tela de resultado. Assim, o preço-alvo e a classificação usam automaticamente 20% ou 15%, conforme a trilha. O motor possui suporte para outras metas, mas essa escolha ainda não está exposta nessa jornada.

Campos numéricos vazios ou inválidos são tratados como **zero**. Isso permite continuar o diagnóstico, mas também significa que um campo esquecido pode tornar o resultado incompleto.

---

## 5. Conceitos centrais usados pelo sistema

### 5.1 Custo direto ou variável

É o custo que aparece porque uma venda aconteceu.

- Na revenda: custo pago ao fornecedor.
- Na produção rápida: custo resumido da unidade pronta ou soma de materiais, embalagem, mão de obra direta e outros custos variáveis.
- Pode incluir frete ou embalagem por unidade.
- Imposto, cartão e comissão também variam com a venda, mas são tratados como percentuais sobre o preço.

### 5.2 Custo fixo

É o gasto mensal que existe mesmo que nenhuma venda aconteça. Exemplos: aluguel, energia mínima, contador, sistemas e salários fixos.

O sistema permite informar um total único ou detalhá-lo por categoria. No detalhamento, os itens são somados e passam a formar o custo fixo mensal.

### 5.3 Pró-labore

É o salário do dono pelo trabalho realizado no negócio. Quando ativado, é somado aos custos fixos.

Isso separa duas realidades:

- **sem pró-labore:** o negócio paga apenas sua operação;
- **com pró-labore:** além de pagar a operação, o negócio também remunera o dono.

### 5.4 Margem aparente

É a sobra que parece existir quando se olha apenas para preço e custo direto:

```text
Margem aparente = (Preço - Custo direto) ÷ Preço
```

Ela não considera necessariamente imposto, cartão, frete, despesas fixas e pró-labore. Por isso pode transmitir uma sensação de lucro maior do que a realidade.

### 5.5 Margem real

É o percentual que efetivamente sobra depois dos custos considerados:

```text
Margem real = Lucro por unidade ÷ Preço
```

Essa é a margem usada no veredito.

### 5.6 Margem de contribuição

É quanto uma venda deixa disponível para pagar os custos fixos:

```text
Contribuição por unidade =
Preço líquido após taxas - Custo direto - Frete/embalagem
```

Se a contribuição for negativa, cada nova venda aumenta o prejuízo. Nenhum aumento de volume resolve essa situação enquanto preço ou custo não forem corrigidos.

---

## 6. Como os produtos são calculados

Para facilitar a leitura, considere:

- **P** = preço atual;
- **CD** = custo direto por unidade;
- **FE** = frete ou embalagem por unidade;
- **CF** = custo fixo mensal;
- **PL** = pró-labore mensal, quando ligado;
- **Q** = quantidade vendida por mês;
- **T** = soma percentual de imposto, cartão e eventual comissão;
- **M** = meta de margem.

### 6.1 Custo direto

Na revenda:

```text
CD = custo de compra por unidade
```

Na produção rápida:

```text
CD = custo resumido informado para fabricar uma unidade

ou

CD = materiais + embalagem + mão de obra direta + outros custos variáveis
```

Na composição, a mão de obra direta é variável por unidade e não inclui o pró-labore mensal do dono. Um cálculo por ingredientes, rendimento e desperdício pertence à futura análise detalhada e não é realizado pelo diagnóstico rápido atual:

```text
Custo dos insumos da receita = soma de (quantidade × custo unitário de cada insumo)

CD = custo dos insumos da receita ÷ rendimento ÷ (1 - percentual de perda)
```

Exemplo: uma receita custa R$ 100, rende 20 unidades e perde 10%:

```text
CD = 100 ÷ 20 ÷ 0,90 = R$ 5,56 por unidade vendável
```

### 6.2 Custo fixo efetivo

```text
Custo fixo efetivo = CF + PL, quando o pró-labore está ligado
```

Se o pró-labore estiver desligado, apenas o custo fixo operacional é considerado.

### 6.3 Rateio do custo fixo por unidade

Quando o volume mensal foi informado:

```text
Rateio por unidade = custo fixo efetivo ÷ Q
```

Quando o volume não foi informado, o rateio é considerado zero. Nesse caso, o sistema avisa que a margem é anterior ao rateio dos custos fixos e não deve ser tratada como resultado definitivo.

### 6.4 Custo total considerado por unidade

```text
Custo total por unidade = CD + FE + rateio por unidade
```

### 6.5 Percentuais descontados da venda

```text
T = imposto + cartão + comissão de plataforma, quando aplicável
```

Exemplo: imposto de 6% e cartão de 3% resultam em T = 9%. Portanto, de cada R$ 100 vendidos, R$ 91 permanecem antes dos demais custos.

### 6.6 Lucro por unidade

```text
Lucro por unidade = P × (1 - T) - custo total por unidade
```

### 6.7 Margem real

```text
Margem real = lucro por unidade ÷ P
```

### 6.8 Preço mínimo para não ter prejuízo

```text
Preço mínimo = custo total por unidade ÷ (1 - T)
```

Nesse valor, a margem é zero. Abaixo dele, há prejuízo; acima dele, existe alguma sobra.

### 6.9 Preço-alvo

```text
Preço-alvo = custo total por unidade ÷ (1 - T - M)
```

O preço-alvo é o necessário para atingir a meta de referência. No fluxo rápido atual, essa referência é 20% para produto e produção própria. Ele só é possível quando a soma das taxas e da meta é menor que 100%.

### 6.10 Quantidade necessária para cobrir o mês

Primeiro é calculado quanto cada unidade contribui para pagar a estrutura:

```text
Contribuição por unidade = P × (1 - T) - CD - FE
```

Depois:

```text
Quantidade mínima mensal = custo fixo efetivo ÷ contribuição por unidade
```

O resultado é arredondado para cima, pois não é possível vender uma fração de unidade. Se a contribuição for zero ou negativa, o sistema informa que não existe volume capaz de fechar a conta nesse preço.

---

## 7. Como os serviços são calculados

Considere:

- **CF** = custos fixos mensais;
- **PL** = pró-labore, quando ligado;
- **H** = horas faturáveis no mês;
- **D** = duração do atendimento em horas;
- **P** = preço da hora ou do atendimento;
- **T** = imposto + cartão + eventual comissão;
- **M** = meta de margem.

### 7.1 Custo mensal da atividade

```text
Custo mensal = CF + PL
```

No serviço, o pró-labore começa ligado. Se for desligado, o resultado mostra apenas o mínimo necessário para manter a operação, sem remunerar o profissional.

### 7.2 Custo real da hora

```text
Custo real da hora = custo mensal ÷ H
```

Somente horas que podem ser cobradas do cliente devem entrar em H. Quanto menor a quantidade de horas faturáveis, maior será o custo de cada hora.

### 7.3 Custo por atendimento

```text
Custo por atendimento = custo real da hora × D
```

Se uma sessão dura 50 minutos:

```text
D = 50 ÷ 60 = 0,8333 hora
```

### 7.4 Preço considerado

- Por hora: P é o preço informado por hora.
- Por atendimento: P é o preço completo da sessão.
- Por minuto: P é o preço por minuto multiplicado pela duração em minutos.

### 7.5 Lucro e margem

```text
Lucro por hora ou atendimento = P × (1 - T) - custo da hora ou atendimento

Margem real = lucro ÷ P
```

### 7.6 Preço mínimo e preço-alvo

```text
Preço mínimo = custo da hora ou atendimento ÷ (1 - T)

Preço-alvo = custo da hora ou atendimento ÷ (1 - T - M)
```

No fluxo rápido atual, M começa fixada em 15% para serviços.

### 7.7 Capacidade mensal

- Se a cobrança é por hora, a capacidade é igual às horas faturáveis mensais.
- Se a cobrança é por atendimento, a capacidade estimada é:

```text
Capacidade de atendimentos = H ÷ D
```

### 7.8 Meta de vendas do serviço

O sistema calcula primeiro o faturamento necessário para cobrir custos fixos e pró-labore, já descontando as taxas:

```text
Faturamento necessário = (CF + PL) ÷ (1 - T)
```

Depois converte esse faturamento em horas ou atendimentos:

```text
Meta mensal = faturamento necessário ÷ P
```

Essa meta representa o volume necessário para cobrir a estrutura e o pró-labore. A meta de margem adicional é usada principalmente para calcular o preço-alvo, não para aumentar essa meta operacional de vendas.

---

## 8. Regras do veredito

### 8.1 Classificação da margem

| Situação             | Condição usada                                                     | Resultado apresentado                          |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| Sem preço            | Preço igual ou menor que zero                                      | Solicita o preenchimento do preço              |
| Prejuízo direto      | Produto não cobre custo direto, frete e taxas                      | Cada venda tira dinheiro do caixa              |
| Prejuízo operacional | O custo direto é coberto, mas a margem real é zero ou negativa     | Preço não cobre toda a operação                |
| Margem apertada      | Margem positiva, porém mais de 0,5 ponto percentual abaixo da meta | Cobre custos, mas sobra menos que o desejado   |
| Margem adequada      | Margem alcança a faixa da meta                                     | Preço considerado suficiente para a meta       |
| Acima da meta        | Margem supera a meta em mais de 3 pontos percentuais               | Há folga; deve-se validar aceitação do mercado |

As tolerâncias evitam que diferenças mínimas de arredondamento mudem a classificação:

- até **0,5 ponto percentual abaixo da meta** ainda pode ser tratado como adequado;
- só é “acima da meta” quando ultrapassa a meta em mais de **3 pontos percentuais**.

### 8.2 Escolha do principal ponto a corrigir

O sistema escolhe apenas uma prioridade principal:

| Prioridade | Quando é escolhida                                                                    | Orientação central                                   |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Custo      | Produto não cobre nem os custos variáveis da unidade                                  | Reduzir custo ou elevar preço antes de buscar volume |
| Preço      | A venda cobre o variável, mas não paga toda a estrutura; ou serviço fecha no vermelho | Corrigir o preço para sair do prejuízo               |
| Margem     | Existe lucro, porém está abaixo da meta                                               | Subir preço, reduzir custo ou agregar valor          |
| Volume     | O preço já cobre os custos e alcança a meta                                           | Buscar o número necessário de clientes ou vendas     |

Essa prioridade também orienta a resposta “O que preciso fazer agora?” e a interpretação enviada à IA.

### 8.3 As três respostas finais

O resumo transforma os cálculos em três respostas diretas:

- **Estou ganhando dinheiro?** Usa a situação da margem.
- **Estou cobrando o preço certo?** Compara o preço atual com o preço mínimo e o preço-alvo.
- **O que preciso fazer agora?** Usa a prioridade entre custo, preço, margem e volume.

---

## 9. Régua de preço

A régua organiza os valores em três zonas:

```text
Abaixo do preço mínimo
        = prejuízo

Do preço mínimo até o preço-alvo
        = cobre os custos, mas fica abaixo da meta

No preço-alvo ou acima
        = alcança a meta definida
```

O preço-alvo não é uma recomendação de mercado. É uma referência financeira baseada nos custos, taxas e meta utilizada pelo sistema. Atualmente, essa meta é predefinida no fluxo rápido.

---

## 10. Simulador de desconto

O simulador aceita descontos de 0% a 50% e recalcula os resultados imediatamente.

```text
Novo preço = preço atual × (1 - desconto)

Novo lucro = novo preço × (1 - T) - custo total da unidade/atendimento

Nova margem = novo lucro ÷ novo preço
```

O limite máximo de desconto antes do prejuízo é:

```text
Teto de desconto = 1 - (preço mínimo ÷ preço atual)
```

Esse teto indica apenas o ponto em que o lucro chega a zero. Um desconto abaixo do teto ainda pode reduzir a margem para menos do que a meta desejada.

---

## 11. Meta mensal, semanal e diária

Quando existe uma meta mensal válida, o sistema a traduz para o cotidiano:

```text
Meta semanal = meta mensal ÷ 4,33

Meta diária = meta semanal ÷ dias trabalhados por semana
```

Os volumes apresentados são arredondados para cima. Se o negócio estiver no prejuízo, o sistema evita recomendar aumento de vendas e orienta primeiro a correção de preço ou custo.

---

## 12. Campos adicionais após o primeiro resultado

Depois de concluir as perguntas guiadas, o usuário pode ajustar ou complementar os números, incluindo:

- frete e embalagem por unidade;
- custos fixos detalhados;
- dias de funcionamento;
- ativação ou desativação do pró-labore;
- investimento inicial;
- produto ou serviço digital;
- comissão de plataforma.

Para itens digitais, o comportamento atual zera o custo direto e o frete por unidade, acrescentando a comissão da plataforma ao total de taxas percentuais.

O investimento inicial não altera preço, margem, ponto de equilíbrio nem os demais resultados atualmente exibidos no diagnóstico rápido. O dado é coletado, mas a estimativa de retorno do investimento não está apresentada nessa jornada atual.

---

## 13. Regras de meta existentes no motor de cálculo

O motor foi preparado para trabalhar com a meta de duas formas, embora os controles para escolhê-las não estejam atualmente visíveis no diagnóstico rápido. Por isso, esta seção descreve uma capacidade interna existente, e não uma opção disponível ao usuário nessa jornada.

### Opção A — margem percentual

O usuário informa diretamente o percentual desejado. Exemplos: 15%, 20% ou 30%.

No comportamento visível atual, são aplicados automaticamente 20% para produto e produção própria e 15% para serviço.

### Opção B — lucro desejado em reais

O usuário informa quanto deseja lucrar no mês, além do pró-labore. O sistema converte esse valor em uma margem equivalente.

Para produto, o lucro mensal é primeiro dividido pelo volume mensal para encontrar o lucro desejado por unidade. Sem volume informado, essa conversão resulta em meta zero e não produz uma referência útil.

Para serviço, o lucro mensal desejado é comparado ao custo mensal formado por despesas fixas e pró-labore.

---

## 14. Salvamento e relatório por IA

Ao salvar, o sistema registra um retrato do diagnóstico contendo, entre outros dados:

- tipo analisado;
- entradas informadas;
- preço atual;
- margem real;
- preço mínimo;
- preço-alvo;
- lucro por unidade ou atendimento;
- contribuição por venda;
- situação da margem;
- principal ponto a corrigir;
- indicação de ausência de volume.

A IA não realiza os cálculos principais. O motor de regras calcula os números primeiro; a IA recebe o retrato pronto para explicá-lo em linguagem consultiva.

No protótipo fora do ambiente original, o salvamento pode não persistir após recarregar a página e o relatório de IA pode exibir uma mensagem de indisponibilidade. Essas limitações não alteram os cálculos exibidos na tela.

---

## 15. Premissas, limites e cuidados de interpretação

1. **A qualidade do resultado depende dos dados informados.** Um custo omitido é interpretado como zero.
2. **Produto ou produção sem volume mensal gera análise parcial.** O custo fixo não é dividido por unidade, deixando a margem aparentemente maior.
3. **Serviço sem horas faturáveis também fica incompleto.** O custo da hora passa a zero, tornando o resultado irreal.
4. **Imposto e cartão em branco são considerados zero.** Isso pode superestimar a margem.
5. **O sistema não avalia demanda ou concorrência.** Um preço financeiramente saudável ainda pode não ser aceito pelo mercado.
6. **A meta atual é uma referência predefinida, não uma recomendação setorial.** Os 20% de produto e produção e os 15% de serviço não garantem adequação ao ramo, à região ou ao mercado.
7. **Taxas mais meta precisam somar menos de 100%.** Caso contrário, não existe preço-alvo matematicamente possível.
8. **Rendimento e perda de produção não fazem parte do diagnóstico rápido atual.** Essas informações serão tratadas apenas na futura análise detalhada/ficha técnica.
9. **O ponto de equilíbrio não representa necessariamente crescimento.** Ele mostra o mínimo para cobrir a estrutura; lucro adicional exige margem ou volume superior.
10. **O teto de desconto significa lucro zero, não margem saudável.** A empresa pode continuar no azul e, ainda assim, ficar abaixo da meta.

---

## 16. Exemplo resumido de produto

Considere um produto com:

- preço atual: R$ 50;
- custo direto: R$ 20;
- frete/embalagem: R$ 2;
- custos fixos com pró-labore: R$ 3.000 por mês;
- volume: 200 unidades por mês;
- imposto + cartão: 10%;
- meta de margem: 20%.

```text
Rateio fixo = 3.000 ÷ 200 = R$ 15

Custo total por unidade = 20 + 2 + 15 = R$ 37

Receita líquida após taxas = 50 × 90% = R$ 45

Lucro por unidade = 45 - 37 = R$ 8

Margem real = 8 ÷ 50 = 16%

Preço mínimo = 37 ÷ 90% = R$ 41,11

Preço-alvo = 37 ÷ (100% - 10% - 20%) = R$ 52,86
```

Interpretação: o produto não dá prejuízo, mas a margem de 16% está abaixo da meta de 20%. A prioridade será **margem**, e os caminhos são elevar o preço ou reduzir custos.

---

## 17. Exemplo resumido de serviço

Considere um profissional com:

- custos fixos: R$ 2.000 por mês;
- pró-labore: R$ 4.000 por mês;
- 100 horas faturáveis por mês;
- atendimentos de 50 minutos;
- preço por atendimento: R$ 80;
- imposto + cartão: 8%;
- meta de margem: 15%.

```text
Custo mensal = 2.000 + 4.000 = R$ 6.000

Custo real da hora = 6.000 ÷ 100 = R$ 60

Duração em horas = 50 ÷ 60 = 0,8333

Custo por atendimento = 60 × 0,8333 = R$ 50

Receita líquida do atendimento = 80 × 92% = R$ 73,60

Lucro por atendimento = 73,60 - 50 = R$ 23,60

Margem real = 23,60 ÷ 80 = 29,5%

Preço mínimo = 50 ÷ 92% = R$ 54,35

Preço-alvo = 50 ÷ (100% - 8% - 15%) = R$ 64,94
```

Interpretação: o preço cobre os custos e supera a meta em mais de 3 pontos percentuais. O diagnóstico classifica a margem como **acima da meta**, e a prioridade passa a ser **volume**.

---

## 18. Síntese da lógica de decisão

```text
O preço foi informado?
  Não -> solicitar preço
  Sim -> continuar

Produto cobre custo direto, frete e taxas?
  Não -> prejuízo; prioridade = custo
  Sim -> continuar

O preço cobre também o custo fixo rateado ou o custo do serviço?
  Não -> prejuízo; prioridade = preço
  Sim -> continuar

A margem real está abaixo da meta?
  Sim -> margem apertada; prioridade = margem
  Não -> continuar

A margem supera a meta em mais de 3 pontos percentuais?
  Sim -> acima da meta; prioridade = volume
  Não -> margem adequada; prioridade = volume
```

Em resumo, o diagnóstico rápido segue uma ordem de proteção do negócio: primeiro impede que cada venda gere perda, depois verifica se a estrutura inteira é paga, em seguida compara o lucro com a meta e, somente quando o preço se sustenta, recomenda buscar mais volume.
