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

Para desenvolver os fluxos de cobrança, configure também `APP_URL`,
`SUPABASE_SECRET_KEY`, `ASAAS_API_URL`, `ASAAS_API_KEY` e
`ASAAS_WEBHOOK_TOKEN`. Use somente credenciais do sandbox localmente e nunca
prefixe secrets com `NEXT_PUBLIC_`. A configuração do webhook, a lista de
eventos, a homologação e os procedimentos de recuperação estão no
[runbook de billing com Asaas](docs/asaas-billing-runbook.md).

## Banco local

Reconstrua o banco a partir de `supabase/config.toml`, migrations e
`supabase/seed.sql` com:

```bash
pnpm seed:generate
pnpm seed:check
pnpm supabase:reset
```

`seed:generate` atualiza o SQL determinístico e `seed:check` detecta drift entre
o catálogo TypeScript e o artefato versionado. O reset apaga os dados locais e
recria 97 identidades fictícias, 295 relatórios, assinaturas, pagamentos e
históricos administrativos. Para reaplicar o seed sem resetar o banco, ou
validar sua idempotência e a preservação de dados externos, use:

```bash
pnpm seed:local
pnpm seed:verify-local
```

O acesso administrativo, exclusivo para desenvolvimento e homologação, é:

```text
E-mail: admin@seed.lucrivo.test
Senha:  LucrivoSeed2026AA
```

Os clientes seguem o padrão `cliente+001@seed.lucrivo.test` até
`cliente+096@seed.lucrivo.test` e usam a mesma senha fictícia. O seed é
idempotente e não é executado automaticamente nos ambientes hospedados.

### Seed de homologação

Primeiro aplique as migrations versionadas pelo fluxo normal de deploy. Obtenha
a URL PostgreSQL do projeto de homologação no gerenciador de segredos, sem
registrá-la no repositório ou em logs, e exponha-a como
`STAGING_DATABASE_URL`. Com a CLI vinculada ao projeto correto, execute:

```bash
ALLOW_STAGING_SEED=true pnpm seed:staging
```

O runner exige simultaneamente o opt-in explícito, a URL do banco e o project
ref de homologação `camekuaudqgwawidieym`. Ele recusa qualquer outro projeto,
inclusive produção, e não possui comando equivalente para produção. A execução
recria somente as identidades do namespace reservado do seed, preserva os
demais registros e aborta se já existir outro administrador configurado.

O comando não executa migrations nem `db reset`; migrations pendentes devem ser
resolvidas antes. Nunca adapte o guard para apontar ao ambiente de produção.

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
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

O valor de CI permite apenas verificar localmente o build otimizado sem usar a
chave dummy oficial presente em `.env.local`. Esse artefato não deve ser
publicado. Em staging e produção, `pnpm build` deve receber a site key real do
widget Turnstile configurado para o ambiente.

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
