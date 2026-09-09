# Normalização e refinamento do relatório de serviço

**Data:** 2026-09-08

**Status:** Aprovado

**Documentos relacionados:**

- `docs/QUICK-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-01-service-quick-diagnosis-cost-flow-design.md`
- `docs/superpowers/specs/2026-09-07-quick-diagnosis-plain-language-foundation-design.md`

## 1. Objetivo

Habilitar a confirmação do novo diagnóstico rápido de serviço e adaptar o
relatório para que o usuário entenda, em poucos segundos, se o preço paga todos
os gastos, qual é o menor preço sem prejuízo, quanto sobra e o que mais pesa no
cálculo.

A entrega deve conectar o novo formulário ao motor financeiro sem criar uma
fórmula diferente para cada forma de cobrança. Cobranças baseadas em tempo
serão normalizadas para uma hora; cobranças por atendimento continuarão sendo
calculadas por atendimento. As respostas originais e os valores normalizados
serão preservados no histórico.

## 2. Decisões aprovadas

- Remover da comunicação a ideia de que 15% é uma meta universal.
- Manter 15% internamente, nesta entrega, apenas como limite da faixa de
  atenção usada para identificar pouca folga.
- Explicar a faixa de atenção como “sobram menos de R$ 15 a cada R$ 100
  cobrados”, atrás de ajuda clicável e acessível.
- Usar o menor preço sem prejuízo como principal referência de preço.
- Normalizar minuto, hora, dia, semana e mês para um equivalente por hora.
- Manter atendimento como uma unidade própria.
- Preservar no banco e no snapshot a forma de cobrança, o preço, a unidade do
  material e os demais valores originalmente informados.
- Criar uma nova versão do relatório de serviço. Relatórios antigos não serão
  recalculados, reescritos ou migrados.

## 3. Escopo

### 3.1 Incluído

- Submissão, estados de carregamento, falha, nova tentativa e redirecionamento
  do fluxo de serviço.
- Validação no servidor do novo formulário de serviço.
- Normalização determinística de preço e material.
- Persistência dos valores originais e normalizados.
- Nova versão estrutural, de cálculo e de conteúdo do snapshot de serviço.
- Nova função transacional de criação, mantendo a função atual disponível para
  compatibilidade durante a implantação.
- Revisão dos cards, resumo executivo, números principais, simulador de
  desconto e textos do relatório de serviço.
- Atualização dos três relatórios de serviço do seed local para a versão atual.
- Testes de domínio, interface, persistência, acessibilidade e responsividade.

### 3.2 Não incluído

- Alterações nos cálculos ou relatórios de produto e produção própria.
- Campo para o usuário escolher uma margem desejada.
- Reprocessamento de relatórios já salvos.
- Comparação com preços de concorrentes ou pesquisa de mercado.
- Conversa ou interpretação por IA.
- Seis motores financeiros independentes, um para cada forma de cobrança.

## 4. Normalização financeira

### 4.1 Capacidade mensal

Considere:

- `HD`: minutos trabalhados por dia;
- `DS`: dias trabalhados por semana;
- `HM`: minutos mensais normalizados;
- `4,33`: média de semanas usada pelo produto.

```text
HM = arredondar(HD × DS × 4,33)
```

As entradas de horas e dias continuam sujeitas aos limites já validados pelo
formulário. A action repete a validação; nenhum valor calculado apenas no
navegador será aceito como fonte confiável.

### 4.2 Preço equivalente por hora

O preço informado será normalizado assim:

```text
por minuto = preço informado × 60
por hora   = preço informado
por dia    = preço informado × 60 ÷ HD
por semana = preço informado × 60 ÷ (HD × DS)
por mês    = preço informado × 60 ÷ HM
```

Cada divisão usa aritmética inteira e arredonda somente o resultado final para
o centavo mais próximo. Isso evita acumular diferenças entre etapas.

Exemplo: R$ 4.000 por mês, 6 horas por dia e 5 dias por semana representam
aproximadamente 129,9 horas mensais e R$ 30,79 por hora.

Para cobrança por atendimento, o preço permanece por atendimento. A duração
média converte o custo da estrutura e qualquer material baseado em tempo para
a mesma unidade.

### 4.3 Material

O gasto com material será convertido para a unidade do relatório:

- relatório por hora: materiais por hora permanecem iguais; materiais por dia
  ou mês são divididos pelas horas correspondentes;
- relatório por atendimento: materiais por atendimento permanecem iguais;
  materiais por hora, dia ou mês são primeiro convertidos para hora e depois
  multiplicados pela duração do atendimento;
- material informado por atendimento em uma cobrança baseada em tempo será
  convertido para hora usando a duração média do serviço.

Quando o usuário escolher material “por atendimento” e a cobrança não for por
atendimento, a etapa de material também solicitará a duração média. O campo
explicará que essa informação serve somente para distribuir o gasto por hora.
A validação exigirá duração positiva quando a cobrança ou o material depender
de atendimento.

### 4.4 Unidade canônica

Novos comandos de cálculo usarão:

- `appointment` quando a cobrança original for por atendimento;
- `hour` para minuto, hora, dia, semana e mês.

O cabeçalho do relatório continuará mostrando a forma de cobrança original.
Valores e metas do corpo serão rotulados pela unidade canônica, acompanhados
de uma explicação curta quando houver conversão.

## 5. Fluxo de submissão

O estado do assistente de serviço receberá:

- `submissionId` criado ao iniciar a trilha;
- estado `idle`, `submitting` ou `error`;
- erro geral de submissão;
- os campos originais já existentes no novo formulário.

O botão final será `Confirmar diagnóstico`. Durante o envio, ficará desativado
e mostrará `Preparando relatório...`. Um bloqueio em memória impedirá cliques
duplicados.

O fluxo será:

```text
respostas do formulário
        ↓
validação completa no servidor
        ↓
composição dos valores originais e normalizados
        ↓
cálculo financeiro determinístico
        ↓
snapshot versionado
        ↓
função transacional autenticada
        ↓
redirecionamento para o relatório salvo
```

Erros de campos levarão o usuário de volta à primeira etapa inválida e darão
foco ao controle correspondente. Uma sessão expirada oferecerá o link para
entrar novamente. Falhas inesperadas permitirão tentar de novo com o mesmo
`submissionId`, preservando a idempotência. Um identificador inválido reinicia
somente a submissão, sem salvar dados parciais.

## 6. Persistência e compatibilidade

### 6.1 Dados novos

Uma migração aditiva incluirá em `service_diagnoses`, como campos opcionais
para não afetar registros antigos:

- forma de cobrança original;
- preço original em centavos;
- unidade original do material;
- gasto original com material em centavos;
- minutos trabalhados por dia;
- duração original do atendimento, quando necessária à conversão.

Os campos canônicos atuais continuarão armazenando os valores usados pelo
motor: preço por hora ou atendimento, material na mesma unidade, capacidade
mensal e taxas.

A migração usará restrições explícitas para as seis formas de cobrança e as
quatro unidades de material. Valores monetários serão não negativos e os
limites de tempo acompanharão a validação da aplicação.

### 6.2 Função transacional

Será adicionada uma nova função de criação para o contrato normalizado. Ela:

- exige `auth.uid()`;
- valida a combinação de versões e a coerência entre argumentos e snapshot;
- grava diagnóstico e detalhe na mesma transação;
- mantém a chave idempotente por usuário e `submissionId`;
- revoga execução de `public` e `anon` e concede apenas a `authenticated`.

A função atual não será removida nesta entrega, evitando quebra durante uma
implantação gradual e preservando o contrato dos relatórios anteriores.

### 6.3 Versões

Novos relatórios de serviço usarão:

| Versão   | Valor | Motivo                                             |
| -------- | ----: | -------------------------------------------------- |
| Schema   |     4 | Inclui respostas originais e valores normalizados. |
| Cálculo  |     3 | Inclui a normalização das novas formas e unidades. |
| Conteúdo |     5 | Remove a meta universal e reorganiza os cards.     |

Continuam legíveis os relatórios de serviço `2/1/2`, `3/2/3` e `3/2/4`.
Somente o novo contrato escreve `4/3/5`.

O cenário salvo no diagnóstico e exibido no cabeçalho será a forma original:
`minute`, `hour`, `appointment`, `day`, `week` ou `month`. A unidade interna do
resultado continuará sendo `hour` ou `appointment`.

## 7. Relatório de serviço

### 7.1 Hierarquia inicial

O primeiro bloco deve responder imediatamente:

1. quanto o usuário cobra;
2. qual é o menor preço que paga tudo;
3. quanto sobra;
4. qual é a situação;
5. o que fazer primeiro.

O preço atual será comparado ao `Menor preço sem prejuízo`, substituindo o
preço para alcançar a meta. O preço-alvo continuará calculado e armazenado
apenas para compatibilidade do contrato; não será apresentado como
recomendação. A faixa interna será determinada diretamente pelo valor que
sobra a cada R$ 100.

O segundo comparativo mostrará `Quanto sobra a cada R$ 100` e uma leitura curta,
como `Prejuízo`, `Pouca folga` ou `Boa folga`. A ajuda clicável `Como
avaliamos?` explicará que menos de R$ 15 é tratado como faixa de atenção, não
como uma meta ideal para todos os negócios.

### 7.2 Situações negativas e de atenção

Para prejuízo, o card principal dirá o preço atual, o mínimo necessário e a
diferença por hora ou atendimento. Para pouca folga, dirá que o preço paga os
gastos, mas deixa pouco espaço para imprevistos.

Nessas situações, `Comece por aqui` mostrará o maior peso financeiro entre:

- quanto o usuário quer receber por mês;
- gastos que existem todo mês;
- materiais usados no serviço;
- impostos, cartão e plataforma.

Cada componente será convertido para a unidade canônica antes da comparação.
Empates usarão uma ordem fixa, garantindo resultados determinísticos. O texto
usará `maior peso no cálculo`, não afirmará que o gasto é incorreto e não usará
`pró-labore`, `alíquota`, `rateio` ou outro termo técnico como mensagem
principal.

Em resultados saudáveis, a prioridade continuará sendo manter a quantidade de
trabalho e acompanhar a aceitação do preço pelos clientes.

### 7.3 Cards detalhados

- `A conta que ninguém faz` será removido dos novos relatórios.
- `Ponto de equilíbrio` passará a `Seu menor preço sem prejuízo`.
- O diagnóstico da margem usará `Quanto sobra no preço`, sem mencionar meta.
- `Meta de vendas` passará a `Quanto você precisa vender`.
- A meta mensal permanecerá em destaque. O corpo mostrará em uma frase curta o
  equivalente semanal e diário, sem `pró-labore incluído`.
- O simulador de desconto usará `prejuízo`, `pouca folga` e `boa folga`. Para o
  serviço `4/3/5`, não exibirá `meta de 15%` nem `preço-alvo`.

### 7.4 Ajuda clicável

O componente `PlainLanguageHelp` existente será reutilizado. Novos relatórios
de serviço terão ajuda somente em:

- `Menor preço sem prejuízo`: explica que reúne o valor necessário para pagar
  gastos mensais, retirada desejada, material e taxas informadas;
- `Quanto sobra a cada R$ 100`: explica a faixa de atenção e informa que ela
  não é uma recomendação universal;
- conversão para hora, quando a forma original for minuto, dia, semana ou mês.

Os gatilhos continuarão sendo botões operáveis por clique, toque e teclado,
com título, descrição, foco gerenciado e fechamento por `Escape`.

## 8. Linguagem e compatibilidade visual

Os novos textos devem ser curtos, factuais e orientados à ação. A primeira
frase contém o resultado; detalhes vêm depois ou no popover. A interface não
atribui culpa ao usuário e não promete conhecer o preço correto do mercado.

O perfil de linguagem será escolhido por categoria e versão. Relatórios
antigos manterão seus títulos, cards, preço-alvo e textos persistidos. A nova
linguagem será aplicada apenas a serviço `4/3/5`.

A estrutura visual existente será preservada. Os cards ganharão apenas os
ajustes necessários de hierarquia, destaque e conteúdo, mantendo tema claro e
escuro, navegação por teclado, zoom de 200% e larguras móveis.

## 9. Testes e verificação

### 9.1 Domínio

- Tabela de conversão para minuto, hora, dia, semana e mês, incluindo
  arredondamento em centavos.
- Conversão de todas as unidades de material para hora e atendimento.
- Duração obrigatória quando cobrança ou material usar atendimento.
- Cálculo do maior peso com desempate determinístico.
- Cenários de prejuízo, pouca folga e resultado saudável.
- Ausência dos termos técnicos ou inadequados listados neste documento no novo
  conteúdo principal, incluindo “meta de 15%”, “preço-alvo”, “pró-labore”,
  “alíquota” e “A conta que ninguém faz”.

### 9.2 Interface e action

- Submissão bem-sucedida e redirecionamento.
- Bloqueio de envio duplicado, carregamento, nova tentativa e sessão expirada.
- Retorno e foco na primeira resposta inválida.
- Duração condicional para material por atendimento.
- Popovers por clique e teclado.
- Apresentação distinta de relatórios antigos e novos.
- Leitura em desktop, celular, tema claro e escuro e zoom de 200%.

### 9.3 Banco

- Restrições dos novos campos.
- Correspondência entre argumentos, snapshot e linhas normalizadas.
- Autenticação, propriedade, RLS e permissões da nova função.
- Idempotência com o mesmo `submissionId`.
- Leitura dos contratos antigos e escrita exclusiva de `4/3/5`.
- Três relatórios atuais de serviço no seed local.

### 9.4 Comandos finais

- testes direcionados durante TDD;
- suíte Vitest completa, tipos, lint e formatação;
- `supabase db reset --local`;
- suíte pgTAP completa;
- lint e advisors do banco;
- detector mecânico do Impeccable nos componentes alterados;
- uma inspeção visual agrupada em desktop e mobile, com no máximo uma rodada
  adicional de confirmação após as correções.

## 10. Critérios de aceite

- O usuário conclui e salva qualquer forma de cobrança suportada no fluxo de
  serviço.
- O relatório preserva a resposta original e mostra cálculos por hora ou
  atendimento sem ambiguidade.
- O preço mínimo aparece como principal referência e o preço-alvo não aparece
  nos novos relatórios.
- Nenhum texto trata 15% como meta universal.
- Prejuízo e pouca folga deixam evidente a diferença de preço e o maior peso do
  cálculo.
- O card `A conta que ninguém faz` não aparece nos novos relatórios.
- A quantidade necessária no mês, semana e dia pode ser compreendida em poucos
  segundos.
- Relatórios antigos permanecem legíveis e imutáveis.
- O fluxo é idempotente, protegido por autenticação e coberto pelos testes
  proporcionais ao risco.
