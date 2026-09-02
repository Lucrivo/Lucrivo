# Refinamento do diagnóstico rápido de serviço

## Objetivo

Refinar a trilha de serviço para distinguir custo de estrutura de custo direto, permitir que a capacidade faturável seja informada por dia, semana ou mês e alinhar as perguntas ao vocabulário validado pelo especialista de domínio.

O fluxo deve continuar respondendo se o preço cobre a operação, qual preço atinge a margem de referência de 15% e qual volume paga os custos fixos e o pró-labore.

## Escopo

Esta mudança cobre somente o diagnóstico rápido de serviço:

- estado e telas do assistente;
- validação e normalização das respostas;
- cálculo e conteúdo do relatório;
- snapshot versionado;
- persistência transacional no Supabase;
- documentação e testes automatizados relacionados.

As trilhas de produto e produção não terão regras, textos nem estruturas alterados.

## Diagnóstico do comportamento atual

O fluxo existente já implementa corretamente estas partes:

- soma da retirada mensal desejada e das despesas fixas para formar o custo mensal;
- divisão do custo mensal pelas horas faturáveis;
- conversão do custo-hora em custo por atendimento por meio da duração;
- conversão do preço por minuto em preço por atendimento;
- desconto de imposto e cartão sobre o preço;
- cálculo de preço mínimo, preço-alvo, margem, metas semanal e diária;
- uso de 15% como margem-alvo interna para serviços.

As divergências são:

- não existe custo direto de material por unidade;
- a meta mensal usa apenas a receita líquida, pois ainda não há material a descontar da contribuição;
- a capacidade só pode ser informada por mês;
- alguns títulos e rótulos não usam os textos de domínio aprovados;
- duração e preço aparecem em ordem inversa à construção conceitual do custo;
- o snapshot, a tabela normalizada e a função transacional não comportam os novos dados.

## Decisões de domínio

### Unidade do custo de material

Preço, custo direto e resultado sempre usarão a mesma unidade:

- cobrança por hora: custo de material por hora faturada;
- cobrança por minuto: custo de material por atendimento;
- cobrança por atendimento: custo de material por atendimento.

Na cobrança por minuto, o preço informado por minuto continuará sendo multiplicado pela duração para produzir o preço do atendimento. O custo de material já será informado para o atendimento completo e não será multiplicado pela duração.

### Capacidade faturável

O usuário informará horas faturáveis, não o total de horas ocupadas. O texto de apoio explicará que estudo, administração, deslocamento e horários ociosos não entram nessa capacidade.

O seletor `Horas faturáveis por` terá as opções `dia`, `semana` e `mês`. A opção inicial será `mês`, preservando o comportamento e a fricção do fluxo atual.

A entrada será normalizada em minutos mensais com aritmética inteira e arredondamento determinístico:

```text
mês    -> minutos informados
semana -> minutos informados × 4,33
dia    -> minutos informados × dias trabalhados por semana × 4,33
```

Os limites da entrada serão:

- até 24 horas por dia;
- até 168 horas por semana;
- até 744 horas por mês;
- resultado normalizado de até 44.640 minutos mensais.

Valores vazios continuarão seguindo a convenção atual de normalização para zero. Valores negativos, fora do limite ou com formato inválido produzirão erro no campo correspondente.

### Dias trabalhados

Os dias por semana não compõem custos. Eles têm duas responsabilidades:

- converter horas diárias em capacidade mensal quando o período escolhido for `dia`;
- converter a meta semanal em meta diária no relatório.

### Uso de material

Uma nova resposta booleana controlará a exibição do valor de material. Ao responder que existe custo, um valor maior que zero será obrigatório. Ao responder que não existe, o valor será limpo e normalizado para zero.

A resposta booleana pertence ao estado e à entrada do assistente. No comando normalizado e no banco, custo zero representa ausência de material; um valor positivo representa presença. Não é necessário persistir duas representações equivalentes.

## Fluxo do assistente

As perguntas relacionadas permanecerão agrupadas para evitar um assistente excessivamente longo. A nova etapa de material ficará entre preço e taxas.

1. **Retirada mensal**
   - título: `Quanto você quer tirar por mês pra você?`
   - campo: `Pró-labore mensal`.
2. **Contas fixas**
   - título: `Quanto são suas contas fixas do mês?`
   - campo: `Contas fixas mensais`.
3. **Rotina e capacidade**
   - título: `Qual é sua capacidade de atendimento?`
   - seletor: `Horas faturáveis por`;
   - campo de quantidade adaptado ao período selecionado;
   - campo: `Quantos dias por semana você trabalha?`;
   - texto de apoio sobre horas efetivamente cobradas.
4. **Forma de cobrança**
   - título: `Como você vende seu tempo?`;
   - opções: por hora, por atendimento ou por minuto.
5. **Duração e preço**
   - título: `Quanto você cobra?`;
   - para minuto ou atendimento, `Quanto dura cada atendimento?` aparece antes do preço;
   - para hora, somente o preço por hora aparece.
6. **Material**
   - por hora: `Você tem algum custo de material por hora trabalhada?`;
   - por minuto ou atendimento: `Você tem algum custo de material por atendimento?`;
   - ao responder sim, exibir o valor na mesma unidade.
7. **Taxas**
   - título: `Você paga imposto e taxa de cartão?`;
   - campos separados para imposto e cartão.
8. **Revisão**
   - mostrar o período e as horas originalmente informadas;
   - mostrar também a capacidade mensal estimada;
   - mostrar se há material e o valor na unidade correta;
   - manter edição por grupo e submissão idempotente.

Com a escolha inicial do tipo de diagnóstico, o indicador global passará a ter nove etapas.

## Modelo de entrada e normalização

A entrada de serviço receberá, conceitualmente:

- período das horas faturáveis;
- quantidade de horas faturáveis no período;
- indicador de custo de material;
- valor do material na unidade da cobrança.

O comando validado preservará:

- período escolhido;
- minutos faturáveis no período escolhido;
- minutos faturáveis mensais normalizados;
- custo de material unitário em centavos.

Os nomes concretos devem seguir o inglês e os padrões já usados pelo módulo. Os nomes ilustrativos fornecidos pelo especialista não são requisitos de implementação.

Ao mudar a forma de cobrança, o assistente continuará limpando preço e duração incompatíveis. O custo de material também será limpo, porque sua unidade e seu significado podem ter mudado.

## Fórmulas

Considere:

- `PL`: pró-labore mensal;
- `CF`: contas fixas mensais;
- `H`: minutos faturáveis mensais;
- `D`: duração da unidade em minutos, sendo 60 para cobrança por hora;
- `P`: preço da hora ou do atendimento;
- `CD`: custo direto de material por hora ou atendimento;
- `V`: imposto mais cartão, em proporção do preço;
- `M`: margem-alvo de 15%.

### Estrutura

```text
custoBase = PL + CF
custoHora = custoBase × 60 ÷ H
custoEstruturaUnit = custoBase × D ÷ H
```

Se a capacidade for zero, as referências dependentes dela continuarão indisponíveis.

### Custo, receita e margem

```text
custoUnit = custoEstruturaUnit + CD
receitaLiquidaUnit = P × (1 − V)
contribUnit = receitaLiquidaUnit − CD
lucroUnit = contribUnit − custoEstruturaUnit
margemReal = lucroUnit ÷ P
```

### Referências de preço

```text
precoMinimo = custoUnit ÷ (1 − V)
precoAlvo = custoUnit ÷ (1 − V − M)
```

O preço mínimo ficará indisponível se as taxas alcançarem 100%. O preço-alvo ficará indisponível se taxas mais margem alcançarem 100%.

### Meta de volume

```text
metaMensal = teto(custoBase ÷ contribUnit)
metaSemanal = teto(metaMensal ÷ 4,33)
metaDiaria = teto(metaSemanal ÷ diasSemana)
```

A contribuição deve ser estritamente positiva para existir uma meta de volume. Quando o preço não cobrir o custo total na capacidade informada, o cálculo poderá conservar a meta internamente, mas o conteúdo continuará orientando a correção de preço ou custo antes de recomendar aumento de volume.

### Classificação

A introdução do custo direto permite distinguir duas perdas:

- contribuição igual ou negativa: `prejuízo direto`, prioridade `custo`;
- contribuição positiva, mas lucro unitário igual ou negativo: `prejuízo operacional`, prioridade `preço`.

As faixas existentes de margem apertada, adequada e acima da meta permanecem iguais.

O simulador de desconto usará o custo total unitário, portanto incluirá material, estrutura e taxas em seus limites e resultados.

## Persistência no Supabase

O projeto usa migrações imperativas. A alteração será aditiva e preservará dados existentes.

A tabela `service_diagnoses` receberá:

- período original das horas faturáveis;
- minutos informados no período original;
- custo unitário de material em centavos.

O campo mensal já existente continuará armazenando a capacidade normalizada. Linhas antigas serão interpretadas como entradas mensais, com os minutos originais iguais aos minutos mensais e material igual a zero.

As novas colunas terão restrições de domínio para período válido, valores não negativos e coerência com os limites já aplicados. A política RLS e o modelo de propriedade não mudarão.

A função `create_service_diagnosis_report` receberá os novos argumentos e continuará:

- exigindo usuário autenticado dentro da função;
- validando identidade, versões e forma do snapshot;
- criando relatório e entrada normalizada na mesma transação;
- recuperando o relatório existente em repetição idempotente;
- negando execução a `public` e `anon` e concedendo-a somente a `authenticated`.

Os tipos TypeScript gerados do banco serão atualizados a partir do schema local, nunca editados manualmente.

## Compatibilidade e versionamento

A fórmula alterada exige nova versão de cálculo. As mudanças de campos e conteúdo também exigem uma nova versão do snapshot de serviço.

O leitor de relatórios aceitará tanto a versão atual quanto a nova versão. A construção de novos diagnósticos produzirá somente a nova versão. Dessa forma:

- relatórios antigos continuam abrindo com os números originalmente salvos;
- relatórios novos incluem período, capacidade normalizada e custo direto;
- nenhum relatório antigo é recalculado com regras novas;
- produto e produção continuam em suas versões atuais.

O tipo raiz de snapshot deverá suportar mais de uma versão da categoria `service`, em vez de depender exclusivamente de uma união discriminada apenas por categoria.

## Conteúdo do relatório

O relatório explicará separadamente:

- custo de estrutura por hora ou atendimento;
- custo direto de material;
- custo total da unidade;
- contribuição usada para pagar pró-labore e contas fixas.

Os textos existentes que dizem que todos os custos “caem” sobre as horas faturáveis serão ajustados para não sugerir que o material foi rateado pela capacidade. Material sempre entra diretamente na unidade.

Quando não houver material, o conteúdo deve continuar natural e não exibir blocos vazios ou explicações desnecessárias.

## Tratamento de erros

- erros de período, horas, dias e material serão associados aos campos de origem;
- a validação progressiva impedirá avanço somente por erros da etapa atual;
- erros devolvidos pelo servidor levarão o usuário à primeira etapa inválida e focarão o campo correspondente;
- falhas de autenticação e persistência continuarão sanitizadas;
- divisões impossíveis resultarão em referências indisponíveis, nunca em `NaN`, infinito ou exceção exposta ao usuário.

## Estratégia de testes

### Estado e interface

- estado inicial com período mensal e material desligado;
- troca de período preservando respostas compatíveis;
- troca da forma de cobrança limpando duração, preço e material dependentes;
- perguntas e textos aprovados;
- exibição condicional de duração e material;
- ordem duração antes de preço;
- revisão com valor original e equivalência mensal;
- navegação, foco de erros, retorno para edição e submissão.

### Schema e normalização

- conversões exatas de dia, semana e mês;
- limites de 24, 168 e 744 horas;
- arredondamento determinístico para minutos;
- dependência entre período diário e dias por semana;
- material desligado normalizado para zero;
- material ligado exigindo valor positivo;
- formas de cobrança preservando somente seus campos válidos.

### Cálculo e snapshot

- cenários por hora, minuto e atendimento com material;
- cenário sem material preservando os resultados anteriores;
- custo total como estrutura mais material;
- contribuição descontando taxas e material, mas não a estrutura;
- meta mensal baseada na contribuição;
- preços mínimo e alvo incluindo material;
- prejuízo direto e prejuízo operacional;
- limites de taxas e capacidade zero;
- snapshot novo completo e leitura do snapshot legado.

### Persistência

- argumentos completos enviados à função transacional;
- persistência do período, minutos originais, minutos mensais e material;
- restrições SQL e permissões da função;
- idempotência e isolamento por usuário;
- reset local, testes pgTAP, lint e advisors do banco.

### Verificação final

- testes direcionados durante TDD;
- suíte Vitest completa;
- typecheck;
- ESLint;
- verificação de formatação;
- reset e testes locais do Supabase;
- geração limpa dos tipos de banco.

## Fora de escopo

- margem-alvo configurável pelo usuário;
- detalhamento de materiais ou ficha técnica;
- vários tipos de insumo por atendimento;
- custos diferentes por forma de pagamento;
- calendário com semanas reais ou sazonalidade;
- mudanças nas trilhas de produto e produção;
- recalcular relatórios históricos.
