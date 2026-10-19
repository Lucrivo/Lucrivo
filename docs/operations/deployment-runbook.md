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

## Ativação da oferta de lançamento

`LAUNCH_OFFER_START_AT` é uma variável server-only. Ela aceita somente um
instante ISO 8601 com offset explícito (`Z` ou `±HH:MM`) e nunca usa o prefixo
`NEXT_PUBLIC_`. A campanha começa no instante configurado: até o dia 15, usa
preço de lançamento com bônus; do dia 15 ao dia 30, mantém o preço de lançamento
sem bônus; no dia 30 exato, volta ao catálogo padrão. Todos os intervalos
incluem o início e excluem o fim.

Siga esta ordem em staging e, depois de homologada, em produção:

1. Confirme com o Asaas que a tokenização de assinatura no cartão está ativa em
   produção. Aplique primeiro a migration aditiva dos três catálogos e confirme
   sua conclusão; só então publique a aplicação, inicialmente com
   `LAUNCH_OFFER_START_AT` ausente. Confirme catálogo padrão — mensal de R$ 49,90
   e semestral de R$ 239,40 — e rejeição dos IDs promocionais no Checkout.
2. Escolha o instante de início no fuso de São Paulo e converta a decisão para
   uma string com offset explícito, por exemplo
   `2026-10-20T09:00:00-03:00`. Registre a decisão de negócio e o responsável,
   nunca um secret.
3. Cadastre `LAUNCH_OFFER_START_AT` na Vercel e faça o deploy antes desse
   instante. Antes do início, confirme estado `scheduled`, catálogo padrão e
   ausência de contador.
4. No instante exato do início, confirme catálogo `launch`, contador com prazo
   absoluto, R$ 39,90 somente no primeiro pagamento mensal, renovação por
   R$ 49,90 depois de dois meses e bônus de acesso. Um milissegundo antes ainda
   deve ser padrão.
5. No dia 15 exato, confirme catálogo `launch_price`, ausência de bônus,
   R$ 39,90 somente no primeiro pagamento mensal e primeira renovação um mês
   depois por R$ 49,90. Um Checkout `launch` ainda válido preserva seu snapshot
   somente pelos 60 minutos persistidos.
6. No dia 30 exato, confirme retorno ao catálogo padrão e rejeição de novos
   Checkouts promocionais. Um Checkout `launch_price` criado um milissegundo
   antes preserva seu snapshot somente pelos 60 minutos persistidos.
7. Repita no sandbox os ajustes mensais de `launch` e `launch_price`, verificando
   data, ciclo e valor de R$ 49,90, e monitore a fila de reconciliação após o
   deploy.
8. Em uma validação isolada, use um valor vazio, sem offset ou inválido e
   confirme que ofertas pagas e Checkout ficam indisponíveis, sem preço de
   fallback.

O término normal ocorre pelo relógio; não remova a variável ao fim da campanha.
Remova `LAUNCH_OFFER_START_AT` apenas para desativação emergencial e registre o
incidente. A remoção seleciona o catálogo padrão imediatamente, mas não altera
contratos ou Checkouts já persistidos.

## Publicação da biblioteca Bônus

Os binários não fazem parte do Git nem exigem novo deploy quando mantêm as
chaves canônicas. Na primeira publicação em staging e depois em produção:

1. Confirme que a migration criou o bucket privado `bonus-materials`.
2. Envie os arquivos pelo Dashboard do Supabase ou pela Storage API exatamente
   para `ebook/ebook.pdf`, `guide/guide.pdf` e
   `spreadsheet/cash-flow.xlsx`. Nunca insira linhas manualmente em
   `storage.objects`.
3. Valide `application/pdf` nos dois PDFs,
   `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` na
   planilha e o limite de 25 MiB por objeto.
4. Em staging, teste contas gratuita, somente cortesia, paga ativa, paga
   expirada, reembolsada integralmente e com chargeback. A conta paga expirada
   mantém guia e planilha; reembolso integral e chargeback bloqueiam esses dois
   itens quando não há outra concessão viva.
5. Se os materiais forem enviados depois da aplicação, mantenha essas mesmas
   chaves e confirme que se tornam disponíveis sem novo deploy.

Enquanto um objeto ainda não tiver sido enviado, a página deve continuar
saudável e apresentar **Material em preparação** ao usuário autorizado.

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
