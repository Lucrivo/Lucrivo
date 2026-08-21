# Plano de Implementação de Deploy e Produção

> Design de origem:
> `docs/superpowers/specs/2026-08-20-production-deployment-design.md`

## Objetivo

Preparar e publicar o Lucrivo em staging e produção com Vercel, Supabase,
GitHub Actions, Gmail SMTP e Cloudflare Turnstile, usando somente planos
gratuitos. Executar uma tarefa por vez, apresentar evidências e aguardar
aprovação antes da tarefa seguinte.

## Restrições

- Não criar, alterar ou excluir recursos externos sem aprovação explícita na
  tarefa correspondente.
- Nunca imprimir ou versionar credenciais, tokens, senhas de banco, App
  Passwords ou chaves secretas.
- Manter `.env.local` fora do Git.
- Usar `staging` para homologação e `main` para produção.
- Tratar os checks do GitHub como informativos, porque o repositório privado no
  GitHub Free não possui enforcement de branches.
- Não executar migrations dentro do build da Vercel.
- Não criar migration vazia; a primeira migration será criada quando houver
  schema de domínio.
- Não executar seed de desenvolvimento em produção.
- Manter staging e produção em projetos Supabase diferentes.
- Usar somente publishable keys no código enviado ao navegador.
- Descobrir comandos e flags da Supabase CLI com `--help` antes de usá-los.
- Fixar versões de dependências e preservar o lockfile.
- Implementar mudanças de comportamento com testes primeiro.
- Cada checkpoint deixa o repositório utilizável e reversível.

## Task 1 — Tornar os quality gates globais reproduzíveis

### Arquivos

- Criar: `.prettierignore`
- Modificar: `eslint.config.mjs`
- Modificar: `package.json`

### Passos

1. Executar `pnpm lint` e `pnpm format:check` e registrar as falhas atuais
   causadas por arquivos externos ou gerados.
2. Adicionar ignores apenas para:
   - `.agents/**`
   - `.codex/**`
   - `.next/**`
   - `coverage/**`
   - `supabase/.temp/**`
   - outros artefatos comprovadamente gerados, se aparecerem na execução.
3. Não ignorar `src/**`, `supabase/migrations/**`, templates, workflows ou
   documentação do produto.
4. Remover duplicações existentes nos `globalIgnores` do ESLint sem mudar regras
   aplicáveis ao código do produto.
5. Adicionar scripts compostos sem shell específico:
   - `check`: testes, typecheck, lint e format check.
   - manter `build` separado para facilitar diagnóstico.
6. Executar:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm build
   git diff --check
   ```

7. Se Turbopack for bloqueado apenas pelo sandbox local, confirmar o build com a
   opção Webpack documentada e registrar a limitação; não trocar o build padrão
   sem um defeito real do projeto.

### Checkpoint

Reportar os quality gates verdes e a lista exata de caminhos ignorados. Aguardar
aprovação antes da Task 2.

## Task 2 — Implementar o modo invite-only e remover OAuth inoperante

### Arquivos

- Criar: `src/config/auth-environment.ts`
- Criar: `src/config/auth-environment.test.ts`
- Criar: `src/modules/auth/actions/register.action.test.ts`
- Modificar: `.env.example`
- Modificar: `src/app/(public)/login/page.tsx`
- Modificar: `src/app/(public)/register/page.tsx`
- Modificar: `src/components/login/login-form.tsx`
- Modificar: `src/components/login/login-form.test.tsx`
- Modificar: `src/components/register/register-form.tsx`
- Modificar: `src/components/register/register-form.test.tsx`
- Modificar: `src/modules/auth/actions/register.action.ts`

### Contrato

- `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED` controla somente apresentação.
- `AUTH_SIGNUP_ENABLED` é a autoridade no servidor.
- Produção usa ambas como `false`; local e staging usam `true`.
- A ação retorna `signup_disabled` antes de chamar Supabase quando a flag privada
  está desligada.
- `/register` redireciona visitantes para `/login?status=signup_disabled` quando
  signup está desabilitado.
- O login não exibe link de cadastro quando a flag pública está desligada.
- Login e registro não exibem o botão Google até OAuth existir.

### Passos

1. Escrever testes falhando para parsing explícito das flags; valores ausentes,
   inválidos ou diferentes de `true` devem usar o padrão seguro documentado.
2. Escrever testes falhando provando que `register` não chama o serviço quando
   `AUTH_SIGNUP_ENABLED=false`.
3. Estender testes dos formulários para ausência do bloco Google e exibição
   condicional do link de cadastro.
4. Implementar um helper pequeno, determinístico e sem acesso a secrets.
5. Proteger a página e a Server Action, sem confiar apenas na UI.
6. Atualizar `.env.example` com valores locais seguros e comentários por
   ambiente.
7. Executar testes focados, suite completa, typecheck, lint e formatação.

### Checkpoint

Demonstrar signup habilitado localmente, bloqueado por configuração e nenhuma
chamada de backend quando desabilitado. Aguardar aprovação antes da Task 3.

## Task 3 — Integrar Cloudflare Turnstile aos fluxos de Auth

### Arquivos

- Criar: `src/components/shared/auth/turnstile-field.tsx`
- Criar: `src/components/shared/auth/turnstile-field.test.tsx`
- Modificar: `.env.example`
- Modificar: `supabase/config.toml`
- Modificar: `src/config/auth-environment.ts`
- Modificar: `src/config/auth-environment.test.ts`
- Modificar: `src/components/login/login-form.tsx`
- Modificar: `src/components/login/login-form.test.tsx`
- Modificar: `src/components/register/register-form.tsx`
- Modificar: `src/components/register/register-form.test.tsx`
- Modificar: `src/components/forgot-password/forgot-password-form.tsx`
- Modificar: `src/components/forgot-password/forgot-password-form.test.tsx`
- Modificar: `src/modules/auth/actions/login.action.ts`
- Criar ou modificar: `src/modules/auth/actions/login.action.test.ts`
- Modificar: `src/modules/auth/actions/register.action.ts`
- Modificar: `src/modules/auth/actions/register.action.test.ts`
- Modificar: `src/modules/auth/actions/request-password-recovery.action.ts`
- Modificar:
  `src/modules/auth/actions/request-password-recovery.action.test.ts`
- Modificar: `src/modules/auth/services/signup.service.ts`
- Criar ou modificar: `src/modules/auth/services/signup.service.test.ts`
- Modificar:
  `src/modules/auth/services/request-password-recovery.service.ts`
- Modificar:
  `src/modules/auth/services/request-password-recovery.service.test.ts`

### Contrato

- O navegador recebe somente `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- O widget produz `captchaToken` dentro do formulário.
- Quando `AUTH_CAPTCHA_ENABLED=true`, token ausente retorna `captcha_required`
  antes de qualquer chamada Supabase.
- Login, signup e recovery repassam o token em `options.captchaToken`.
- Supabase Auth faz a validação definitiva contra o segredo configurado no
  projeto.
- O desafio é reiniciado depois de cada submissão aceita ou rejeitada.
- Falhas não expõem resposta do Cloudflare ou Supabase.

### Passos

1. Consultar novamente a documentação atual de CAPTCHA do Supabase e Turnstile
   antes da implementação.
2. Usar o script oficial do Turnstile e renderização explícita em um componente
   cliente reutilizável; evitar uma dependência React comunitária se a API nativa
   for suficiente.
3. Escrever testes falhando para renderização, token, reset e ausência de site
   key.
4. Escrever testes falhando para ações sem token, com token e CAPTCHA
   desabilitado localmente.
5. Adicionar o widget aos três formulários dentro do elemento `<form>`.
6. Configurar localmente as chaves dummy oficiais que sempre passam:
   - site key `1x00000000000000000000AA`.
   - secret key `1x0000000000000000000000000000000AA`.
7. Fazer a aplicação recusar a site key dummy quando `NODE_ENV=production` e
   registrar no runbook que o secret dummy jamais pode ser usado nos projetos
   hospedados. As chaves acima são públicas e servem somente aos testes locais.
8. Reiniciar a stack Supabase, validar signup/login/recovery localmente e
   confirmar e-mail no Mailpit.
9. Executar regressão completa e verificações estáticas.

### Checkpoint

Reportar os três fluxos protegidos, o teste local com chaves dummy e a barreira
contra chaves dummy em produção. Aguardar aprovação antes da Task 4.

## Task 4 — Adicionar health check e smoke tests reutilizáveis

### Arquivos

- Criar: `src/app/api/health/route.ts`
- Criar: `src/app/api/health/route.test.ts`
- Criar: `scripts/smoke-test.mjs`
- Modificar: `package.json`
- Modificar: `.env.example`

### Contrato

- `GET /api/health` retorna status 200, nome do serviço, ambiente e revisão.
- Não retorna variáveis, chaves, tokens, dados de usuário ou detalhes internos.
- O smoke test aceita uma base URL explícita e a expectativa de signup.
- O script falha com exit code não zero quando qualquer contrato é violado.
- Rotas verificadas:
  - `/api/health` → 200.
  - `/login` → 200.
  - `/dashboard` sem cookies → redirect para `/login`.
  - `/update-password` → 200.
  - `/register` → 200 em staging e redirect/bloqueio em produção.

### Passos

1. Escrever testes falhando para o Route Handler e sua sanitização.
2. Implementar o endpoint sem consultar banco ou Auth, para distinguir saúde da
   aplicação de saúde das dependências.
3. Implementar o script com `fetch` nativo, timeout, redirects manuais quando
   necessário e saída sem conteúdo de páginas.
4. Adicionar `smoke:test` ao `package.json`.
5. Executar contra o servidor local e testar deliberadamente uma URL inválida
   para confirmar exit code de falha.
6. Executar suite, types, lint, format e build.

### Checkpoint

Entregar o contrato do health check e evidência do smoke local positivo e
negativo. Aguardar aprovação antes da Task 5.

## Task 5 — Formalizar o fluxo local de banco e tipos

### Arquivos

- Criar: `src/infrastructure/database/supabase/database.types.ts`
- Modificar: `package.json`
- Modificar: `README.md`
- Modificar: `supabase/seed.sql` apenas se necessário para idempotência

### Passos

1. Descobrir pela CLI instalada os comandos atuais de start, reset, lint,
   migrations e geração de tipos.
2. Confirmar que não há schema de domínio a converter; não criar migration vazia.
3. Reconstruir o banco local a partir de `config.toml` e `seed.sql`.
4. Gerar e versionar os tipos TypeScript do schema local vazio/atual.
5. Adicionar scripts explícitos para:
   - iniciar/parar Supabase local.
   - resetar o banco local.
   - gerar tipos locais.
   - verificar lint do banco quando suportado pela versão fixada.
6. Documentar que a primeira mudança de domínio deve começar com
   `supabase migration new nome_da_migration` descoberto via `--help`.
7. Executar geração duas vezes e confirmar diff vazio na segunda execução.
8. Executar advisors/lint local aplicável e regressão do projeto.

### Checkpoint

Reportar reconstrução do banco, tipos determinísticos e ausência consciente de
migration vazia. Aguardar aprovação antes da Task 6.

## Task 6 — Criar o workflow de CI

### Arquivos

- Criar: `.github/workflows/ci.yml`
- Criar: `.node-version`
- Modificar: `README.md`

### Gatilhos

- `pull_request` para `staging` e `main`.
- `workflow_dispatch` para diagnóstico manual.

### Jobs

1. `application`:
   - permissões `contents: read`.
   - checkout.
   - Node 22 e pnpm conforme `packageManager`.
   - cache pnpm.
   - `pnpm install --frozen-lockfile`.
   - testes, typecheck, lint, format e build.
2. `database`:
   - instalação frozen.
   - Supabase CLI do lockfile.
   - stack local descartável.
   - reset do banco e seed.
   - geração de tipos e falha se produzir diff.
   - lint do banco suportado pela CLI.
   - encerramento da stack mesmo após falha.

### Passos

1. Criar o YAML com ações externas revisadas e fixadas.
2. Não usar `pull_request_target` nem disponibilizar secrets em PRs.
3. Validar YAML localmente e revisar permissões.
4. Fazer push somente após aprovação explícita.
5. Abrir PR de teste e confirmar ambos os jobs no GitHub.
6. Registrar que o check não bloqueia merge no GitHub Free privado; o merge
   continua sendo uma convenção humana.

### Checkpoint

Apresentar links/resultados dos jobs reais no GitHub, sem alterar recursos de
produção. Aguardar aprovação antes da Task 7.

## Task 7 — Preparar workflows de deploy, backup e Dependabot

### Arquivos

- Criar: `.github/workflows/deploy-staging.yml`
- Criar: `.github/workflows/deploy-production.yml`
- Criar: `.github/workflows/backup-production.yml`
- Criar: `.github/dependabot.yml`
- Criar: `docs/operations/deployment-runbook.md`
- Criar: `docs/operations/backup-restore-runbook.md`

### Deploy de staging

- Gatilho: push em `staging` e execução manual.
- Usa somente secrets de staging.
- Descobre e aplica migrations pendentes com flags documentadas.
- Nunca executa seed remoto.
- Aguarda a revisão ficar disponível no alias estável.
- Executa smoke test com signup esperado como habilitado.

### Deploy de produção

- Gatilho: push em `main` e execução manual.
- Usa somente secrets de produção.
- Aplica migrations antes da validação pós-deploy.
- Nunca executa seed.
- Executa os checks independentes de signup durante o bootstrap.
- Depois do endurecimento invite-only, usa uma variável explícita do ambiente
  para exigir no smoke test que signup permaneça desabilitado.

### Backup

- Gatilhos: semanal e manual.
- Faz dump lógico de produção usando comando descoberto via CLI.
- Criptografa antes do upload.
- Remove o arquivo claro no runner mesmo em falha.
- Artifact contém somente o arquivo criptografado e tem retenção curta.
- Nunca restaura automaticamente.

### Dependabot

- Atualizações semanais separadas para npm e GitHub Actions.
- Limite baixo de PRs abertos.
- Nenhum auto-merge.

### Passos

1. Consultar `supabase link --help`, `db push --help` e `db dump --help` antes de
   escrever comandos.
2. Criar workflows com `concurrency` por ambiente para impedir dois deploys
   simultâneos.
3. Usar ambientes/secrets separados e permissões mínimas.
4. Validar sintaxe sem executar deploy, pois os recursos externos ainda não
   existem.
5. Documentar provisionamento, release, rollback, rotação de secrets, dump e
   restauração.
6. Executar regressão local.

### Checkpoint

Entregar workflows sintaticamente validados e ainda não acionados. Aguardar
aprovação antes da Task 8.

## Task 8 — Provisionar Gmail SMTP e Cloudflare Turnstile

### Alterações externas

- Criar ou selecionar uma conta Gmail exclusiva do Lucrivo.
- Ativar 2FA e gerar uma App Password exclusiva.
- Criar widgets Turnstile separados para staging e produção.

### Passos

1. O usuário cria/confirma a conta Gmail e ativa 2FA; o agente nunca solicita que
   a senha seja colada no chat ou terminal.
2. Gerar App Password e armazená-la diretamente no gerenciador de senhas.
3. Criar widget Turnstile staging com o hostname estável de staging, quando ele
   estiver disponível; se a URL ainda não existir, concluir Gmail e deixar o
   widget staging para Task 10.
4. Criar widget production com o hostname de produção, quando disponível.
5. Guardar site keys e secrets no gerenciador de senhas com nomes de ambiente.
6. Não adicionar secrets reais ao `.env.example`, Git ou output de ferramentas.

### Checkpoint

Confirmar somente que as credenciais existem e estão armazenadas; não revelar
valores. Aguardar aprovação antes da Task 9.

## Task 9 — Provisionar e configurar Supabase staging

### Alterações externas

- Criar projeto `lucrivo-staging` no Supabase Free.
- Configurar Auth, SMTP, CAPTCHA, templates, URLs e rate limits.
- Criar secrets de staging no GitHub e variáveis Preview na Vercel quando
  aplicável.

### Passos

1. Criar o projeto na região disponível mais próxima do público alvo e guardar a
   senha do banco.
2. Registrar project ref, URL e publishable key sem expor secret/service role.
3. Configurar:
   - signup e confirmação de e-mail habilitados.
   - senha mínima 10, letras e números.
   - secure password change e rotação de refresh token.
   - OTP uma hora ou menos e resend de 60 segundos.
   - sign-in anônimo desabilitado.
4. Configurar SMTP Gmail no Dashboard e enviar um e-mail de teste a um endereço
   autorizado.
5. Criar/aplicar o widget Turnstile staging e habilitar CAPTCHA no Auth.
6. Copiar os templates versionados de confirmação e recuperação.
7. Configurar Site URL e Redirect URL depois que a URL estável da Vercel existir;
   até lá, usar somente a etapa de banco/SMTP e não afirmar Auth E2E completo.
8. Adicionar secrets de staging ao GitHub sem imprimi-los.
9. Aplicar migrations pendentes por execução manual controlada do workflow.
10. Conferir Security e Performance Advisors.

### Checkpoint

Entregar checklist de staging com evidências não secretas e itens de URL
explicitamente pendentes, se houver. Aguardar aprovação antes da Task 10.

## Task 10 — Criar a branch e o deployment estável de staging

### Alterações externas

- Criar/publicar branch `staging` a partir do baseline aprovado.
- Importar o repositório na Vercel Hobby.
- Configurar Preview/staging e integração Git.

### Passos

1. Confirmar que `feat/auth-pages` e as tarefas de infraestrutura aprovadas estão
   em um estado limpo e versionado.
2. Criar `staging` somente após aprovação explícita e publicar no origin.
3. Importar o repositório na Vercel e definir `main` como Production Branch.
4. Não preencher Production com credenciais de staging. Até a Task 12, aceitar
   que o deployment inicial de `main` fique sem configuração/falhe e não o
   tratar como uma release de produção.
5. Configurar as variáveis Preview com valores do Supabase staging e signup
   habilitado.
6. Obter o alias estável da branch `staging`.
7. Atualizar `APP_URL`, Site URL, Redirect URL e hostname Turnstile staging.
8. Acionar novo deployment para garantir que todas as variáveis atualizadas
   entraram no build.
9. Adicionar `STAGING_APP_URL` ao GitHub e executar o workflow staging.
10. Confirmar health check e smoke tests.

### Checkpoint

Entregar a URL de staging, status do deployment e smoke tests, sem avançar para
produção. Aguardar aprovação antes da Task 11.

## Task 11 — Validar staging de ponta a ponta

### Passos

1. Abrir cadastro em staging e criar um usuário descartável.
2. Confirmar que Turnstile é exigido.
3. Receber e abrir o e-mail de confirmação via Gmail SMTP.
4. Confirmar callback e acesso ao dashboard.
5. Testar logout e redirecionamento de usuário autenticado nas páginas de Auth.
6. Solicitar recuperação, abrir o e-mail, atualizar senha e entrar novamente.
7. Confirmar rejeição da senha antiga e reutilização do link.
8. Confirmar que dados utilizados são fictícios.
9. Executar CI, workflow staging, smoke tests e revisar logs sanitizados.
10. Remover o usuário descartável ou mantê-lo identificado como conta de teste.

### Checkpoint

Entregar evidência do fluxo completo de staging e todos os defeitos encontrados.
Aguardar aprovação antes da Task 12.

## Task 12 — Provisionar Supabase produção

### Alterações externas

- Criar projeto `lucrivo-production`.
- Configurar Auth, SMTP, CAPTCHA, templates e secrets de produção.

### Passos

1. Criar o segundo projeto Free na mesma região de staging quando disponível.
2. Guardar senha e referências no gerenciador de senhas.
3. Repetir a configuração auditada de Auth de staging.
4. Manter signup habilitado somente durante a criação dos testadores.
5. Configurar SMTP Gmail e validar entrega.
6. Criar/configurar Turnstile para o hostname de produção quando conhecido.
7. Copiar templates e conferir links TokenHash.
8. Adicionar secrets de produção ao GitHub e variáveis Production à Vercel.
9. Aplicar migrations sem seed.
10. Conferir Advisors e confirmar que não há tabelas expostas sem RLS.

### Checkpoint

Entregar checklist do Supabase produção pronto, ainda sem promover a aplicação.
Aguardar aprovação antes da Task 13.

## Task 13 — Publicar e endurecer produção

### Alterações externas

- Criar Pull Request `staging` → `main`.
- Publicar Vercel Production.
- Criar testadores e desabilitar signup.

### Passos

1. Confirmar CI verde e staging aprovado.
2. Abrir PR de release e revisar diff, migrations e variáveis.
3. Mesclar em `main` somente com autorização explícita.
4. Aguardar migration e deployment de produção.
5. Obter URL principal `*.vercel.app` e finalizar Site URL, Redirect URL,
   Turnstile e `APP_URL`.
6. Fazer novo deployment após qualquer mudança de variável de build.
7. Criar e confirmar as contas dos testadores.
8. Definir as duas flags de signup como `false` na Vercel Production.
9. Desabilitar signup no Supabase produção.
10. Definir a expectativa de signup de produção como desabilitada no ambiente
    do GitHub Actions.
11. Fazer novo deployment e executar smoke test com signup bloqueado.
12. Testar login, recuperação e logout com uma conta real de teste.
13. Confirmar que nenhum Preview usa credenciais de produção.

### Checkpoint

Entregar URL de produção, revisão implantada, smoke tests e confirmação
invite-only. Aguardar aprovação antes da Task 14.

## Task 14 — Ativar backup, restauração e verificação operacional final

### Arquivos

- Modificar apenas runbooks e workflows necessários para corrigir problemas
  observados na execução real.

### Passos

1. Acionar manualmente o workflow de backup de produção.
2. Confirmar que o artifact contém somente o dump criptografado.
3. Baixar o artifact e validar descriptografia fora do runner sem expor conteúdo.
4. Restaurar em ambiente local descartável ou staging mediante confirmação
   explícita; nunca sobrescrever produção.
5. Executar CI completo, deploy checks, smoke tests e `git diff --check`.
6. Revisar Vercel logs, Supabase Auth logs, Security Advisor e Performance
   Advisor.
7. Confirmar 2FA, secrets, rate limits, signup, SMTP e URLs com o checklist.
8. Confirmar notificações do Dependabot e workflows.
9. Registrar limitações aceitas:
   - sem enforcement de branches.
   - Vercel Hobby não comercial.
   - possível pausa do Supabase Free.
   - sem PITR/backups gerenciados.
   - Gmail SMTP temporário.
   - staging compartilhado por feature previews.
10. Entregar lista final de arquivos, recursos externos e procedimento de release.

### Checkpoint

Entregar o relatório final de prontidão, itens que exigem upgrade antes de uso
comercial e resultado do teste de restauração.

## Ordem de execução

1. Quality gates.
2. Invite-only e remoção do OAuth inoperante.
3. Turnstile.
4. Health/smoke.
5. Banco local e tipos.
6. CI.
7. Workflows e runbooks.
8. Gmail/Turnstile externos.
9. Supabase staging.
10. Vercel/branch staging.
11. Validação staging.
12. Supabase produção.
13. Release produção.
14. Backup e auditoria final.

Não iniciar uma tarefa sem aprovação do checkpoint anterior. Operações externas
e criação de recursos exigem confirmação no momento da execução, mesmo que o
plano completo tenha sido aprovado.
