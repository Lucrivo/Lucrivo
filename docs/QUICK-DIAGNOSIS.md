# Relatório das regras de negócio — Diagnóstico rápido do Lucrivo

## 1. Objetivo e escopo

O diagnóstico rápido do Lucrivo procura responder, em linguagem simples, três perguntas do dono do negócio:

1. **Estou ganhando dinheiro em cada venda ou atendimento?**
2. **O preço que cobro é suficiente para pagar os gastos do negócio?**
3. **O que devo corrigir primeiro: custo, preço, margem ou volume de vendas?**

Este documento trata somente do **diagnóstico rápido de um único produto, produção ou serviço**. A análise detalhada de vários produtos, a ficha técnica completa do estoque, o painel demonstrativo e a comparação histórica não fazem parte deste escopo.

O sistema não pesquisa preços de concorrentes e não determina um “preço correto de mercado”. Ele calcula referências com base exclusivamente nos números informados pelo usuário. Nenhuma categoria usa uma margem universal como meta, corte de veredito ou base para recomendar preço.

Cada usuário pode criar exatamente um diagnóstico rápido gratuito, tenha ou não acesso pago ou cortesia. Um diagnóstico detalhado não consome esse benefício. Excluir o relatório rápido, inclusive de forma lógica, não devolve o direito de criar outro gratuito. Sem acesso vigente, a tentativa de criar um segundo diagnóstico rápido é recusada.

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
        |      +--> diagnóstico rápido de produto digital
        |      +--> sair do rápido e abrir análise detalhada
        |
        +--> Produção
               +--> diagnóstico rápido de uma unidade
               +--> sair do rápido e abrir análise detalhada/ficha técnica
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
        +--> veredito objetivo do resultado
        +--> principal ponto a corrigir
        +--> preço atual e menor preço sem prejuízo
        +--> resultado do mês e quanto sobra a cada R$ 100
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
- período usado para informar as horas faturáveis: dia, semana ou mês;
- quantidade de horas efetivamente faturáveis nesse período;
- dias trabalhados por semana;
- como cobra pelo trabalho;
- preço atualmente cobrado;
- duração média, quando a cobrança não é simplesmente por hora;
- existência e valor de material consumido diretamente no serviço;
- percentuais de imposto e cartão.

Existem seis formas de cobrança:

| Opção           | Como o preço é interpretado                        | Unidade usada no resultado |
| --------------- | -------------------------------------------------- | -------------------------- |
| Por hora        | O valor informado já é o preço de uma hora         | Hora                       |
| Por atendimento | O valor informado é o preço completo de uma sessão | Atendimento                |
| Por minuto      | Preço por minuto × duração média da sessão         | Atendimento                |
| Por dia         | Valor da diária dividido pelas horas do dia        | Hora                       |
| Por semana      | Valor semanal dividido pelas horas da semana       | Hora                       |
| Por mês         | Valor mensal dividido pelas horas do mês           | Hora                       |

O motor mantém a resposta original e também cria um valor comparável. Minuto, hora, dia, semana e mês são convertidos para hora; atendimento continua sendo atendimento. A capacidade mensal usa **4,33 semanas por mês**:

```text
minuto -> preço informado × 60
dia    -> preço informado × 60 ÷ minutos trabalhados no dia
semana -> preço informado × 60 ÷ (minutos por dia × dias por semana)
mês    -> preço informado × 60 ÷ minutos trabalhados no mês

minutos no mês = minutos por dia × dias por semana × 4,33
```

A duração do serviço é obrigatória quando a cobrança é por atendimento. Ela também é solicitada quando o material é informado por atendimento e o preço usa outra unidade; nesse caso, serve apenas para distribuir esse gasto na comparação por hora.

O relatório mostra a conversão em um popover, com o preço original e seu equivalente por hora. Os dois valores são salvos para que o cálculo continue verificável.

### 3.2 Produto para revenda ou digital

Depois de escolher “Um produto”, o usuário decide entre:

- **Diagnóstico rápido:** analisa um único produto com poucos dados;
- **Análise detalhada:** deixa o fluxo rápido e abre o cadastro de vários itens.

No caminho rápido, o usuário escolhe entre **Produto para revenda** e **Produto digital**. São solicitados:

- custo de compra de uma unidade na revenda ou gasto que acontece a cada venda no produto digital; ambos aceitam zero;
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

A composição fixa de quatro categorias não é uma ficha técnica: ela não cadastra ingredientes, receita, lote, estoque, rendimento ou desperdício. Esses detalhamentos pertencem ao diagnóstico detalhado de Produção, não ao caminho rápido.

O volume mensal significa **unidades vendidas**, não unidades apenas produzidas. A mão de obra direta representa o trabalho variável necessário para fabricar cada unidade e não deve repetir a remuneração mensal do dono, que é informada separadamente como pró-labore.

---

## 4. Parâmetros utilizados

### 4.1 Parâmetros comuns

| Parâmetro            | Significado para o negócio                                                        | Efeito no resultado                                      |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Preço atual          | Valor cobrado do cliente                                                          | Base da receita e de todas as margens                    |
| Custos fixos mensais | Gastos que existem mesmo sem vender, como aluguel, luz, contador e salários fixos | Precisam ser absorvidos pelas vendas ou horas faturáveis |
| Pró-labore           | Salário desejado pelo dono                                                        | Quando ligado, é tratado como parte do custo mensal      |
| Imposto              | Percentual do preço destinado a tributos                                          | Reduz o valor líquido de cada venda                      |
| Taxa de cartão       | Percentual descontado pela forma de pagamento                                     | Reduz o valor líquido de cada venda                      |
| Dias por semana      | Dias de funcionamento ou atendimento                                              | Divide a meta mensal em metas semanais e diárias         |
| Desconto simulado    | Redução percentual aplicada ao preço atual                                        | Recalcula preço, lucro e margem após o desconto          |

### 4.2 Parâmetros de produtos

| Parâmetro             | Significado                                                 | Observação                                                  |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Custo de compra       | Valor pago ao fornecedor por unidade                        | Opcional; vazio ou zero representa ausência de custo direto |
| Custo de produção     | Custo resumido da unidade pronta ou soma da composição fixa | Usado na produção própria                                   |
| Embalagem por unidade | Embalagem consumida para fabricar uma unidade               | Uma das quatro categorias da composição                     |
| Mão de obra direta    | Trabalho variável necessário para fabricar uma unidade      | Não deve duplicar o pró-labore mensal                       |
| Volume mensal         | Quantidade média de unidades vendidas no mês                | Permite dividir o custo fixo por unidade                    |
| Rendimento            | Quantas unidades uma receita ou lote produz                 | Fora do diagnóstico rápido; escopo futuro                   |
| Perda/desperdício     | Parte da produção que não vira venda                        | Fora do diagnóstico rápido; escopo futuro                   |

### 4.3 Parâmetros de serviços

| Parâmetro              | Significado                                             | Observação                                                                     |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Período das horas      | Dia, semana ou mês usado para informar a capacidade     | O valor é normalizado para uma capacidade mensal                               |
| Horas faturáveis       | Horas que realmente podem ser cobradas dos clientes     | Não incluem estudo, deslocamento, administração ou horários vazios             |
| Duração do atendimento | Tempo médio de uma sessão                               | Converte o custo da hora em custo por atendimento                              |
| Forma de cobrança      | Hora, atendimento ou minuto                             | Determina a unidade usada para preço, custo e resultado                        |
| Material direto        | Material consumido somente quando o serviço é realizado | É informado por hora ou atendimento e nunca é dividido pelas horas disponíveis |

### 4.4 Valores iniciais adotados atualmente

O comportamento atual começa com alguns valores predefinidos:

- simulação inicial de **10% de desconto**;
- referência de **6 dias por semana para produtos e produção própria**;
- referência de **5 dias por semana para serviços**;
- pró-labore inicialmente desligado para produtos e produção própria;
- pró-labore mensal informado diretamente no fluxo de serviços.

Não existe margem padrão aplicada a Produto, Produção ou Serviço. O percentual real é descritivo: mostra quanto sobra a cada R$ 100, mas não transforma um resultado positivo em alerta por ficar abaixo de um número arbitrário.

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

Esse percentual descreve o resultado. O veredito usa sinais objetivos: perda direta, dados incompletos, ausência de vendas, resultado negativo, equilíbrio ou resultado positivo.

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
- **CF** = custo fixo mensal;
- **PL** = pró-labore mensal, quando ligado;
- **Q** = quantidade vendida por mês;
- **T** = soma percentual de imposto, cartão e eventual comissão;

### 6.1 Custo direto

Na revenda:

```text
CD = custo de compra por unidade
```

Na revenda, o custo de compra pode ser zero. No produto digital, **CD** representa licença, plataforma, entrega ou outra cobrança que acontece a cada venda; vazio ou zero significa ausência de custo direto.

Na produção rápida:

```text
CD = custo resumido informado para fabricar uma unidade

ou

CD = materiais + embalagem + mão de obra direta + outros custos variáveis
```

Na composição, a mão de obra direta é variável por unidade e não inclui o pró-labore mensal do dono. O cálculo por ingredientes, rendimento e desperdício pertence ao diagnóstico detalhado e não é realizado pelo diagnóstico rápido:

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

### 6.3 Quantidade usada e resultado mensal

Os relatórios atuais preservam a resposta original e distinguem três estados:

- **volume vazio:** significa que o usuário ainda não sabe ou não informou a quantidade. O diagnóstico é parcial; faturamento, resultado mensal, rateio dos gastos, custo completo por unidade, menor preço completo, lucro unitário e margem real ficam indisponíveis. A quantidade mensal necessária no preço atual ainda pode ser calculada pela contribuição da venda; as referências semanal e diária ficam ocultas;
- **volume igual a zero:** significa um mês conhecido sem vendas. O faturamento é zero e o resultado mensal é o negativo dos gastos mensais efetivos. Como não há unidades para receber o rateio, custo completo, menor preço completo, lucro unitário e margem real ficam indisponíveis;
- **volume positivo:** permite ratear os gastos mensais e calcular a análise mensal e unitária completa.

Em todos os casos, o valor deixado por venda continua sendo calculado a partir de preço, taxas e custo direto. Os gastos mensais permanecem inteiros e nunca são divididos por zero.

Os relatórios criados pelo comportamento atual persistem exatamente esses estados; volume desconhecido nunca é convertido em zero.

### 6.4 Custo total considerado por unidade

```text
Custo total por unidade = CD + gastos mensais ÷ Q
```

Esse valor só existe quando `Q > 0`.

### 6.5 Percentuais descontados da venda

```text
T = imposto + cartão + comissão de plataforma, quando aplicável
```

Exemplo: imposto de 6% e cartão de 3% resultam em T = 9%. Portanto, de cada R$ 100 vendidos, R$ 91 permanecem antes dos demais custos.

### 6.6 Valor deixado por venda e resultado do mês

```text
Valor deixado por venda = P × (1 - T) - CD
Resultado do mês = valor deixado por venda × quantidade usada - custo fixo efetivo
```

### 6.7 Margem real

```text
Quanto sobra a cada R$ 100 = resultado do mês ÷ vendas brutas do mês
```

Sem vendas, esse percentual não é calculado.

### 6.8 Preço mínimo para não ter prejuízo

```text
Preço mínimo = custo total por unidade ÷ (1 - T), quando Q > 0
```

Sem quantidade positiva, o sistema não inventa um custo completo nem um menor preço por unidade. Ainda pode informar a quantidade mensal necessária no preço atual quando a contribuição unitária é positiva.

### 6.9 Ausência de preço-alvo

Os relatórios atuais não calculam nem exibem preço baseado em margem desejada. A única referência de preço é o menor valor que cobre o custo completo conhecido, e ela só existe quando há volume positivo para ratear os gastos mensais.

### 6.10 Quantidade necessária para cobrir o mês

Primeiro é calculado quanto cada unidade contribui para pagar a estrutura:

```text
Valor deixado por venda = P × (1 - T) - CD
```

Depois:

```text
Quantidade mínima mensal = custo fixo efetivo ÷ valor deixado por venda
```

O resultado é arredondado para cima, pois não é possível vender uma fração de unidade. Se a contribuição for zero ou negativa, o sistema informa que não existe volume capaz de fechar a conta nesse preço.

---

## 7. Como os serviços são calculados

Considere:

- **PL** = pró-labore mensal;
- **CF** = contas fixas mensais;
- **H** = horas faturáveis mensais normalizadas;
- **D** = duração da unidade vendida em horas;
- **CD** = custo direto de material por hora ou atendimento;
- **P** = preço da hora ou do atendimento;
- **V** = imposto + cartão;

### 7.1 Capacidade mensal normalizada

```text
mês    -> minutos informados
semana -> minutos informados × 4,33
dia    -> minutos informados × dias trabalhados por semana × 4,33
```

O cálculo usa minutos inteiros e arredondamento determinístico. Os limites são 24 horas por dia, 168 por semana e 744 por mês. Somente horas que podem ser cobradas entram na capacidade; estudo, administração, deslocamento e horários ociosos ficam de fora.

Os dias trabalhados não são um custo. Eles participam da conversão quando a capacidade foi informada por dia e também permitem traduzir a meta mensal em uma referência diária.

### 7.2 Custo de estrutura

```text
custoBase = pró-labore + contas fixas
custoHora = custoBase ÷ horas faturáveis mensais normalizadas
custoEstruturaUnit = custoHora × duração da unidade
```

Na cobrança por hora, a duração da unidade é uma hora. Nas cobranças por atendimento ou minuto, a duração informada é convertida para horas.

### 7.3 Custo direto e custo total

```text
materialUnit = custo de material informado
custoUnit = custoEstruturaUnit + materialUnit
```

O material é um custo direto e não passa pela divisão das horas disponíveis:

- cobrança por hora: material por hora faturada;
- cobrança por minuto: material do atendimento completo;
- cobrança por atendimento: material do atendimento completo.

Na cobrança por minuto, o preço por minuto é multiplicado pela duração, mas o material já representa o atendimento inteiro e não é multiplicado novamente.

### 7.4 Preço considerado

- Por hora: P é o preço informado por hora.
- Por atendimento: P é o preço completo da sessão.
- Por minuto: P é o preço por minuto multiplicado pela duração em minutos.

### 7.5 Receita, contribuição, lucro e margem

```text
receitaLiquidaUnit = preço × (1 − imposto − cartão)
contribUnit = receitaLiquidaUnit − materialUnit
lucroUnit = contribUnit − custoEstruturaUnit
margem real = lucroUnit ÷ preço
```

A contribuição mostra quanto cada venda deixa para pagar pró-labore e contas fixas depois de taxas e material. O lucro unitário também desconta o custo de estrutura rateado.

### 7.6 Menor preço sem prejuízo

```text
preço mínimo = custoUnit ÷ (1 − imposto − cartão)
```

O relatório de Serviço destaca somente o menor preço sem prejuízo. Nenhum percentual universal é acrescentado ao cálculo.

### 7.7 Capacidade mensal

- Se a cobrança é por hora, a capacidade é igual às horas faturáveis mensais.
- Se a cobrança é por atendimento ou minuto, a capacidade estimada é:

```text
Capacidade de atendimentos = H ÷ D
```

### 7.8 Meta de vendas do serviço

```text
meta mensal = teto(custoBase ÷ contribUnit)
```

Essa meta representa quantas horas ou atendimentos precisam contribuir para pagar a estrutura e o pró-labore. Se a contribuição for zero ou negativa, aumentar o volume não fecha a conta; cada nova venda mantém ou amplia o prejuízo.

---

## 8. Regras do veredito

### 8.1 Classificação objetiva

| Situação             | Condição usada                                                    | Resultado apresentado                |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| Preço ausente        | Serviço sem preço atual                                           | É necessário informar o preço        |
| Prejuízo direto      | Cada venda deixa valor igual ou inferior a zero após custo direto | Vender mais não resolve a perda      |
| Volume incompleto    | Produto ou Produção sem quantidade mensal informada               | Faltam dados para a análise completa |
| Sem vendas           | Quantidade mensal conhecida e igual a zero                        | O mês não teve vendas                |
| Prejuízo operacional | Resultado final menor que zero                                    | O mês não pagou os gastos informados |
| No limite            | Resultado final igual a zero                                      | O mês pagou exatamente os gastos     |
| Resultado positivo   | Resultado final maior que zero                                    | O mês terminou com valor positivo    |

O percentual de margem não muda essa classificação. Qualquer resultado acima de zero recebe o veredito objetivo de resultado positivo.

### 8.2 Escolha do principal ponto a corrigir

O sistema escolhe apenas uma prioridade principal entre custo, dados, preço e volume:

| Prioridade | Quando é escolhida                                                                    | Orientação central                                   |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Custo      | Produto não cobre nem os custos variáveis da unidade                                  | Reduzir custo ou elevar preço antes de buscar volume |
| Preço      | A venda cobre o variável, mas não paga toda a estrutura; ou serviço fecha no vermelho | Corrigir o preço para sair do prejuízo               |
| Volume     | O preço deixa valor positivo, mas o mês depende de mais vendas                        | Buscar o número necessário de clientes ou vendas     |

Essa prioridade também orienta a resposta “O que preciso fazer agora?” e a interpretação enviada à IA.

### 8.3 As três respostas finais

O resumo transforma os cálculos em três respostas diretas:

- **Estou ganhando dinheiro?** Usa a situação da margem.
- **Meu preço paga tudo?** Compara o preço atual com o menor preço sem prejuízo aplicável.
- **O que preciso fazer agora?** Usa a prioridade entre custo, preço, margem e volume.

---

## 9. Referências de preço

Nos relatórios atuais de Produto e Produção, a referência principal é o menor preço sem prejuízo:

```text
Abaixo do menor preço
        = prejuízo

No menor preço
        = no limite

Acima do menor preço
        = existe alguma sobra; a leitura mensal depende das vendas e gastos
```

Não existe uma segunda referência baseada em margem desejada.

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

Esse teto indica o ponto em que o lucro chega a zero. A simulação mostra objetivamente o novo lucro e a nova margem, sem compará-los a um percentual universal.

---

## 11. Meta mensal, semanal e diária

Quando existe uma meta mensal válida e o volume informado é conhecido, o sistema a traduz para o cotidiano:

```text
Meta semanal = meta mensal ÷ 4,33

Meta diária = meta semanal ÷ dias trabalhados por semana
```

Os volumes apresentados são arredondados para cima. Com volume vazio, a meta mensal permanece apenas como referência e as metas semanal e diária não são exibidas. Se o negócio estiver no prejuízo, o sistema evita recomendar aumento de vendas e orienta primeiro a correção de preço ou custo.

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

## 13. Ausência de margem universal

O motor atual não recebe nem aplica um percentual de margem desejada. Resultado e margem são consequências dos dados informados. O sistema pode mostrar o menor preço sem prejuízo e a quantidade necessária para pagar os gastos, mas não afirma qual margem seria ideal para um ramo, região ou estratégia comercial.

---

## 14. Salvamento e relatório por IA

Ao salvar, o sistema registra um retrato do diagnóstico contendo, entre outros dados:

- tipo analisado;
- entradas informadas;
- preço atual;
- margem real;
- preço mínimo;
- lucro por unidade ou atendimento;
- contribuição por venda;
- veredito objetivo do resultado;
- principal ponto a corrigir;
- indicação de ausência de volume.

A IA não realiza os cálculos principais. O motor de regras calcula os números primeiro; a IA recebe o retrato pronto para explicá-lo em linguagem consultiva.

Os contratos atuais mantiveram seus números de versão: Serviço `4/3/5`, Produto `3/3/4`, Produção `3/3/4` e Detalhado `1/1/1` (schema/cálculo/conteúdo). Os nomes públicos também permanecem `create_service_diagnosis_report_v4`, `create_product_diagnosis_report_v3`, `create_production_diagnosis_report_v3` e `create_detailed_diagnosis_report`.

Relatórios compatíveis podem ser editados por clientes com plano pago diretamente na página de detalhe, com uma prévia calculada em tempo real pelo mesmo motor determinístico usado no salvamento. Ao confirmar, o cliente escolhe entre substituir o registro atual ou salvar um novo relatório. A substituição atualiza o mesmo registro, preserva seu identificador e sua data de criação e incrementa a versão de concorrência; ela não cria uma cópia histórica oculta. A exclusão solicitada pelo cliente é lógica. Relatórios gerados durante um período de assinatura permanecem visíveis após o encerramento desse período.

Snapshots locais anteriores à correção não recebem camada de compatibilidade nem backfill e não fazem parte do seed atual. A aplicação e o seed validam somente os contratos atuais listados acima.

No protótipo fora do ambiente original, o salvamento pode não persistir após recarregar a página e o relatório de IA pode exibir uma mensagem de indisponibilidade. Essas limitações não alteram os cálculos exibidos na tela.

---

## 15. Premissas, limites e cuidados de interpretação

1. **A qualidade do resultado depende dos dados informados.** Um custo omitido é interpretado como zero.
2. **Volume vazio, zero e positivo têm significados diferentes.** Vazio gera análise parcial e não vira zero; zero representa um mês conhecido sem vendas; positivo produz a análise mensal completa. Snapshots antigos não são recalculados.
3. **Serviço sem horas faturáveis também fica incompleto.** O custo da hora passa a zero, tornando o resultado irreal.
4. **Imposto e cartão em branco são considerados zero.** Isso pode superestimar a margem.
5. **O sistema não avalia demanda ou concorrência.** Um preço financeiramente saudável ainda pode não ser aceito pelo mercado.
6. **Não existe margem universal.** A margem calculada descreve os dados informados e não garante adequação ao ramo, à região ou ao mercado.
7. **Taxas iguais ou superiores a 100% impedem uma referência de menor preço.** O relatório explica essa limitação sem inventar um valor.
8. **Rendimento e perda de produção não fazem parte do diagnóstico rápido atual.** Essas informações são tratadas somente no diagnóstico detalhado/ficha técnica.
9. **O ponto de equilíbrio não representa necessariamente crescimento.** Ele mostra o mínimo para cobrir a estrutura; lucro adicional exige margem ou volume superior.
10. **O teto de desconto significa lucro zero.** Ele não recomenda uma política comercial nem uma margem ideal.

---

## 16. Exemplo resumido de produto

Considere um produto com:

- preço atual: R$ 55;
- custo direto: R$ 16;
- gastos mensais efetivos: R$ 4.000;
- volume: 200 unidades por mês;
- imposto + cartão: 7%.

```text
Custo mensal por unidade = 4.000 ÷ 200 = R$ 20

Custo total por unidade = 16 + 20 = R$ 36

Preço após impostos e cartão = 55 × 93% = R$ 51,15

Valor deixado por venda = 51,15 - 16 = R$ 35,15

Lucro por unidade = 51,15 - 36 = R$ 15,15

Resultado do mês = 15,15 × 200 = R$ 3.030

Quanto sobra a cada R$ 100 = 3.030 ÷ 11.000 = 27,55%

Preço mínimo = 36 ÷ 93% = R$ 38,71

Quantidade mensal necessária = teto(4.000 ÷ 35,15) = 114 vendas
```

Interpretação: o produto fecha o mês com R$ 3.030 de resultado e recebe o veredito **Resultado positivo**. A margem de 27,55% é apresentada como medida do resultado, não como comparação com uma meta universal.

---

## 17. Exemplo resumido de serviço

Considere um profissional com:

- custos fixos: R$ 2.000 por mês;
- pró-labore: R$ 4.000 por mês;
- 100 horas faturáveis por mês;
- atendimentos de 50 minutos;
- preço por atendimento: R$ 80;
- material consumido por atendimento: R$ 10;
- imposto + cartão: 8%;

```text
custoBase = 2.000 + 4.000 = R$ 6.000

custoHora = 6.000 ÷ 100 = R$ 60

Duração em horas = 50 ÷ 60 = 0,8333

custoEstruturaUnit = 60 × 0,8333 = R$ 50

custoUnit = 50 + 10 = R$ 60

receitaLiquidaUnit = 80 × 92% = R$ 73,60

contribUnit = 73,60 - 10 = R$ 63,60

lucroUnit = 63,60 - 50 = R$ 13,60

margem real = 13,60 ÷ 80 = 17%

preço mínimo = 60 ÷ 92% = R$ 65,22

meta mensal = teto(6.000 ÷ 63,60) = 95 atendimentos
```

Interpretação: o preço cobre estrutura, material e taxas. O resultado unitário é positivo e a margem real é 17%. A contribuição de R$ 63,60 é o valor que cada atendimento deixa para pagar a estrutura mensal; por isso são necessários pelo menos 95 atendimentos para fechar essa conta.

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

O resultado final é igual a zero?
  Sim -> no limite; prioridade = volume
  Não -> resultado positivo; prioridade = volume
```

Em resumo, o diagnóstico rápido segue uma ordem de proteção do negócio: primeiro verifica se cada venda contribui, depois exige os dados necessários e confere se a estrutura inteira é paga. Quando o resultado é maior que zero, registra objetivamente um resultado positivo e usa a margem apenas para descrevê-lo.
