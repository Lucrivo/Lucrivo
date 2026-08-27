# Runbook de Deploy

## Objetivo

Este runbook cobre migrations do Supabase, espera pelo deployment automático da
Vercel e smoke tests de staging e produção. Os workflows não publicam a aplicação
diretamente: a integração Git da Vercel é responsável pelo deployment.

Nenhum workflow executa seed em ambiente hospedado. Mudanças duradouras de
schema entram somente por migrations versionadas.

## Preparação do GitHub

Crie os ambientes `staging` e `production` em **Settings > Environments**. Os
nomes devem corresponder exatamente aos usados nos workflows.

Crie a branch `staging` a partir de `main` antes do primeiro release. As
atualizações do Dependabot também têm `staging` como destino e só começam depois
que a configuração estiver na branch padrão e essa branch de destino existir.

Configure em `staging`:

- secret `SUPABASE_ACCESS_TOKEN`;
- secret `STAGING_PROJECT_ID`;
- secret `STAGING_DB_PASSWORD`;
- secret `STAGING_APP_URL`, contendo o alias estável `https://*.vercel.app`, sem
  caminho adicional.

Configure em `production`:

- secret `SUPABASE_ACCESS_TOKEN`;
- secret `PRODUCTION_PROJECT_ID`;
- secret `PRODUCTION_DB_PASSWORD`;
- secret `PRODUCTION_APP_URL`, contendo a URL principal da Vercel;
- secret `BACKUP_ENCRYPTION_PASSPHRASE`, com cópia independente no gerenciador
  de senhas;
- variável `PRODUCTION_EXPECT_SIGNUP`.

Durante o bootstrap, deixe `PRODUCTION_EXPECT_SIGNUP` ausente ou use `skip`.
Depois de criar e confirmar os testadores e desabilitar o cadastro no Supabase e
na Vercel, altere a variável para `disabled`. O workflow rejeita qualquer outro
valor e passa a conferir o bloqueio de `/register`.

Não reutilize senhas de banco entre ambientes. Nunca armazene `service_role`,
secret key do Supabase, segredo SMTP ou segredo do Turnstile nesses workflows.

## Preparação da Vercel

1. Importe o repositório na Vercel.
2. Defina `main` como Production Branch.
3. Garanta que `staging` produz um Preview com alias estável.
4. Configure as variáveis de Preview/staging e Production conforme a matriz do
   design, sempre apontando para projetos Supabase diferentes.
5. Copie as URLs estáveis para os secrets `STAGING_APP_URL` e
   `PRODUCTION_APP_URL` somente depois que os primeiros deployments existirem.

O endpoint `/api/health` deve retornar os primeiros 12 caracteres de
`VERCEL_GIT_COMMIT_SHA`. O workflow aguarda até dez minutos pela revisão esperada
antes de iniciar os smoke tests.

## Release de staging

1. Abra PR de uma feature para `staging` e aguarde os jobs da CI.
2. Faça squash merge somente com `Application` e `Database` verdes.
3. O push em `staging` inicia `Deploy staging`.
4. O workflow vincula exclusivamente o projeto de staging, mostra migrations
   pendentes com `db push --dry-run` e então executa `db push`.
5. Confira que a etapa de migrations não usa `--include-seed`.
6. O workflow aguarda o alias estável da Vercel e executa smoke test exigindo
   signup habilitado.
7. Valide manualmente confirmação de e-mail e recuperação quando Auth, SMTP,
   CAPTCHA ou templates forem alterados.

O disparo manual deve selecionar a branch `staging`; qualquer outra ref é
ignorada pelo job.

## Release de produção

1. Valide a revisão no ambiente estável de staging.
2. Abra PR de `staging` para `main` e aguarde a CI.
3. Registre mudanças de schema, configuração Auth e plano de reversão.
4. Faça squash merge como decisão explícita de release.
5. O push em `main` inicia `Deploy production`, aplica somente migrations
   pendentes e aguarda a revisão da Vercel.
6. Confira o smoke test. Depois do endurecimento invite-only, ele deve mostrar a
   expectativa `disabled` e confirmar o bloqueio do cadastro.

O disparo manual deve selecionar `main`. Os workflows de deploy e backup de
produção compartilham o grupo de concorrência `production`; não executam ao
mesmo tempo.

## Falhas e rollback

- Falha no `dry-run`: não force o push. Corrija a migration ou o histórico antes
  de tentar novamente.
- Falha durante migration: não execute rollback SQL improvisado. Avalie o estado
  remoto e entregue uma migration corretiva compatível com versões anteriores.
- Falha na Vercel: não altere o banco para compensar a aplicação. Promova um
  deployment anterior ou faça um novo commit de reversão.
- Falha no smoke test: preserve o deployment para diagnóstico, consulte os logs
  da Vercel/Supabase e bloqueie a promoção seguinte.
- Drift criado pelo Dashboard: pare o release, capture e revise a diferença em
  uma migration antes de continuar.

Mudanças destrutivas usam expand/contract em releases distintas. Nunca execute
`db reset --linked` em produção.

## Rotação de credenciais

1. Gere a nova credencial no provedor sem revogar imediatamente a anterior.
2. Atualize somente o secret do ambiente correspondente no GitHub.
3. Execute manualmente o workflow na branch autorizada e confirme migrations e
   smoke tests.
4. Atualize Vercel ou Supabase quando a mesma credencial também for consumida
   por esses serviços.
5. Revogue a credencial anterior e registre data, responsável e ambiente.

Ao trocar `BACKUP_ENCRYPTION_PASSPHRASE`, preserve a senha anterior enquanto
existirem artifacts cifrados com ela. Senhas, tokens e chaves nunca devem ser
copiados para issues, PRs, logs ou este runbook.

## Limitações operacionais aceitas

Estas limitações foram aceitas para a fase atual, restrita ao proprietário e a
poucos testadores:

- O fluxo de branches depende da convenção de PRs e da revisão manual; não há
  enforcement de branch que impeça tecnicamente um push ou merge indevido.
- A Vercel usa o plano Hobby somente enquanto a aplicação permanecer pessoal e
  não comercial. Reavaliar o plano antes de monetizar ou abrir o produto ao
  público.
- Os projetos Supabase Free podem pausar por inatividade. Antes de uma
  demonstração ou janela de testes, confirmar que staging e produção estão
  ativos.
- Não há PITR nem backup gerenciado contratado. A recuperação depende do
  workflow de backup lógico, da retenção do artifact cifrado e dos drills
  descritos no runbook de backup e restauração.
- O Gmail SMTP é temporário e adequado apenas ao baixo volume atual. Antes de
  receber usuários reais, migrar para um provedor transacional com domínio
  próprio, SPF, DKIM e DMARC.
- Feature previews compartilham o projeto Supabase de staging. Dados, contas e
  mudanças compatíveis com schema feitas por um preview podem afetar os demais;
  previews não são ambientes isolados.

Revise esta seção ao mudar de plano, iniciar uso comercial, aumentar o número de
usuários, exigir menor RPO/RTO ou adotar ambientes efêmeros isolados.
