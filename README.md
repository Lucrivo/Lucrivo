# Lucrivo

Base web em Next.js, TypeScript e App Router.

## Desenvolvimento

Copie `.env.example` para `.env.local`, preencha as variáveis do Supabase local
e inicie a stack antes da aplicação:

```bash
pnpm supabase:start
pnpm dev
```

O Studio fica em `http://127.0.0.1:54323` e o Mailpit em
`http://127.0.0.1:54324`. Para encerrar a stack preservando os volumes:

```bash
pnpm supabase:stop
```

## Banco local

Reconstrua o banco a partir de `supabase/config.toml`, migrations e
`supabase/seed.sql` com:

```bash
pnpm supabase:reset
```

Esse comando apaga os dados locais. O seed deve permanecer idempotente e nunca é
executado automaticamente nos ambientes hospedados.

Gere os tipos TypeScript do schema `public` e valide o banco local com:

```bash
pnpm supabase:types
pnpm supabase:lint
pnpm supabase:advisors
```

O arquivo gerado
`src/infrastructure/database/supabase/database.types.ts` deve ser versionado. A
segunda geração, sem mudanças de schema, deve produzir diff vazio.

Este projeto usa migrations imperativas. A primeira alteração real de domínio
deve começar pelo comando descoberto na CLI instalada:

```bash
pnpm exec supabase migration new nome_da_migration
```

Não crie migrations vazias. Revise SQL, RLS, índices e advisors antes de
versionar qualquer alteração de schema.

## Validações

```bash
pnpm check
pnpm supabase:lint
pnpm supabase:advisors
pnpm build
```

## Integração contínua

Pull Requests destinados a `staging` ou `main` executam dois jobs independentes
no GitHub Actions:

- `Application`: instala as dependências com lockfile congelado e executa testes,
  typecheck, lint, verificação de formato e build.
- `Database`: inicia uma stack Supabase local descartável, reconstrói o banco,
  verifica se os tipos gerados estão atualizados e executa o lint do schema.

O workflow também pode ser iniciado manualmente por `workflow_dispatch`. Ele
possui apenas permissão de leitura do repositório e não recebe secrets em Pull
Requests.

No plano gratuito do GitHub, enquanto este repositório permanecer privado, o
resultado da CI não impede tecnicamente um merge. Mesclar somente com ambos os
jobs verdes é uma convenção obrigatória do projeto.
