# Guia de Operação, Deploy e Desenvolvimento

> Documento de referência para desenvolvimento, staging, produção, CI/CD, autenticação, segurança, backups e fluxo de releases do projeto **Lucrivo**.

## 1. Objetivo

Este documento registra o estado atual da infraestrutura do Lucrivo e define o fluxo operacional que deve ser seguido por qualquer pessoa que trabalhe no projeto.

O objetivo é garantir que novas features, mudanças no banco de dados, alterações de autenticação e releases sejam realizadas de forma previsível, auditável e segura.

Sempre que a infraestrutura, o processo de deploy ou alguma regra operacional mudar, este documento e os runbooks relacionados devem ser atualizados no mesmo PR.

---

## 2. Estado atual da plataforma

A preparação de produção foi concluída e validada.

A aplicação possui ambientes separados de **staging** e **produção**, com infraestrutura, configurações e credenciais independentes sempre que aplicável.

### Produção

- Aplicação: https://lucrivo-sigma.vercel.app
- Branch de referência: `main`
- Supabase dedicado para produção
- GitHub Environment: `production`
- Cloudflare Turnstile dedicado para produção
- Signup público bloqueado
- Deploy automatizado via GitHub Actions
- Smoke tests executados após o deploy

### Staging

- Aplicação: https://lucrivo-git-staging-lucrivo-team.vercel.app
- Branch de referência: `staging`
- Supabase dedicado para staging
- GitHub Environment: `staging`
- Cloudflare Turnstile dedicado para staging
- Signup habilitado
- Deploy automatizado via GitHub Actions
- Smoke tests executados após o deploy

### Serviços compartilhados ou temporários

- Gmail SMTP temporário
- Conta protegida por 2FA
- Configurações de autenticação mantidas separadamente por ambiente sempre que necessário

---

## 3. Princípios operacionais

As seguintes regras devem ser consideradas obrigatórias.

### 3.1. Staging é o ambiente de validação

Toda feature deve chegar primeiro em `staging`.

Não devem ser feitas alterações funcionais diretamente em `main`.

### 3.2. Produção só recebe código previamente validado

O conteúdo promovido para `main` deve ter sido:

1. revisado em PR;
2. aprovado no CI;
3. implantado em staging;
4. validado funcionalmente;
5. aprovado para release.

### 3.3. Banco de dados deve ser versionado

Toda mudança estrutural no banco deve ser representada por uma migration versionada no repositório.

Evite alterações manuais em produção que não possam ser reproduzidas por código.

### 3.4. Configuração externa também faz parte da release

Mudanças em itens como:

- Supabase Auth;
- SMTP;
- Cloudflare Turnstile;
- templates de e-mail;
- secrets;
- variáveis de ambiente;
- GitHub Environments;
- Vercel;
- políticas ou configurações do banco;

devem ser tratadas como parte da implantação e revisadas antes da promoção para produção.

### 3.5. Produção é invite-only

O signup público deve permanecer bloqueado em produção.

O controle existe tanto na configuração do ambiente quanto no servidor e não deve ser removido sem uma decisão explícita de produto e segurança.

---

## 4. Estrutura de branches

O fluxo principal utiliza três tipos de branch.

### `main`

Representa o estado atual de produção.

Código em `main` deve ser considerado implantável e aprovado para produção.

### `staging`

Representa o próximo estado candidato a produção.

Todas as features aprovadas devem passar por esta branch antes de chegar em `main`.

### Branches de feature

Toda nova feature, correção ou alteração relevante deve partir de `staging`.

Exemplos:

```text
feature/invite-system
feature/dashboard-reports
fix/password-recovery
chore/update-dependencies
```

Fluxo esperado:

```text
feature/* -> staging -> main
```

---

## 5. Fluxo padrão de desenvolvimento de uma feature

Para cada nova feature, seguir o processo abaixo.

### 5.1. Criar a branch

Atualizar `staging` localmente e criar uma nova branch a partir dela.

```bash
git checkout staging
git pull origin staging
git checkout -b feature/nome-da-feature
```

### 5.2. Definir a feature antes da implementação

Antes de alterar o código, deixar claros:

- objetivo;
- comportamento esperado;
- regras de negócio;
- alterações de dados;
- permissões;
- estados de erro;
- critérios de aceite;
- impacto em staging e produção.

### 5.3. Implementar

A implementação deve incluir, quando aplicável:

- código da feature;
- validação de entrada;
- tratamento de erro;
- testes;
- migrations;
- atualização de tipos;
- documentação;
- observabilidade ou logs necessários.

### 5.4. Banco de dados

Se a feature alterar o banco:

1. criar uma migration;
2. garantir que a migration seja reproduzível;
3. revisar permissões, RLS e funções;
4. atualizar os tipos do banco;
5. testar a migration em staging antes de produção.

Nunca depender apenas de uma alteração manual feita pelo dashboard do Supabase.

### 5.5. Abrir PR para `staging`

O PR deve explicar:

- o que foi alterado;
- por que foi alterado;
- como validar;
- se há migration;
- se há mudança de variável de ambiente;
- se há alteração externa no Supabase, Vercel, GitHub ou Cloudflare;
- riscos conhecidos;
- eventual estratégia de rollback.

### 5.6. Aguardar o CI

Os jobs relevantes devem passar antes do merge.

Atualmente, isso inclui os jobs:

- `Application`
- `Database`

Não fazer merge com checks obrigatórios falhando.

### 5.7. Fazer squash merge em `staging`

O padrão adotado é **squash merge** para PRs de feature.

Isso mantém o histórico de `staging` mais limpo e representa cada PR como uma unidade lógica.

### 5.8. Validar staging

Após o merge:

1. o workflow aplica migrations de staging;
2. aguarda o deployment da Vercel;
3. executa os smoke tests;
4. a aplicação deve ser validada no alias estável de staging.

Além dos testes automatizados, executar validação funcional sempre que a feature tiver comportamento de usuário relevante.

---

## 6. Fluxo de release para produção

Quando `staging` estiver em estado aprovado para release:

### 6.1. Abrir PR de `staging` para `main`

Este PR representa uma release, não apenas uma feature isolada.

Antes do merge, revisar:

- conteúdo completo da release;
- migrations pendentes;
- compatibilidade das migrations com produção;
- variáveis de ambiente;
- configurações externas;
- alterações de autenticação;
- SMTP;
- CAPTCHA;
- templates;
- estratégia de rollback;
- possíveis impactos em dados existentes.

### 6.2. Aprovação explícita

O merge em `main` só deve ocorrer quando a release estiver explicitamente aprovada.

### 6.3. Fazer squash merge

Após a aprovação, realizar squash merge do PR para `main`.

### 6.4. Deploy automatizado

O workflow de produção:

1. aplica migrations;
2. aguarda a implantação da Vercel;
3. executa verificações da aplicação;
4. executa smoke tests;
5. verifica que o signup de produção continua bloqueado.

### 6.5. Validação pós-deploy

Depois do deploy, validar:

- `/api/health`;
- aplicação pública;
- principais fluxos afetados pela release;
- logs da Vercel;
- logs do Supabase;
- erros de autenticação;
- falhas de banco;
- smoke tests.

Quando houver mudança em Auth, SMTP, CAPTCHA ou templates de e-mail, validar manualmente também:

- login;
- confirmação de e-mail;
- recuperação de senha.

---

## 7. CI/CD e automações

Os principais arquivos de automação do projeto são:

```text
.github/workflows/ci.yml
.github/workflows/deploy-staging.yml
.github/workflows/deploy-production.yml
.github/workflows/backup-production.yml
.github/dependabot.yml
scripts/smoke-test.mjs
scripts/generate-database-types.mjs
```

### CI

Arquivo:

```text
.github/workflows/ci.yml
```

Responsável por validar o código antes do merge.

Os checks de aplicação e banco devem estar verdes antes de uma alteração avançar no fluxo.

### Deploy de staging

Arquivo:

```text
.github/workflows/deploy-staging.yml
```

Responsável pela implantação automática do conteúdo aprovado em `staging`.

O processo inclui migrations, espera da Vercel e smoke tests.

### Deploy de produção

Arquivo:

```text
.github/workflows/deploy-production.yml
```

Responsável pela implantação de `main` em produção.

Além das validações normais, deve preservar a restrição de signup de produção.

### Backup de produção

Arquivo:

```text
.github/workflows/backup-production.yml
```

Responsável pela geração do backup de produção.

Os procedimentos detalhados de restauração devem ser consultados no runbook específico.

### Dependabot

Arquivo:

```text
.github/dependabot.yml
```

Responsável por auxiliar na manutenção automatizada de dependências.

Atualizações de dependências continuam sujeitas ao mesmo fluxo de CI, staging e produção.

---

## 8. Smoke tests

Arquivo:

```text
scripts/smoke-test.mjs
```

Os smoke tests servem como verificação rápida de que o ambiente implantado está operacional.

Eles não substituem testes unitários, integração, E2E ou validação funcional.

Uma release não deve ser considerada saudável apenas porque o deployment terminou com sucesso.

---

## 9. Health check

A aplicação expõe:

```text
/api/health
```

Esse endpoint deve permanecer simples e confiável para validar a disponibilidade básica da aplicação.

Alterações que possam comprometer o health check devem ser tratadas com cuidado, pois workflows e verificações operacionais podem depender dele.

---

## 10. Autenticação

A autenticação possui proteções adicionais e regras específicas por ambiente.

### CAPTCHA

Cloudflare Turnstile está integrado aos fluxos de:

- login;
- cadastro;
- recuperação de senha.

As credenciais são separadas por ambiente.

### Signup

#### Staging

Signup habilitado para facilitar testes.

#### Produção

Signup público bloqueado.

Além da configuração do provedor, existe controle server-side para preservar o comportamento invite-only.

### SMTP

Atualmente é utilizado Gmail SMTP temporário com 2FA.

Ao substituir o SMTP temporário por um provedor definitivo, revisar:

- credenciais;
- limites de envio;
- remetente;
- domínio;
- SPF;
- DKIM;
- DMARC;
- confirmação de e-mail;
- recuperação de senha;
- templates.

---

## 11. Segurança

A preparação de produção incluiu medidas específicas de segurança.

Entre elas:

- CAPTCHA nos fluxos sensíveis de autenticação;
- signup de produção bloqueado;
- controle server-side para signup invite-only;
- migration restringindo função `SECURITY DEFINER`;
- revisão do Supabase Security Advisor;
- separação de ambientes;
- secrets mantidos nos ambientes apropriados;
- backup cifrado.

Ao criar novas funções SQL com `SECURITY DEFINER`, revisar cuidadosamente:

- `search_path`;
- permissões de execução;
- ownership;
- exposição por API;
- necessidade real do uso de privilégios elevados.

---

## 12. Performance

Na validação final da preparação de produção, o Supabase Performance Advisor não apresentou avisos.

Isso representa apenas o estado naquele momento.

Novas features podem introduzir:

- consultas lentas;
- scans desnecessários;
- índices ausentes;
- N+1 queries;
- sobrecarga de funções;
- crescimento excessivo de dados.

Mudanças relevantes no modelo de dados devem considerar performance como parte da revisão.

---

## 13. Backup e restauração

A estratégia de backup de produção já foi validada.

Evidência da validação inicial:

```text
GitHub Actions run: 33027690139
```

Foi validada uma restauração descartável contendo:

- usuário;
- identidade;
- histórico de migrations.

A restauração nunca deve ser improvisada diretamente em produção.

Consultar sempre:

```text
docs/operations/backup-restore-runbook.md
```

antes de qualquer operação de recuperação.

---

## 14. Runbooks operacionais

Os procedimentos detalhados estão documentados nos seguintes arquivos:

### Deploy e rollback

```text
docs/operations/deployment-runbook.md
```

Usar para:

- deploy;
- promoção de release;
- diagnóstico de falha de implantação;
- rollback.

### Backup e restauração

```text
docs/operations/backup-restore-runbook.md
```

Usar para:

- geração de backup;
- validação;
- recuperação;
- restauração descartável;
- incidentes relacionados a dados.

### Operação do Auth

```text
docs/operations/auth-runbook.md
```

Usar para:

- signup;
- login;
- confirmação;
- recuperação de senha;
- SMTP;
- CAPTCHA;
- alterações operacionais do Supabase Auth.

> Os runbooks devem permanecer versionados e sincronizados com a infraestrutura real.

---

## 15. Checklist para PR de feature

Antes de solicitar review:

- [ ] A branch foi criada a partir de `staging`.
- [ ] O comportamento esperado está definido.
- [ ] Os critérios de aceite estão atendidos.
- [ ] Testes relevantes foram adicionados ou atualizados.
- [ ] O código não contém secrets.
- [ ] Variáveis de ambiente novas estão documentadas.
- [ ] Mudanças no banco possuem migration.
- [ ] RLS e permissões foram revisadas quando aplicável.
- [ ] Tipos do banco foram atualizados quando necessário.
- [ ] Configurações externas necessárias estão descritas no PR.
- [ ] O impacto em Auth, SMTP e CAPTCHA foi avaliado.
- [ ] O rollback foi considerado para mudanças de risco.
- [ ] Prettier passa.
- [ ] `git diff --check` passa.

---

## 16. Checklist para merge em `staging`

- [ ] Jobs `Application` e `Database` passaram.
- [ ] Review concluído.
- [ ] Não existem mudanças externas esquecidas.
- [ ] Migrations foram revisadas.
- [ ] Squash merge é apropriado para o PR.
- [ ] Staging está apto a receber a alteração.

Depois do merge:

- [ ] Deploy de staging passou.
- [ ] Migrations foram aplicadas.
- [ ] Vercel concluiu o deployment.
- [ ] Smoke tests passaram.
- [ ] Feature foi validada funcionalmente no alias estável de staging.

---

## 17. Checklist de release para produção

Antes do merge de `staging` para `main`:

- [ ] Todas as features da release foram validadas em staging.
- [ ] CI está verde.
- [ ] Migrations foram revisadas.
- [ ] Ordem e compatibilidade das migrations foram avaliadas.
- [ ] Variáveis de produção estão configuradas.
- [ ] Secrets necessários existem no GitHub Environment `production`.
- [ ] Configurações da Vercel foram revisadas.
- [ ] Configurações do Supabase foram revisadas.
- [ ] Configurações do Turnstile foram revisadas.
- [ ] Mudanças de SMTP foram revisadas.
- [ ] Mudanças de templates foram revisadas.
- [ ] Estratégia de rollback está conhecida.
- [ ] Aprovação explícita para produção foi dada.

Depois do merge:

- [ ] Workflow de produção passou.
- [ ] Migrations foram aplicadas.
- [ ] Deployment da Vercel concluiu.
- [ ] `/api/health` responde corretamente.
- [ ] Smoke tests passaram.
- [ ] Signup de produção continua bloqueado.
- [ ] Fluxos impactados foram validados.
- [ ] Logs da Vercel estão limpos.
- [ ] Logs do Supabase estão limpos.
- [ ] Auth foi testado manualmente quando aplicável.

---

## 18. Mudanças que exigem atenção especial

Algumas alterações precisam de validação adicional mesmo quando o CI passa.

### Mudança no Auth

Validar manualmente:

- login;
- cadastro em staging;
- bloqueio de signup em produção;
- confirmação de e-mail;
- recuperação de senha;
- CAPTCHA.

### Mudança de SMTP

Validar:

- entrega de e-mail;
- spam;
- confirmação;
- recuperação;
- limites do provedor;
- remetente.

### Mudança no CAPTCHA

Validar:

- chave correta por ambiente;
- domínio autorizado;
- comportamento do frontend;
- validação server-side;
- login;
- cadastro;
- recuperação.

### Mudança no banco

Validar:

- migration;
- compatibilidade com dados existentes;
- rollback ou estratégia de correção;
- RLS;
- grants;
- funções;
- tipos gerados;
- performance.

### Mudança em secrets ou variáveis

Confirmar a configuração separadamente em:

- staging;
- produção;
- GitHub Environments;
- Vercel;
- Supabase;
- qualquer serviço externo envolvido.

Nunca assumir que uma variável existente em staging também existe em produção.

---

## 19. Incidentes e rollback

Se uma release de produção apresentar problemas:

1. determinar se o problema está no código, banco ou configuração externa;
2. evitar mudanças manuais não documentadas;
3. consultar o runbook de deploy e rollback;
4. preservar evidências e logs;
5. avaliar se rollback de código é suficiente;
6. tratar migrations com cuidado, pois rollback de código não necessariamente reverte o banco;
7. utilizar o runbook de backup e restauração se houver risco ou perda de dados;
8. documentar o incidente e a correção.

Referência principal:

```text
docs/operations/deployment-runbook.md
```

---

## 20. Evidências da preparação inicial de produção

Na conclusão da preparação inicial:

- CI passou;
- workflows de deploy passaram;
- smoke tests de staging passaram;
- smoke tests de produção passaram;
- fluxos reais de autenticação passaram;
- logs da Vercel estavam limpos;
- logs do Supabase estavam limpos;
- Supabase Security Advisor estava sem avisos;
- Supabase Performance Advisor estava sem avisos;
- backup cifrado foi criado;
- restauração descartável foi validada;
- usuário, identidade e histórico de migrations foram verificados na restauração;
- Prettier passou;
- `git diff --check` passou;
- limitações dos planos gratuitos foram registradas.

Essas evidências representam um **baseline operacional**, não uma garantia permanente.

Após mudanças futuras, os itens relevantes devem ser revalidados.

---

## 21. Limitações de plano

O projeto utiliza serviços que podem possuir limitações nos planos gratuitos.

Esses limites devem ser considerados durante desenvolvimento e operação, principalmente em relação a:

- e-mails;
- banco de dados;
- execução de workflows;
- deployments;
- rate limits;
- logs;
- retenção;
- backups;
- quotas.

Se uma limitação começar a impactar confiabilidade ou operação, a necessidade de upgrade deve ser avaliada antes de criar soluções alternativas frágeis.

---

## 22. Critério de pronto para uma feature

Uma feature pode ser considerada concluída quando:

1. o comportamento e os critérios de aceite foram atendidos;
2. os testes necessários passaram;
3. migrations estão versionadas;
4. documentação foi atualizada;
5. CI passou;
6. a alteração foi implantada em staging;
7. staging foi validado;
8. a feature está pronta para integrar uma release futura.

Estar em staging não significa automaticamente estar aprovado para produção.

---

## 23. Critério de pronto para uma release

Uma release pode ser considerada concluída quando:

1. o conteúdo de `staging` foi aprovado;
2. o PR para `main` foi revisado;
3. migrations e configurações externas foram revisadas;
4. o merge foi explicitamente autorizado;
5. o workflow de produção passou;
6. smoke tests passaram;
7. validação funcional necessária foi concluída;
8. logs relevantes foram verificados;
9. signup de produção permanece no estado esperado;
10. não existem incidentes conhecidos bloqueando a operação.

---

## 24. Regra para atualização desta documentação

Atualize este documento quando houver mudança em:

- estratégia de branches;
- fluxo de PR;
- CI;
- deploy;
- ambientes;
- Vercel;
- Supabase;
- Auth;
- SMTP;
- CAPTCHA;
- banco de dados;
- backups;
- rollback;
- secrets;
- GitHub Environments;
- critérios de release.

Quando uma mudança exigir um procedimento detalhado, prefira atualizar também o runbook específico em vez de concentrar todos os detalhes neste arquivo.

---

## 25. Resumo do fluxo

```text
staging atualizado
      |
      v
branch da feature
      |
      v
implementação + testes + migrations
      |
      v
PR -> staging
      |
      v
CI: Application + Database
      |
      v
squash merge
      |
      v
deploy automático em staging
      |
      v
migrations + Vercel + smoke tests
      |
      v
validação funcional
      |
      v
PR staging -> main
      |
      v
revisão de release + aprovação explícita
      |
      v
squash merge
      |
      v
deploy automático em produção
      |
      v
migrations + Vercel + smoke tests
      |
      v
verificação do signup + validação pós-deploy
```

---

## 26. Referências rápidas

| Assunto | Referência |
|---|---|
| Produção | https://lucrivo-sigma.vercel.app |
| Staging | https://lucrivo-git-staging-lucrivo-team.vercel.app |
| CI | `.github/workflows/ci.yml` |
| Deploy staging | `.github/workflows/deploy-staging.yml` |
| Deploy produção | `.github/workflows/deploy-production.yml` |
| Backup produção | `.github/workflows/backup-production.yml` |
| Dependabot | `.github/dependabot.yml` |
| Smoke tests | `scripts/smoke-test.mjs` |
| Tipos do banco | `scripts/generate-database-types.mjs` |
| Health check | `/api/health` |
| Deploy e rollback | `docs/operations/deployment-runbook.md` |
| Backup e restauração | `docs/operations/backup-restore-runbook.md` |
| Operação do Auth | `docs/operations/auth-runbook.md` |

---

## 27. Regra final

O fluxo normal do projeto é:

> **feature -> staging -> validação -> release -> main -> produção**

Qualquer exceção deve ser deliberada, justificada e documentada.

Não fazer mudanças diretamente em produção apenas porque são pequenas. A previsibilidade do processo é parte da segurança e da confiabilidade do sistema.
