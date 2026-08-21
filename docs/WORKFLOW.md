Sim — e, para este projeto, eu seguiria um backend-first com o Supabase como backend de dados/autenticação e o Next.js como camada de aplicação/BFF.

A arquitetura ficaria assim:

```text
Browser
   │
   ├── Server Components ── consultas
   ├── Server Actions ───── mutations da própria interface
   └── Route Handlers ───── APIs públicas, webhooks e integrações
                         │
                         ▼
                Casos de uso do domínio
                         │
                         ▼
                Supabase/Postgres
             constraints + grants + RLS
```

## Como dividir as responsabilidades

### Supabase/Postgres

Deve ser a fonte de verdade para:

- Schema e tipos dos dados.
- Chaves estrangeiras, `unique`, `check`, `not null`.
- Índices.
- RLS e autorização por linha.
- Operações atômicas/transacionais através de funções Postgres quando necessário.
- Auth, Storage e Realtime.

O banco não deve depender apenas da validação feita pelo Next. Mesmo que uma ação seja chamada incorretamente ou alguém acesse a Data API diretamente, as constraints e políticas devem continuar protegendo os dados.

### Next.js

Deve funcionar como a camada de aplicação:

- Validar entradas com Zod.
- Descobrir o usuário autenticado.
- Executar casos de uso.
- Orquestrar mais de uma operação.
- Traduzir erros técnicos em erros da aplicação.
- Revalidar cache.
- Entregar DTOs pequenos para a interface.
- Integrar APIs externas.

### Interface

Os componentes devem:

- Renderizar dados recebidos.
- Controlar estado visual.
- Fazer validação amigável para o usuário.
- Chamar Server Actions ou endpoints.

Eles não devem concentrar regras financeiras ou regras de autorização.

## Estrutura recomendada

Eu não adotaria uma Clean Architecture completa neste momento. Para o tamanho atual, isso criaria muitas interfaces, repositories e mappers sem retorno. Usaria um monólito modular organizado por funcionalidade:

```text
src/
├── app/
│   ├── (public)/
│   ├── (private)/
│   └── api/
│       └── webhooks/
│
├── modules/
│   ├── auth/
│   │   ├── actions/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── transactions/
│   │   ├── actions/
│   │   ├── queries/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── accounts/
│   └── categories/
│
├── infrastructure/
│   ├── auth/
│   └── database/
│       └── supabase/
│           ├── browser.client.ts
│           ├── server.client.ts
│           └── database.types.ts
│
├── components/
│   ├── ui/
│   └── shared/
│
└── shared/
    ├── errors/
    ├── validation/
    └── utils/
```

O diretório `app` fica responsável principalmente por rotas, layouts e composição. As funcionalidades ficam em `modules`, evitando que `actions`, `schemas` e serviços globais se transformem em pastas enormes.

Se uma funcionalidade adquirir regras de domínio realmente complexas, ela pode evoluir:

```text
modules/transactions/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

Não é necessário começar assim para todos os módulos.

## Quando usar cada mecanismo do Next

| Necessidade                                        | Mecanismo                             |
| -------------------------------------------------- | ------------------------------------- |
| Carregar dados para uma página                     | Server Component chamando uma query   |
| Enviar um formulário da aplicação                  | Server Action                         |
| Mutação disparada pela interface                   | Server Action                         |
| Webhook do Stripe ou outro serviço                 | Route Handler                         |
| API consumida por mobile/terceiros                 | Route Handler                         |
| Realtime, upload direto ou estado muito interativo | Cliente Supabase no browser           |
| Operação atômica complexa no banco                 | Função Postgres/RPC                   |
| Job sem vínculo com request do Next                | Supabase Cron, Queue ou Edge Function |

Não é necessário criar um Route Handler e depois fazer o Server Component chamar `/api/...`. Isso adicionaria uma chamada HTTP interna sem benefício. O Component e o Handler podem chamar diretamente o mesmo caso de uso.

Route Handlers são endpoints HTTP públicos e precisam ser protegidos como qualquer API. Server Actions também podem ser acionadas por requisições diretas e precisam validar autenticação e autorização internamente. Isso é enfatizado pela própria documentação do Next.js: [Authentication/DAL](https://nextjs.org/docs/app/guides/authentication), [Server Functions](https://nextjs.org/docs/app/getting-started/mutating-data) e [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).

## Fluxo backend-first sugerido

Para cada feature, por exemplo “criar uma transação”:

1. Definir o caso de uso e suas invariantes:
   - valor deve ser positivo;
   - conta pertence ao usuário;
   - categoria é válida;
   - data não pode ultrapassar determinado limite, se houver.

2. Criar a migration:
   - tabelas;
   - constraints;
   - índices;
   - grants;
   - RLS;
   - funções SQL necessárias.

3. Executar o banco local do zero:

   ```bash
   pnpm supabase db reset
   ```

4. Criar seed de desenvolvimento.

5. Gerar os tipos TypeScript:

   ```bash
   pnpm supabase gen types --lang typescript --local
   ```

6. Implementar a query ou serviço do módulo.

7. Criar a Server Action fina:
   - validar o payload;
   - obter a identidade;
   - chamar o serviço;
   - retornar resultado tipado;
   - executar `revalidatePath` ou `revalidateTag`.

8. Construir a interface em cima do contrato já testado.

9. Adicionar testes:
   - migrations e RLS;
   - regras do caso de uso;
   - Server Action;
   - interface.

O Supabase recomenda manter migrations, configuração e seed versionados, além de validar toda a cadeia com `db reset`: [workflow local oficial](https://supabase.com/docs/guides/local-development/cli-workflows).

## Avaliação da estrutura atual

Há vários pontos corretos:

- O cliente de servidor em [server.client.ts](/home/pereira/projetos/Lucrivo/src/infrastructure/database/supabase/clients/server.client.ts) está separado do browser client.
- O Proxy renova a sessão usando `getClaims()`.
- A chave pública usada é uma publishable key.
- Os formulários são validados no servidor com Zod.
- Os route groups `(public)` e `(private)` estão bem utilizados.

O fluxo SSR atual segue a recomendação oficial: cliente de browser, cliente de servidor e Proxy para renovar cookies. A documentação atual também recomenda `getClaims()` para verificar a identidade, reservando `getUser()` para quando for necessário obter o cadastro mais recente do Auth: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Eu faria quatro ajustes de direção.

### 1. Criar o contrato do banco no repositório

Atualmente o projeto possui `supabase/config.toml`, mas não aparecem migrations, schema declarativo, seed ou tipos gerados. Portanto, a parte backend ainda não está reprodutível.

Como `schema_paths` está vazio e não existe `supabase/schemas`, o projeto está configurado naturalmente para migrations imperativas:

```text
supabase/
├── config.toml
├── migrations/
├── seed.sql
└── tests/
```

Escolham esse fluxo e não misturem alterações manuais permanentes no Dashboard com migrations.

### 2. Centralizar a autenticação segura

O layout privado é útil para redirecionamento e experiência do usuário, mas não deve ser considerado a barreira de segurança. Cada query sensível, Server Action e Route Handler deve autenticar e autorizar novamente.

Criaria algo como:

```ts
import "server-only";

import { cache } from "react";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    throw new Error("UNAUTHORIZED");
  }

  return { userId, supabase };
});
```

Depois, queries e ações utilizam `requireUser()`. A RLS continua sendo a última barreira.

### 3. Deixar somente os entrypoints como `"use server"`

Hoje [signup.action.ts](/home/pereira/projetos/Lucrivo/src/actions/auth/signup.action.ts) também é uma Server Action exportada. Isso significa que ela deve ser tratada como um endpoint independente, embora a validação principal esteja em `register.action.ts`.

Há duas opções:

- Tornar `signup` um serviço server-only comum, removendo `"use server"`, e deixar apenas `register` como entrypoint.
- Manter `signup` como Server Action, mas fazer validação runtime completa nela também.

Eu escolheria a primeira.

### 4. Usar acesso pelo servidor como padrão

Mesmo sendo seguro expor a publishable key, desde que haja RLS correta, para um produto financeiro eu adotaria:

- Server Components para leitura inicial.
- Server Actions para mutações.
- Browser client apenas para Realtime, Storage direto ou experiências que realmente precisem dele.
- Nunca usar secret key/service role no fluxo normal do usuário.

Secret keys ignoram RLS e devem ficar restritas a processos administrativos previamente autorizados: [API keys do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Atenção aos grants

Desde 30 de maio de 2026, novos projetos Supabase não expõem automaticamente novas tabelas na Data API. Portanto, as migrations precisam declarar explicitamente os privilégios necessários, além da RLS:

```sql
grant select, insert, update, delete
on table public.transactions
to authenticated;

alter table public.transactions enable row level security;
```

O `GRANT` permite que o papel alcance a tabela; a RLS determina quais linhas ele pode acessar. São camadas diferentes. Essa mudança está documentada no [changelog do Supabase](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Em resumo: mantenham um único backend lógico. Supabase/Postgres cuida da persistência e segurança dos dados; Next.js cuida dos casos de uso e das interfaces de entrada. Comecem cada feature por migration, constraints, RLS, seed e tipos; depois implementem serviços, Server Actions e finalmente a UI. Isso fornece um backend-first real sem desperdiçar as vantagens full-stack do Next.js.
