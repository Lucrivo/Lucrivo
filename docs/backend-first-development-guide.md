Comece pelo contrato do caso de uso, não pelo endpoint nem pela interface. No Lucrivo, o fluxo correto é:

```text
Regras do domínio
      ↓
Migration + constraints + RLS + grants
      ↓
Testes do banco + tipos gerados
      ↓
Schema Zod
      ↓
Service/caso de uso
      ↓
Server Action ou Route Handler
      ↓
Interface
```

## 1. Defina o caso de uso

Antes do código, registre:

- Ator: quem executa?
- Entrada: quais campos são aceitos?
- Invariantes: o que nunca pode acontecer?
- Autorização: quais registros ele pode acessar?
- Saída: qual DTO será devolvido?
- Erros esperados: validação, conflito, permissão etc.
- Idempotência: repetir a requisição pode duplicar dados?

Exemplo:

```text
Caso de uso: criar transação
Ator: usuário autenticado
Entrada: conta, categoria, valor, moeda, data e descrição
Regras:
- valor deve ser positivo;
- conta e categoria precisam pertencer ao usuário;
- moeda deve ser válida;
- usuário nunca pode criar dados para outro proprietário.
Saída: transação criada
Erros: invalid_input, account_not_found, category_not_found
```

Aqui a “entidade” nasce como contrato de domínio. Não precisamos começar criando uma classe `Transaction`.

## 2. Crie a migration

O projeto usa migrations imperativas. Crie o arquivo pelo CLI:

```bash
pnpm supabase:start
pnpm exec supabase migration new create_transactions
```

A migration deve conter, na mesma alteração:

- Tabela e colunas com tipos adequados.
- `primary key`, `not null`, `check`, `unique` e foreign keys.
- Índices para foreign keys, filtros frequentes e colunas usadas por RLS.
- RLS habilitada.
- Políticas separadas para `select`, `insert`, `update` e `delete`.
- `GRANT` explícito somente para as operações necessárias.

Para dados financeiros, evite `float`; defina explicitamente se valores serão `numeric` ou unidades monetárias inteiras. Use `timestamptz` para datas e `snake_case` para identificadores.

Os `GRANT`s são especialmente importantes agora: novas tabelas podem não ser expostas automaticamente à Data API, e grants e RLS são camadas independentes. [Changelog do Supabase](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [guia oficial de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 3. Teste o banco primeiro

Crie testes SQL em:

```text
supabase/tests/transactions_rls.test.sql
```

Cubra pelo menos:

- Usuário acessa os próprios registros.
- Usuário não acessa registros de outro usuário.
- Visitante anônimo não acessa a tabela.
- `insert` não aceita outro `user_id`.
- `update` não permite transferir propriedade.
- Constraints rejeitam dados inválidos.

Execute:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

O `db reset` destrói apenas o banco local, reaplica migrations e executa o seed, comprovando que o backend é reproduzível. [Workflow local do Supabase](https://supabase.com/docs/guides/local-development/cli-workflows).

Atualmente o CI do Lucrivo ainda não executa `supabase test db`. Ao introduzirmos os primeiros testes RLS, devemos adicionar esse comando ao job `Database` em [.github/workflows/ci.yml](/home/pereira/projetos/Lucrivo/.github/workflows/ci.yml).

## 4. Gere os tipos

Depois que o banco estiver estável:

```bash
pnpm supabase:types
```

Isso atualiza:

[database.types.ts](/home/pereira/projetos/Lucrivo/src/infrastructure/database/supabase/database.types.ts)

Não escreva manualmente um segundo tipo que replique integralmente a tabela. Use os tipos gerados para persistência e crie tipos próprios apenas para inputs e DTOs da aplicação.

## 5. Crie o módulo da funcionalidade

Para uma feature `transactions`:

```text
src/modules/transactions/
├── actions/
│   └── create-transaction.action.ts
├── queries/
│   └── list-transactions.query.ts
├── schemas/
│   └── create-transaction.schema.ts
├── services/
│   └── create-transaction.service.ts
├── services/
│   └── create-transaction.service.test.ts
└── types.ts
```

Nos novos módulos, recomendo manter os schemas dentro da própria feature. Os schemas globais atuais de autenticação podem permanecer onde estão até uma refatoração necessária.

## 6. Implemente autenticação e validação

Antes do primeiro módulo financeiro, vale criar uma função central `requireUser()` que:

- Cria o cliente Supabase de servidor.
- Valida a identidade com `getClaims()`.
- Retorna `userId` e o cliente autenticado.
- Falha com um erro conhecido quando não há sessão.

Não confie apenas no layout privado. Server Actions e Route Handlers são entrypoints independentes e precisam autenticar novamente. O próprio Next recomenda tratá-los como endpoints públicos do ponto de vista de segurança. [Autenticação no Next.js](https://nextjs.org/docs/app/guides/authentication).

O schema Zod deve validar apenas o contrato de entrada:

```text
FormData/JSON → Zod → input tipado → service
```

Regras que dependem do banco, como “a conta pertence ao usuário”, ficam no service e também são protegidas pela RLS.

## 7. Implemente o service

O service é o caso de uso real. Ele deve:

- Receber dados já validados.
- Receber ou obter a identidade autenticada.
- Nunca aceitar um `user_id` arbitrário do cliente.
- Executar a operação no Supabase.
- Traduzir erros técnicos para erros do domínio.
- Retornar uma união discriminada ou lançar erros controlados.

Exemplo de resultado:

```ts
type CreateTransactionResult =
  | { status: "success"; transaction: TransactionDto }
  | {
      status: "error";
      error: "account_not_found" | "category_not_found" | "create_failed";
    };
```

Evite criar interfaces de repository antecipadamente. Podemos extrair um repository quando houver mais de uma implementação ou quando a complexidade dos acessos justificar.

## 8. Escolha o entrypoint correto

Para a própria interface do Lucrivo, normalmente não precisamos de um endpoint HTTP:

```text
Formulário → Server Action → Service → Supabase
```

Use Server Action para mutations da interface e Server Component/query para leituras.

Crie um Route Handler somente quando existir um consumidor HTTP real:

- Aplicativo mobile.
- Integração externa.
- Webhook.
- API pública.
- Cliente que não executa dentro do Next.js.

Nesse caso:

```text
POST /api/transactions
       ↓
Autenticação
       ↓
Schema Zod
       ↓
Mesmo createTransactionService
       ↓
Resposta HTTP
```

O Route Handler deve ser um adaptador fino, mapeando:

- `400`: entrada inválida.
- `401`: não autenticado.
- `403`: não autorizado.
- `404`: dependência não encontrada.
- `409`: conflito/idempotência.
- `201`: recurso criado.
- `500`: falha inesperada sem expor detalhes internos.

Não faça uma Server Action chamar `/api/transactions` por HTTP. Ambos devem chamar diretamente o mesmo service.

## 9. Fechamento da feature

Antes da interface:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
pnpm supabase:lint
pnpm supabase:advisors
pnpm check
pnpm build
```

Depois disso, implemente a tela sobre um contrato backend já funcional e testado.

Para começarmos a primeira feature de verdade, o próximo passo é escolher um único caso de uso — por exemplo, “cadastrar conta financeira” ou “criar transação” — e definir campos, invariantes e matriz de permissões antes de gerar a primeira migration. O processo operacional completo já está registrado em [WORKFLOW.md](/home/pereira/projetos/Lucrivo/docs/WORKFLOW.md) e no [guia de desenvolvimento](/home/pereira/projetos/Lucrivo/docs/production-development-guide.md).
