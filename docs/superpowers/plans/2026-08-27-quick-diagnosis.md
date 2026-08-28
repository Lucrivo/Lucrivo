# Plano de Implementação — Quick Diagnosis

> Design de origem:
> `docs/superpowers/specs/2026-08-27-quick-diagnosis-design.md`

## Objetivo

Implementar o primeiro módulo de domínio do Lucrivo: um diagnóstico rápido para
negócios de serviços, persistido somente após revisão e protegido por
autenticação, constraints, grants e RLS.

A execução deve seguir backend-first, TDD e checkpoints pequenos. Concluir e
verificar somente uma tarefa por vez, reportar as evidências e aguardar
aprovação antes de iniciar a seguinte.

## Restrições

- Não implementar produto, produção, cálculos, recomendações ou histórico.
- Não persistir rascunhos.
- Não criar Route Handler ou fazer chamadas HTTP internas.
- Não aceitar `user_id` ou `business_category` do navegador.
- Não expor mensagens do Supabase ou Postgres para a interface.
- Não usar `service_role` no fluxo do usuário.
- Não adicionar abstrações de repository ou mapper nesta entrega.
- Não instalar componentes ou dependências antes de confirmar que os atuais são
  insuficientes.
- Criar a migration somente pelo comando da CLI instalado, após consultar
  `--help`; não inventar timestamp.
- Usar centavos, minutos e pontos-base como unidades persistidas.
- Preservar o `submission_id` durante retries e tratar a unicidade no banco como
  proteção autoritativa contra duplicação.
- Implementar mudanças de comportamento com teste falhando primeiro.
- Não alterar `.env.local`, executar seed em ambiente hospedado ou fazer
  mudanças manuais permanentes pelo Dashboard.

## Task 1 — Criar e proteger o schema de diagnóstico de serviço

### Arquivos

- Criar via CLI:
  `supabase/migrations/<timestamp>_create_service_diagnoses.sql`
- Criar: `supabase/tests/service_diagnoses.test.sql`
- Modificar: `.github/workflows/ci.yml`

### Contrato

- Enums:
  - `public.business_category`: `service`.
  - `public.service_pricing_method`: `hour`, `minute`, `appointment`.
- Tabela: `public.service_diagnoses` com todas as colunas, unidades e defaults da
  especificação aprovada.
- Diagnósticos são create-only para papéis da aplicação.
- `anon` não possui acesso.
- `authenticated` possui somente `select` e `insert`, limitados por ownership.
- `(user_id, submission_id)` é único.

### Passos

1. Executar `pnpm exec supabase migration --help`,
   `pnpm exec supabase test --help` e os subcomandos necessários para confirmar
   a sintaxe instalada.
2. Criar primeiro o teste pgTAP e executar `pnpm exec supabase test db` para
   registrar a falha pela ausência do schema.
3. Criar a migration com `supabase migration new create_service_diagnoses`.
4. Implementar enums, tabela, foreign key para `auth.users`, checks numéricos,
   check fixando a categoria em `service` e check condicional do método.
5. Criar a unique constraint de idempotência e o índice
   `(user_id, created_at desc)`.
6. Revogar privilégios existentes, conceder somente `select` e `insert` a
   `authenticated` e habilitar RLS.
7. Criar policies separadas de select e insert usando
   `(select auth.uid()) = user_id`.
8. Cobrir no pgTAP:
   - existência e shape da tabela;
   - todos os limites numéricos;
   - os três formatos válidos de pricing;
   - combinações condicionais inválidas;
   - unicidade do submission;
   - permissões de `anon` e `authenticated`;
   - acesso próprio e isolamento entre dois usuários;
   - ausência de update e delete.
9. Adicionar `pnpm exec supabase test db` ao job `Database` do CI depois do
   reset.
10. Executar:

    ```bash
    pnpm supabase:reset
    pnpm exec supabase test db
    pnpm supabase:lint
    pnpm supabase:advisors
    ```

### Checkpoint

Reportar migration reproduzível, testes de allow/deny e resultado dos advisors.
Aguardar aprovação antes da Task 2.

## Task 2 — Gerar e validar os tipos do banco

### Arquivos

- Modificar:
  `src/infrastructure/database/supabase/database.types.ts`

### Passos

1. Executar `pnpm supabase:types` contra o banco local reconstruído.
2. Confirmar que enums, tabela, relacionamentos e tipos Insert/Update foram
   gerados corretamente.
3. Executar a geração uma segunda vez.
4. Confirmar diff vazio na segunda geração.
5. Executar TypeScript, lint e Prettier sobre o arquivo gerado e arquivos
   alterados nas Tasks 1–2.

### Checkpoint

Reportar tipos determinísticos e o diff esperado do novo schema. Aguardar
aprovação antes da Task 3.

## Task 3 — Centralizar a autenticação server-side

### Arquivos

- Criar: `src/modules/auth/services/require-user.ts`
- Criar: `src/modules/auth/services/require-user.test.ts`

### Contrato

- O módulo é `server-only`.
- Usa o cliente Supabase de servidor já existente.
- Valida identidade por `getClaims()`.
- Sucesso retorna `{ userId, supabase }`.
- Erro ou `claims.sub` ausente produz um erro de autenticação conhecido e sem
  dados sensíveis.

### Passos

1. Escrever testes falhando para usuário autenticado, erro do provider, claims
   ausentes e `sub` inválido.
2. Confirmar que nenhum caminho não autenticado retorna um cliente utilizável.
3. Implementar `requireUser()` sem duplicar criação de clientes.
4. Não adicionar cache cross-request nem buscar perfil inexistente.
5. Executar os testes focados, typecheck, lint e formatação.

### Checkpoint

Reportar o contrato autenticado reutilizável. Aguardar aprovação antes da Task 4.

## Task 4 — Implementar validação e normalização do diagnóstico

### Arquivos

- Criar: `src/modules/quick-diagnosis/types.ts`
- Criar:
  `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`
- Criar:
  `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`

### Contrato de entrada

- `submissionId`.
- `pricingMethod`.
- `desiredMonthlyIncome`.
- `fixedMonthlyExpenses`.
- `monthlyWorkHours`.
- `weeklyWorkDays`.
- `hourlyRate`.
- `minuteRate`.
- `appointmentRate`.
- `appointmentDurationMinutes`.
- `taxRate`.
- `cardFeeRate`.

O contrato normalizado contém nomes equivalentes nas unidades do banco: cents,
minutes e basis points. Não contém `user_id` ou uma categoria escolhida pelo
cliente.

### Passos

1. Escrever testes falhando para:
   - UUID inválido;
   - enums inválidos;
   - strings vazias convertidas em zero;
   - valores monetários BRL exatos;
   - vírgula decimal e valores formatados apresentados pela interface;
   - percentuais com até duas casas;
   - conversão de horas mensais para minutos;
   - arredondamento para o minuto inteiro mais próximo;
   - limites de 744 horas, 7 dias e 100%;
   - rejeição de negativos;
   - regras condicionais de hour, minute e appointment;
   - limpeza dos campos não pertencentes ao método selecionado.
2. Executar os testes e confirmar a falha inicial.
3. Implementar parsing decimal baseado em string; não multiplicar floats
   binários para gerar centavos ou pontos-base.
4. Implementar o schema Zod final e o tipo do comando normalizado.
5. Garantir mensagens associadas aos campos corrigíveis, inclusive em regras
   cross-field.
6. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Apresentar exemplos de input de interface e comando persistível resultante.
Aguardar aprovação antes da Task 5.

## Task 5 — Implementar o service de criação idempotente

### Arquivos

- Criar:
  `src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts`
- Criar:
  `src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts`

### Contrato

- Recebe cliente autenticado, `userId` confiável e comando normalizado.
- Define `business_category` como `service` dentro do service.
- Retorna sucesso com `diagnosisId` ou erro `create_failed`.
- Retry do mesmo `(user_id, submission_id)` retorna o ID já persistido.

### Passos

1. Escrever testes falhando para payload exato dos três pricing methods.
2. Provar que `user_id` vem do contexto autenticado e que a categoria é fixa.
3. Cobrir insert bem-sucedido e seleção do ID retornado.
4. Cobrir código Postgres `23505`: buscar pelo mesmo `user_id` e
   `submission_id`; retornar sucesso somente se o registro correspondente
   existir.
5. Cobrir falha da consulta idempotente e outros erros como `create_failed`.
6. Cobrir exceções lançadas sem propagar payloads técnicos.
7. Implementar o mínimo para os testes passarem usando o cliente tipado gerado.
8. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Reportar criação normal, retry idempotente e normalização de erros. Aguardar
aprovação antes da Task 6.

## Task 6 — Expor a criação por Server Action

### Arquivos

- Criar:
  `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`
- Criar:
  `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts`

### Contrato

```text
success: { status: "success", diagnosisId }
invalid: { status: "error", error: "invalid_input", fieldErrors }
auth:    { status: "error", error: "unauthorized" }
failure: { status: "error", error: "create_failed" }
```

### Passos

1. Escrever testes falhando provando que input inválido não autentica nem chama
   o service.
2. Cobrir sessão ausente, sucesso, falha do service e exceção segura.
3. Cobrir o mapeamento de issues Zod para campos e garantir que nenhum detalhe
   de banco seja retornado.
4. Implementar uma action fina com `"use server"`.
5. Executar validação, `requireUser()` e service nessa ordem.
6. Não criar Route Handler nem chamar `fetch` interno.
7. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Reportar o backend completo da feature antes de iniciar apresentação. Aguardar
aprovação antes da Task 7.

## Task 7 — Adicionar rota privada, sidebar e estrutura do wizard

### Arquivos

- Criar: `src/app/(private)/quick-diagnosis/page.tsx`
- Criar ou modificar:
  `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modificar: `src/components/layout/app-sidebar.tsx`
- Modificar: `src/components/layout/app-sidebar.test.tsx`
- Criar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Criar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

### Passos

1. Escrever testes falhando para o link “Diagnóstico rápido”, href técnico
   `/quick-diagnosis` e estado ativo.
2. Escrever testes falhando para rota, primeiro step, progress `1 de 7` e
   presença de exatamente uma etapa.
3. Criar a página como composição fina da action e do componente cliente.
4. Criar o estado local do wizard e gerar um `submission_id` estável por ciclo
   de preenchimento.
5. Implementar shell responsivo, heading focalizável, progress acessível e
   navegação base.
6. Usar os componentes shadcn já presentes (`Progress`, `Button`, `Card`,
   `RadioGroup`, `InputGroup`) antes de considerar qualquer instalação.
7. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Apresentar acesso, rota e shell navegável sem submissão. Aguardar aprovação
antes da Task 8.

## Task 8 — Implementar as etapas e validação progressiva

### Arquivos

- Criar sob `src/modules/quick-diagnosis/components/steps/`:
  - `pricing-method-step.tsx`
  - `monthly-goal-step.tsx`
  - `fixed-expenses-step.tsx`
  - `work-routine-step.tsx`
  - `current-price-step.tsx`
  - `fees-step.tsx`
- Modificar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modificar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

### Passos

1. Expandir os testes do wizard antes de cada comportamento:
   - cards de hour, minute e appointment;
   - campos monetários em reais;
   - pares work routine e fees;
   - campo de preço condicional;
   - appointment com duração e valor;
   - validação no Continue;
   - Back preservando respostas;
   - troca de método zerando campos anteriores;
   - foco no heading após trocar etapa;
   - somente uma etapa renderizada.
2. Implementar uma etapa por vez e rerodar o teste após cada uma.
3. Manter strings de entrada no estado para não perder formatação nem precisão.
4. Compartilhar as mesmas regras puras do schema onde isso não importar código
   server-only para o bundle cliente; a validação do servidor permanece
   autoritativa.
5. Garantir labels visíveis, fieldsets, legends, mensagens associadas e estados
   de foco.
6. Validar desktop e mobile sem adicionar persistência de rascunho.
7. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Demonstrar as seis etapas de entrada, os três caminhos condicionais e a
navegação acessível. Aguardar aprovação antes da Task 9.

## Task 9 — Implementar revisão, submissão e sucesso

### Arquivos

- Criar:
  `src/modules/quick-diagnosis/components/steps/review-step.tsx`
- Criar:
  `src/modules/quick-diagnosis/components/diagnosis-success.tsx`
- Modificar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modificar:
  `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

### Passos

1. Escrever testes falhando para revisão completa e ações Edit direcionadas à
   etapa de origem.
2. Cobrir que nenhum submit acontece antes da confirmação final.
3. Cobrir botão pendente desabilitado e prevenção de chamadas concorrentes.
4. Cobrir sucesso, erro `create_failed`, erro `unauthorized` e
   `invalid_input` retornando ao primeiro campo inválido.
5. Cobrir retry preservando respostas e o mesmo `submission_id`.
6. Cobrir “Voltar ao dashboard” e “Iniciar outro diagnóstico”; o segundo deve
   zerar respostas e gerar novo `submission_id`.
7. Implementar revisão, chamada direta da Server Action e telas de feedback.
8. Garantir que animações respeitem `prefers-reduced-motion`.
9. Executar testes focados, typecheck, lint e formatação.

### Checkpoint

Apresentar o fluxo completo da interface e os estados de falha/sucesso.
Aguardar aprovação antes da Task 10.

## Task 10 — Regressão e verificação integrada local

### Arquivos

- Modificar somente arquivos necessários para corrigir defeitos introduzidos
  nas Tasks 1–9.

### Passos

1. Reconstruir e validar o banco:

   ```bash
   pnpm supabase:reset
   pnpm exec supabase test db
   pnpm supabase:types
   pnpm supabase:lint
   pnpm supabase:advisors
   ```

2. Gerar tipos uma segunda vez e confirmar diff vazio.
3. Executar os gates da aplicação:

   ```bash
   pnpm check
   pnpm build
   git diff --check
   ```

4. No navegador, verificar desktop e mobile para:
   - os três pricing methods;
   - validação progressiva e Back;
   - edição pela revisão;
   - falha retryable;
   - sucesso e reinício limpo;
   - navegação por teclado e foco;
   - tema claro e escuro.
5. Confirmar no banco que:
   - nada existe antes da confirmação;
   - submit final cria uma linha;
   - retry com o mesmo `submission_id` continua com uma linha;
   - novo diagnóstico cria outra linha;
   - um segundo usuário não lê nem insere em nome do primeiro.
6. Inspecionar logs e respostas para garantir ausência de dados sensíveis e
   payloads técnicos.
7. Confirmar que `.env.local`, artefatos do navegador e dados locais não estão
   staged.

### Checkpoint

Entregar resumo final das validações, arquivos alterados, migration, evidências
de RLS/idempotência e itens explicitamente adiados para futuras features.

## Ordem de Implementação

1. Schema, constraints, grants, RLS e testes do banco.
2. Tipos gerados.
3. Autenticação reutilizável.
4. Validação e normalização.
5. Service idempotente.
6. Server Action.
7. Rota, sidebar e shell.
8. Etapas de entrada.
9. Revisão, submissão e sucesso.
10. Regressão e integração local.

Cada checkpoint deixa o repositório coerente e verificável. Não iniciar uma
tarefa posterior antes da aprovação do checkpoint precedente.
