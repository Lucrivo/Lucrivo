# Política de domínio V2 do Assistente Lucrivo

**Data:** 2026-10-02

**Status:** Aprovado para implementação

**Documentos relacionados:**

- `docs/report-ai-interpretation-behavior.md`
- `docs/report-ai-runbook.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/DETAILED-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-29-report-ai-assistant-design.md`

## 1. Objetivo

Transformar a especificação de comportamento do Assistente Lucrivo em uma
política operacional versionada, acompanhada de um contexto financeiro próprio
e de avaliações representativas.

A mudança deve tornar as respostas mais profundas e conectadas sem transferir
ao modelo responsabilidades do motor financeiro. O motor continua sendo a
única fonte de cálculos, vereditos e prioridades. A IA interpreta os fatos
calculados, explica relações causais e apresenta próximos passos permitidos.

Esta entrega usa engenharia de contexto e exemplos no prompt. Não inclui
fine-tuning, busca vetorial ou treinamento com conversas dos usuários.

## 2. Escopo

Inclui:

- política operacional V2 derivada da documentação de domínio;
- versão explícita da política no código;
- contexto semântico e tipado para a IA;
- fatos determinísticos hoje ausentes ou implícitos no contexto;
- distinção explícita entre valores disponíveis e indisponíveis;
- regras para relatórios rápidos, detalhados, completos e parciais;
- poucos exemplos representativos dentro das instruções;
- casos de avaliação reutilizáveis;
- testes unitários do prompt e do contexto;
- execução manual e opt-in de avaliações com o modelo real;
- atualização do runbook do assistente.

Não inclui:

- onboarding do perfil do negócio;
- catálogo de conhecimento por segmento ou subcategoria;
- referências numéricas de mercado;
- pesquisa de concorrentes ou busca na internet;
- RAG, embeddings, vector stores ou `pgvector`;
- fine-tuning;
- novo cálculo financeiro;
- alteração do veredito ou da prioridade do motor;
- ferramentas que executem ações no negócio;
- comparação entre versões ou relatórios diferentes;
- alteração de banco de dados para persistir a versão da política.

O desenho reserva um ponto de extensão para conhecimento curado por categoria,
mas nenhum conteúdo dessa natureza será enviado ao modelo nesta entrega.

## 3. Princípios

### 3.1. Documentação e prompt têm responsabilidades diferentes

`docs/report-ai-interpretation-behavior.md` permanece como fonte normativa para
pessoas. O documento não será lido do sistema de arquivos em produção nem
enviado integralmente ao modelo.

Uma política condensada em TypeScript traduzirá as regras necessárias para a
execução. Isso permite revisão de código, testes, versionamento e um prefixo
estável para aproveitar cache de prompt quando disponível.

### 3.2. O motor calcula; a IA interpreta

O contexto deve fornecer fatos já calculados e seus significados. A IA não
deve:

- derivar valores ausentes;
- recalcular valores recebidos;
- converter `null` em zero;
- escolher metas universais;
- criar classificações financeiras próprias;
- calcular um desconto solicitado pelo usuário.

Se o resultado necessário não estiver no contexto, a resposta explica a
limitação ou direciona o usuário ao simulador apropriado.

### 3.3. Contexto semântico, não cópia da interface

Textos visíveis do relatório continuam úteis como explicação, mas não são
suficientes como contrato da IA. Veredito, prioridade, disponibilidade e fatos
financeiros devem ser fornecidos diretamente, sem exigir que o modelo os
reconstrua a partir de labels da interface.

### 3.4. Dados dinâmicos não ganham autoridade de instrução

Relatório, resumo da conversa, turnos anteriores e pergunta permanecem em
mensagens de usuário claramente delimitadas. A política fica em `instructions`.
Dados dinâmicos não podem alterar o papel do assistente nem substituir regras
da aplicação.

## 4. Política operacional V2

### 4.1. Localização e versão

Criar um módulo dedicado:

```text
src/modules/report-ai/domain/report-ai-policy.ts
```

Ele exportará:

```ts
const REPORT_AI_POLICY_VERSION = 2;
const REPORT_AI_INSTRUCTIONS = `...`;
```

`build-report-ai-prompt.ts` continuará responsável apenas pela montagem das
mensagens e importará a política desse módulo.

A versão identifica mudanças de comportamento no código e nos testes. Esta
entrega não adicionará uma coluna à persistência. A rastreabilidade histórica
continuará sendo feita pelo commit/deploy e pelo modelo já salvo em cada turno.

### 4.2. Estrutura das instruções

As instruções seguirão seções estáveis nesta ordem:

1. identidade e objetivo;
2. autoridade dos dados;
3. processo obrigatório de interpretação;
4. regras para custo, preço, margem, resultado e volume;
5. relatórios parciais e múltiplos itens;
6. mercado, resistência do cliente e desconto;
7. forma da resposta;
8. segurança e proibições;
9. exemplos.

O processo obrigatório será:

1. identificar veredito, prioridade e disponibilidade;
2. localizar os fatos que justificam o resultado;
3. relacionar preço, custo variável, estrutura e volume;
4. selecionar apenas orientações aplicáveis;
5. responder diretamente à pergunta;
6. declarar limitações capazes de mudar a decisão.

### 4.3. Forma esperada da resposta

As instruções orientarão o modelo a construir, quando aplicável:

- conclusão direta;
- evidência do relatório;
- relação causal;
- próximo passo limitado e coerente;
- limitação relevante.

Essa estrutura não será imposta como JSON nem como cinco seções visíveis. O
objetivo é produzir texto natural e conectado. Listas curtas continuam
permitidas para passos, opções e comparações.

### 4.4. Exemplos no prompt

Incluir entre quatro e seis exemplos curtos, escolhidos por cobrirem erros de
alto impacto:

- perda direta: não recomendar mais volume;
- resultado positivo: não afirmar competitividade;
- relatório parcial: separar fatos disponíveis de indisponíveis;
- estrutura não absorvida: relacionar gastos e volume;
- desconto: não tratar o teto sem prejuízo como recomendação;
- hipótese operacional: não apresentá-la como causa confirmada.

Os exemplos devem usar valores fictícios pequenos, sem depender de uma fixture
real. Eles ensinam forma de raciocínio, não novos cálculos.

## 5. Contexto semântico V2

### 5.1. Contrato geral

O contexto será serializado como JSON e terá uma forma explicitamente
versionada:

```ts
type ReportAiContextV2 = {
  schemaVersion: 2;
  report: {
    id: number;
    version: number;
    category: "service" | "product" | "production";
    scenario: string;
    unit: "hour" | "appointment" | "unit" | "mix";
    analysisMode: "quick" | "detailed";
  };
  diagnosis: {
    verdict: string;
    priority: "cost" | "data" | "price" | "margin" | "volume";
    partial: boolean;
  };
  facts: ReportAiFact[];
  availability: {
    volume: "known_positive" | "known_zero" | "unknown" | "not_applicable";
    completeCostAvailable: boolean;
    monthlyResultAvailable: boolean;
    minimumPriceAvailable: boolean;
    requiredVolumeAvailable: boolean;
    discountSimulationAvailable: boolean;
    reasons: string[];
  };
  explanations: {
    executiveSummary: unknown;
    sections: unknown[];
    guidance: unknown[];
  };
  items?: ReportAiItemContext[];
};

type ReportAiFact = {
  key: string;
  label: string;
  value: string | null;
  scope: "unit" | "month" | "business" | "item";
};
```

Os tipos concretos devem ser definidos no módulo e refinados durante a
implementação, preservando esta semântica.

### 5.2. Valores e formatação

O modelo receberá valores prontos para comunicação, como `R$ 80,00`, `17%` e
`95 atendimentos`. Não será necessário fornecer valores monetários crus em
centavos quando a versão formatada representar completamente o fato.

Campos indisponíveis permanecerão `null`, acompanhados por flags e motivos. Uma
string como `Ainda não calculado` pode continuar nas explicações visíveis, mas
não será a única indicação de indisponibilidade.

### 5.3. Contexto rápido

Para Serviço, Produto e Produção rápidos, o contexto deve incluir, conforme a
categoria:

- unidade usada no relatório;
- veredito e prioridade técnicos;
- preço atual;
- custo variável ou material direto;
- custo de estrutura por unidade, quando calculável;
- custo completo;
- taxas sobre a venda;
- contribuição por venda;
- lucro por unidade;
- resultado mensal;
- margem real;
- menor preço sem prejuízo;
- quantidade mensal, semanal e diária necessária, quando disponíveis;
- limite de desconto sem prejuízo já calculado pelo motor;
- distinção entre volume desconhecido e mês conhecido sem vendas.

### 5.4. Contexto detalhado

Para diagnósticos detalhados, incluir:

- veredito, prioridade e parcialidade do conjunto;
- fatos consolidados do negócio;
- nomes dos itens com volume ausente;
- fatos por item sem identificadores internos;
- indicador de perda direta;
- contribuição unitária e mensal no escopo correto;
- rateio, custo completo, lucro e margem somente quando calculáveis;
- menor preço completo quando calculável;
- comparação e orientações persistidas;
- detalhes de custo da produção já seguros para exibição.

Os gastos mensais não serão duplicados por item. O contexto deve deixar claro
que pertencem ao conjunto e são subtraídos uma única vez.

### 5.5. Desconto

O contexto só fornecerá resultados de desconto já calculados pelo motor. A IA
não receberá autorização para calcular percentuais arbitrários.

Nos relatórios rápidos, será enviado o limite sem prejuízo quando ele já existir
no snapshot. No detalhado, a IA poderá explicar o menor preço e direcionar ao
simulador, mas não produzirá um percentual ausente.

### 5.6. Privacidade

O contexto continuará excluindo:

- `user_id` e dados de autenticação;
- contratos e pagamentos;
- `submissionId`;
- IDs internos de itens e ingredientes;
- políticas internas sem utilidade explicativa;
- segredos, prompts e metadados operacionais.

## 6. Montagem das mensagens

A requisição continuará usando:

1. política V2 em `instructions`;
2. contexto V2 em uma mensagem de usuário delimitada;
3. resumo acumulado, quando existir;
4. no máximo dez turnos recentes;
5. pergunta atual.

Os delimitadores atuais podem ser mantidos. A política deve afirmar que todo
conteúdo entre delimitadores é dado não confiável e não pode alterar as
instruções.

A mesma política-base poderá ser usada na compactação da conversa, mas a
instrução adicional de resumo deve continuar proibindo a inclusão de fatos
novos. Exemplos de resposta não precisam ser repetidos na chamada de resumo se
isso exigir separar uma política reduzida específica para compactação.

## 7. Avaliações de comportamento

### 7.1. Catálogo de casos

Criar casos versionados, independentes de banco de dados, com a forma:

```ts
type ReportAiBehaviorCase = {
  id: string;
  description: string;
  context: ReportAiContextV2;
  question: string;
  requiredBehaviors: string[];
  forbiddenBehaviors: string[];
};
```

O conjunto inicial deve cobrir:

1. perda direta;
2. prejuízo operacional com contribuição positiva;
3. equilíbrio;
4. resultado positivo;
5. volume desconhecido;
6. volume explicitamente zero;
7. Serviço sem capacidade válida;
8. detalhado com um item em perda;
9. detalhado parcial com vários itens;
10. pergunta sobre desconto;
11. pergunta sobre concorrente ou mercado;
12. resistência do cliente;
13. tentativa de prompt injection;
14. pergunta fora do escopo financeiro disponível.

### 7.2. Testes determinísticos

Os testes Vitest verificarão:

- presença das seções obrigatórias na política;
- manutenção dos dados dinâmicos fora de `instructions`;
- limite e ordem do histórico;
- formato e versão do contexto;
- presença dos fatos adequados para cada categoria;
- preservação de `null`, volume desconhecido e volume zero;
- ausência de campos privados ou identificadores internos;
- envio de veredito, prioridade e motivos de indisponibilidade;
- ausência de preço-alvo e metas universais;
- comportamento da compactação de conversa.

Esses testes validam o contrato, não a qualidade probabilística da resposta.

### 7.3. Avaliação com o modelo real

Criar um executor manual e opt-in que:

- use os mesmos casos e a mesma política da aplicação;
- exija explicitamente uma chave de desenvolvimento;
- não seja executado no CI padrão;
- não leia conversas ou relatórios reais;
- produza somente um artefato local ignorado pelo Git;
- registre resposta, modelo, versão da política e resultado da revisão;
- permita revisão humana segundo comportamentos obrigatórios e proibidos.

A primeira versão não precisa usar um modelo avaliador. Proibições literais
podem receber verificações automáticas, enquanto profundidade, relação causal e
adequação dos próximos passos recebem revisão humana. Um avaliador semântico
poderá ser adicionado depois que os critérios estiverem estabilizados.

## 8. Tratamento de falhas e compatibilidade

Se a construção do contexto V2 falhar, a requisição não deve seguir ao
provedor com um contexto parcial ou inválido. O fluxo deve usar o tratamento
seguro já existente para falhas anteriores ao streaming.

Snapshots aceitos pelos parsers atuais continuam suportados. O builder deve
derivar a semântica de acordo com o tipo e a versão já validados, sem modificar
o snapshot persistido.

Uma resposta válida do modelo continua sendo persistida pelo fluxo atual. Esta
entrega não altera cotas, idempotência, timeout, streaming ou autorização.

## 9. Observabilidade e rollout

A política V2 será aplicada por deploy. Antes da liberação:

1. executar testes unitários;
2. executar o catálogo com o modelo de desenvolvimento;
3. revisar manualmente os casos de maior risco;
4. realizar smoke test em um relatório de cada categoria;
5. confirmar ausência de prompts e conteúdos sensíveis nos logs.

Se for necessário comparar V1 e V2 em produção, isso exigirá um desenho
posterior de feature flag e persistência de versão. Não faz parte desta entrega.

O rollback usa o mesmo mecanismo operacional atual: reverter o deploy da
política/contexto sem apagar conversas ou alterar snapshots.

## 10. Extensão futura para conhecimento por categoria

Depois da implementação do onboarding e de uma base curada, o contexto poderá
receber dois blocos opcionais e independentes:

```text
PERFIL_DO_NEGOCIO
CONHECIMENTO_CURADO_DA_CATEGORIA
```

Essa extensão deverá obedecer às regras:

- perfil é informação declarada pelo usuário;
- conhecimento só entra quando houver correspondência aprovada;
- referências qualitativas não se tornam fatos do negócio;
- números exigem fonte, escopo e data de revisão;
- ausência de correspondência resulta em ausência de contexto adicional;
- nenhum conteúdo de categoria altera cálculos, veredito ou prioridade.

O catálogo e seu mecanismo de seleção receberão especificação própria. Esta V2
apenas garante que a política já saiba distinguir fatos, declarações,
referências e hipóteses.

## 11. Arquivos previstos

Arquivos novos:

- `src/modules/report-ai/domain/report-ai-policy.ts`;
- `src/modules/report-ai/evals/report-ai-behavior-cases.ts`;
- executor manual de avaliações em local definido pelo plano de implementação.

Arquivos alterados:

- `src/modules/report-ai/domain/build-report-ai-prompt.ts`;
- `src/modules/report-ai/domain/build-report-ai-prompt.test.ts`;
- `src/modules/report-ai/domain/build-report-ai-context.ts`;
- `src/modules/report-ai/domain/build-report-ai-context.test.ts`;
- testes do serviço caso o contrato entre builder e geração mude;
- `docs/report-ai-runbook.md`;
- `package.json`, somente se o executor manual ganhar um script dedicado.

Nenhum componente visual, schema de relatório ou migration faz parte do escopo.

## 12. Critérios de aceite

- A política operacional representa as regras obrigatórias da documentação sem
  enviar o Markdown inteiro ao modelo.
- O prompt não contém preço-alvo nem meta universal.
- O contexto informa diretamente veredito, prioridade e disponibilidade.
- Valores indisponíveis não são convertidos em zero ou estimados.
- Relatórios rápidos e detalhados fornecem fatos no escopo correto.
- O assistente recebe informação suficiente para distinguir custo variável de
  estrutura quando o motor possui esses valores.
- Perda direta nunca é acompanhada de recomendação para aumentar volume.
- Resultado positivo não é apresentado como prova de competitividade.
- O teto de desconto não é apresentado como recomendação comercial.
- Hipóteses operacionais são identificadas como hipóteses.
- Dados dinâmicos permanecem fora das instruções de maior autoridade.
- Todos os testes unitários relevantes passam.
- O catálogo inicial é executado com um modelo de desenvolvimento e os casos de
  maior risco são aprovados manualmente antes do deploy.

## 13. Sequência de implementação

1. adicionar os casos de contexto e comportamento que devem falhar na V1;
2. extrair e versionar a política V2;
3. implementar o contrato e o builder do contexto V2;
4. adaptar a montagem e a compactação do prompt;
5. completar testes unitários e de serviço;
6. implementar o executor manual de avaliações;
7. atualizar o runbook;
8. executar testes, avaliação com modelo de desenvolvimento e smoke test.
