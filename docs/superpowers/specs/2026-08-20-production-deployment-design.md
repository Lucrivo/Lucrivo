# Design de Deploy e Operação em Produção

## Status

Design aprovado em 20 de agosto de 2026 para detalhamento da implementação.

## Objetivo

Preparar o Lucrivo para homologação e produção com Next.js na Vercel, dois
projetos Supabase hospedados, CI/CD no GitHub Actions, autenticação protegida,
SMTP temporário e rotinas mínimas de operação. A primeira publicação será um
MVP pessoal, acessado somente pelo proprietário e por poucos testadores, sem
domínio próprio e utilizando apenas planos gratuitos.

## Restrições e decisões

- Vercel Hobby enquanto o projeto continuar pessoal e não comercial.
- Dois projetos Supabase Free: `lucrivo-staging` e `lucrivo-production`.
- Repositório GitHub privado no plano gratuito.
- Ausência de proteção técnica para branches, porque branch protection e
  rulesets não estão disponíveis para repositórios privados nesse plano.
- Fluxo disciplinado por Pull Requests e CI, sem aprovação obrigatória de outra
  pessoa, pois há apenas um desenvolvedor.
- URLs `*.vercel.app`; domínio próprio fica fora desta primeira publicação.
- Gmail SMTP dedicado ao projeto como solução temporária para poucos usuários.
- Produção invite-only; staging mantém o cadastro habilitado.
- Cloudflare Turnstile nos endpoints públicos de autenticação.
- Feature previews compartilham o banco de staging; não haverá Supabase
  Branching no plano gratuito.

## Fora de escopo

- Domínio próprio para aplicação ou e-mail.
- Vercel Pro, Supabase Pro, Supabase Branching ou backups gerenciados.
- Ambientes isolados de banco por Pull Request.
- SLA, alta disponibilidade, PITR ou recuperação com perda zero de dados.
- Sentry ou outra plataforma externa de observabilidade.
- Google OAuth; o botão atual será ocultado até o provedor ser implementado.
- Promoção comercial do produto. Antes disso, o plano Hobby da Vercel deverá ser
  reavaliado.

## Arquitetura de ambientes

```text
feature/*
   │
   │ Pull Request + CI
   ▼
staging
   ├── Vercel Preview com URL estável da branch
   ├── Supabase lucrivo-staging
   └── dados exclusivamente fictícios
   │
   │ Pull Request de release + CI
   ▼
main
   ├── Vercel Production
   ├── Supabase lucrivo-production
   └── dados dos usuários do MVP
```

### Local

- Next.js em `http://localhost:3000`.
- Supabase CLI local em `http://127.0.0.1:54321`.
- Mailpit em `http://127.0.0.1:54324`.
- Variáveis em `.env.local`, que permanece ignorado pelo Git.
- Migrations, seed e configurações não secretas versionados no repositório.

### Staging

- Branch Git `staging`.
- Deployment da Vercel no ambiente Preview, com alias estável da branch.
- Projeto Supabase exclusivo `lucrivo-staging`.
- Variáveis de Preview apontando para o Supabase de staging.
- Cadastro habilitado para validar signup, confirmação, login e recuperação.
- Dados fictícios e descartáveis.
- URL pública, mas todas as áreas privadas continuam exigindo autenticação.

Feature branches também usam as variáveis Preview e o Supabase de staging. O
`APP_URL` dessas branches aponta para a URL estável de staging; por isso, links
de e-mail retornam a staging, e não a um deployment efêmero. Testes completos de
Auth por e-mail são executados no ambiente estável de staging.

### Produção

- Branch Git `main`.
- Deployment da Vercel no ambiente Production.
- Projeto Supabase exclusivo `lucrivo-production`.
- Variáveis Production apontando somente para o Supabase de produção.
- Cadastro público desabilitado depois da criação dos testadores.
- URL pública gerada pela Vercel.

## Estratégia de branches

O fluxo operacional é:

1. Criar `feature/<descricao>` a partir de `staging`.
2. Abrir Pull Request de `feature/*` para `staging`.
3. Mesclar somente depois que o CI estiver verde.
4. Validar manualmente a versão no ambiente estável de staging.
5. Abrir Pull Request de `staging` para `main`.
6. Mesclar esse PR como decisão explícita de release.
7. Confirmar migrations, deployment e smoke tests de produção.

Como o GitHub Free não impõe regras em um repositório privado, nenhuma
configuração impedirá tecnicamente push direto ou merge com CI vermelho. O
processo depende de disciplina até uma futura migração para repositório público
ou GitHub Pro.

Não será exigida aprovação de Pull Request, já que o autor é o único
desenvolvedor. O projeto usará histórico linear e squash merge como convenção.

## Matriz de variáveis

| Variável                               | Local                   | Preview/staging          | Production                   |
| -------------------------------------- | ----------------------- | ------------------------ | ---------------------------- |
| `APP_URL`                              | `http://localhost:3000` | URL estável de staging   | URL principal `*.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL`             | API local               | URL de `lucrivo-staging` | URL de `lucrivo-production`  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave pública local     | chave pública de staging | chave pública de produção    |
| `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED`      | `true`                  | `true`                   | `false`                      |
| `AUTH_SIGNUP_ENABLED`                  | `true`                  | `true`                   | `false`                      |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | chave de teste          | chave de staging         | chave de produção            |

As variáveis `NEXT_PUBLIC_*` são públicas por definição. Nenhuma secret key,
`service_role`, senha de banco, token do Supabase ou credencial SMTP será
adicionada à Vercel como variável pública.

O GitHub Actions usará secrets separados:

- `SUPABASE_ACCESS_TOKEN`.
- `STAGING_PROJECT_ID`.
- `STAGING_DB_PASSWORD`.
- `PRODUCTION_PROJECT_ID`.
- `PRODUCTION_DB_PASSWORD`.
- `STAGING_APP_URL`.
- `PRODUCTION_APP_URL`.
- `BACKUP_ENCRYPTION_PASSPHRASE`.

A senha de criptografia dos backups terá uma cópia independente no gerenciador
de senhas do proprietário.

## Configuração hospedada do Supabase

O `supabase/config.toml` é a referência local, mas configurações hospedadas de
Auth não são publicadas automaticamente por migrations. Cada projeto deverá ser
configurado e conferido separadamente no Dashboard.

### Configuração comum

- Email/password habilitado.
- Confirmação de e-mail habilitada.
- Comprimento mínimo de senha: 10.
- Requisito de senha: letras e números.
- Secure password change habilitado.
- Rotação de refresh token habilitada.
- JWT com expiração de uma hora.
- OTP com expiração máxima de uma hora.
- Frequência mínima de reenvio de 60 segundos.
- Sign-in anônimo desabilitado.
- CAPTCHA com Cloudflare Turnstile habilitado.
- Templates de confirmação e recuperação copiados dos arquivos versionados.

### URLs de staging

- Site URL: URL estável da branch `staging` na Vercel.
- Redirect URL: `<STAGING_APP_URL>/auth/confirm`.

### URLs de produção

- Site URL: URL principal de produção na Vercel.
- Redirect URL: `<PRODUCTION_APP_URL>/auth/confirm`.

Os identificadores `STAGING_APP_URL` e `PRODUCTION_APP_URL` representam valores
descobertos no provisionamento inicial da Vercel e depois armazenados nos
ambientes correspondentes; não são URLs escolhidas antes do primeiro deploy.

### Política de cadastro

- Staging mantém signup habilitado.
- Produção começa com signup habilitado somente durante a criação e confirmação
  dos poucos testadores.
- Depois disso, signup é desabilitado no Supabase e por flags no Next.js.
- A ação de cadastro verifica a flag privada no servidor; ocultar a página não é
  tratado como controle de segurança.
- Página e links de cadastro deixam de ser exibidos em produção.

## SMTP temporário

Uma conta Gmail exclusiva do projeto será usada nos dois projetos Supabase:

- 2FA ativado.
- App Password exclusiva para SMTP.
- Host `smtp.gmail.com`.
- Porta 587 com TLS ou 465 com SSL, conforme a opção aceita pelo Dashboard.
- Usuário e endereço remetente iguais à conta Gmail.
- Nome do remetente `Lucrivo`.

A App Password será cadastrada apenas no Dashboard do Supabase e no gerenciador
de senhas. Ela não será versionada nem adicionada à Vercel ou ao GitHub.

Esse SMTP é adequado apenas ao MVP com poucos testadores. Antes de usuários
reais, o projeto deve adquirir um domínio, usar um provedor transacional,
configurar SPF, DKIM e DMARC e separar e-mails de autenticação de marketing.

## CAPTCHA

Cloudflare Turnstile será integrado aos formulários de:

- Login.
- Cadastro.
- Recuperação de senha.

O componente cliente produz um token de curta duração. A Server Action valida a
presença do token e o repassa como `captchaToken` à chamada Supabase Auth. O
segredo do Turnstile fica no Dashboard do Supabase; o navegador recebe apenas a
site key.

Staging e produção usarão widgets/hostnames próprios para suas URLs estáveis.
Feature previews não serão considerados ambientes válidos para o teste completo
de CAPTCHA e e-mail.

## CI de Pull Requests

O workflow `.github/workflows/ci.yml` será executado em Pull Requests para
`staging` e `main` com permissões mínimas (`contents: read`). Ele executará:

1. Checkout.
2. Instalação das versões de Node e pnpm definidas pelo projeto.
3. `pnpm install --frozen-lockfile`.
4. `pnpm test`.
5. `pnpm typecheck`.
6. `pnpm lint`.
7. `pnpm format:check`.
8. `pnpm build`.
9. Inicialização descartável do Supabase local.
10. Reconstrução do banco com migrations e seed.
11. Verificação de migrations e lint do banco quando houver schema de domínio.

As actions externas serão fixadas em versões revisadas. A versão da Supabase CLI
no CI acompanhará a versão registrada no `package.json`/lockfile, em vez de usar
automaticamente `latest`.

Antes de ativar o CI global:

- ESLint ignorará `.agents/**`, `.codex/**` e artefatos locais do Supabase.
- Prettier terá ignores equivalentes para arquivos externos e gerados.
- Arquivos do produto continuarão integralmente cobertos pelas verificações.

## Migrations e seed

O projeto ainda não possui tabelas de domínio. Portanto, não será criada uma
migration vazia apenas para simular histórico. A estrutura será preparada para
que a primeira alteração de schema seja criada pela Supabase CLI no diretório
`supabase/migrations/`.

Regras permanentes:

- Nenhuma mudança duradoura de schema será feita manualmente no Dashboard.
- Toda mudança entra por migration versionada.
- `seed.sql` contém apenas dados fictícios e idempotentes para local/staging.
- Produção nunca executa o seed de desenvolvimento.
- Toda tabela exposta terá RLS e policies explícitas.
- Migrations destrutivas usarão expand/contract em releases distintas.

## Deploy de staging

Após merge em `staging`:

1. O workflow vincula a CLI ao `STAGING_PROJECT_ID`.
2. Aplica somente migrations pendentes no Supabase staging.
3. A integração Git da Vercel atualiza o Preview estável de `staging`.
4. Um job aguarda a nova versão ficar disponível na URL estável.
5. Smoke tests verificam health check, login público e proteção do dashboard.
6. O fluxo completo de cadastro/recuperação é validado manualmente quando Auth,
   templates ou SMTP mudarem.

## Deploy de produção

Após merge em `main`:

1. O workflow aplica migrations pendentes no `PRODUCTION_PROJECT_ID`.
2. A integração Git da Vercel publica Production.
3. Um job aguarda a versão nova na URL principal.
4. Smoke tests verificam health check, login, bloqueio do cadastro e proteção do
   dashboard.
5. Alterações de Auth/SMTP/templates exigem a conferência manual do checklist do
   release.

Vercel e migrations podem iniciar em paralelo após o merge. Por isso, migrations
devem ser retrocompatíveis. Migrations nunca serão executadas dentro do build da
Vercel.

## Health check e smoke tests

Será criado um Route Handler mínimo e público para indicar que a aplicação
responde e identificar a revisão implantada sem expor segredos. Os smoke tests
usarão a URL estável do ambiente e confirmarão:

- Health check com sucesso.
- `/login` acessível sem sessão.
- `/dashboard` redirecionando visitante para `/login`.
- `/update-password` permanecendo acessível para o início seguro do fluxo.
- `/register` disponível em staging e bloqueado em produção.

Nenhum smoke test criará usuários em produção automaticamente.

## Segurança operacional

- 2FA obrigatório nas contas GitHub, Vercel, Supabase e Gmail.
- Segredos armazenados somente nos serviços que precisam consumi-los.
- Workflows com permissões mínimas e sem imprimir credenciais.
- RLS obrigatória em todas as tabelas expostas.
- `user_metadata` nunca será usado para autorização.
- Security Advisor e Performance Advisor revisados antes de releases com schema.
- Rate limits do Auth revisados após ativar SMTP próprio.
- Logs nunca incluem senhas, tokens, e-mails completos ou payloads de provedor.
- Botão Google OAuth ocultado até existir implementação funcional e configuração
  do provedor.

## Backups no plano gratuito

Como o Supabase Free não fornece backups gerenciados para download, um workflow
semanal e acionável manualmente fará:

1. Dump lógico da produção com Supabase CLI/Postgres.
2. Criptografia do dump no runner.
3. Exclusão do arquivo em texto claro antes do upload.
4. Upload somente do arquivo criptografado como artifact privado com retenção
   curta.
5. Notificação de falha pelo GitHub Actions.

Uma restauração de teste será realizada periodicamente em staging, mediante ação
manual explícita. O procedimento não sobrescreverá staging automaticamente.

O backup não elimina as limitações do plano gratuito: não há PITR, SLA ou
garantia de ausência de perda entre dumps.

## Observabilidade

Na primeira fase serão usados:

- Logs de build da Vercel.
- Runtime logs da Vercel, com retenção curta do plano Hobby.
- Logs de Auth e banco no Supabase.
- Security Advisor e Performance Advisor.
- Histórico e notificações do GitHub Actions.
- Smoke tests pós-deploy.
- Dependabot semanal para dependências npm e GitHub Actions.

Sentry fica adiado até o produto ter usuários reais ou a retenção nativa deixar
de ser suficiente para diagnosticar falhas.

## Configurações manuais

As seguintes ações exigem acesso humano aos painéis e não serão simuladas no
repositório:

1. Ativar 2FA em todas as contas.
2. Criar os dois projetos Supabase na mesma região adequada ao público alvo.
3. Criar e proteger as senhas dos bancos.
4. Criar a conta Gmail, ativar 2FA e gerar App Password.
5. Configurar SMTP nos dois projetos Supabase.
6. Configurar Auth, URLs, CAPTCHA, rate limits e templates nos dois projetos.
7. Criar os widgets Turnstile para as URLs estáveis.
8. Importar o repositório na Vercel e definir `main` como Production Branch.
9. Configurar variáveis Vercel por ambiente e por branch.
10. Criar secrets do GitHub Actions.
11. Criar a branch `staging` e usar PRs como convenção.
12. Criar e confirmar testadores antes de desabilitar signup em produção.

Cada etapa terá instrução de verificação e não será marcada como concluída sem
evidência do serviço correspondente.

## Ordem de implantação

1. Corrigir a superfície de CI local: ignores, scripts e build reproduzível.
2. Adicionar flags de signup e remover a ação Google inoperante.
3. Integrar Turnstile e testar localmente com chaves de teste.
4. Preparar migrations, validação local e tipos gerados quando houver schema.
5. Adicionar health check e smoke tests.
6. Criar workflows de CI, staging, produção, backup e Dependabot.
7. Provisionar Supabase staging e configurar Auth/SMTP/CAPTCHA.
8. Provisionar Vercel Preview/staging e validar o fluxo completo.
9. Provisionar Supabase produção e repetir a configuração auditada.
10. Provisionar Vercel Production e criar os testadores.
11. Desabilitar signup em produção e executar a verificação final.
12. Documentar operação, rollback, backup e restauração.

## Estratégia de rollback

- Aplicação: promover novamente um deployment anterior pela Vercel ou fazer um
  novo commit de reversão.
- Banco: migrations não dependem de rollback automático. Mudanças destrutivas
  são evitadas; correções entram em uma nova migration.
- Auth/configuração: registrar valores anteriores no checklist antes de cada
  mudança manual relevante.
- Dados: restaurar o último dump criptografado somente após avaliar a perda de
  dados e testar o procedimento em staging.

## Critérios de aceitação

- PRs para `staging` e `main` recebem resultado de CI reproduzível.
- O banco local é reconstruído a partir do repositório.
- Staging e produção usam projetos Supabase e variáveis diferentes.
- Migrations chegam a staging antes da promoção para produção.
- Cadastro funciona em staging e está bloqueado em produção na UI e no servidor.
- Login, confirmação, recuperação e logout funcionam nas URLs da Vercel.
- CAPTCHA protege login, signup e recuperação.
- E-mails chegam aos testadores pelo SMTP temporário.
- Nenhum segredo aparece no repositório, build ou logs.
- Tabelas futuras não chegam à produção sem RLS e policies verificadas.
- Health check e smoke tests detectam uma publicação inválida.
- Existe backup lógico criptografado e procedimento de restauração testado.
- Limitações dos planos gratuitos estão registradas e aceitas.

## Limitações aceitas

- O repositório privado no GitHub Free não possui enforcement de branches.
- Vercel Hobby é apenas para uso pessoal e não comercial.
- Projetos Supabase Free podem pausar por inatividade.
- Feature previews compartilham o Supabase staging.
- Runtime logs têm retenção curta.
- Gmail SMTP não é infraestrutura definitiva de e-mail transacional.
- Backups semanais permitem perda de dados desde o último dump.
- URLs são públicas e utilizam o domínio gerado pela Vercel.

## Referências

- [Supabase: Deployment & Branching](https://supabase.com/docs/guides/deployment)
- [Supabase: Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase: Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase: Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Vercel: Environments](https://vercel.com/docs/deployments/environments)
- [Vercel: Hobby Plan](https://vercel.com/docs/plans/hobby)
- [GitHub: Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
