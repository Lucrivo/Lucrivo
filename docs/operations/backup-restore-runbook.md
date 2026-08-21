# Runbook de Backup e Restauração

## Escopo e limitações

O workflow `Backup production` cria um dump lógico semanal aos domingos, 03:00
UTC, e também aceita execução manual em `main`. O artifact privado fica retido
por sete dias e contém somente `lucrivo-production-backup.tar.gz.enc`.

O pacote cifrado contém:

- `roles.sql`;
- `schema.sql`;
- `data.sql` em formato `COPY`;
- schema e dados de `supabase_migrations` para preservar o histórico.

Objetos binários do Storage, Edge Functions, configuração de Auth/SMTP/CAPTCHA,
secrets e configurações do Dashboard não fazem parte desse dump. Eles exigem os
procedimentos específicos do Supabase e os arquivos versionados do repositório.
Este backup não oferece PITR, SLA ou recuperação sem perda desde a última
execução.

## Pré-requisitos

O ambiente GitHub `production` deve possuir `SUPABASE_ACCESS_TOKEN`,
`PRODUCTION_PROJECT_ID`, `PRODUCTION_DB_PASSWORD` e
`BACKUP_ENCRYPTION_PASSPHRASE`. A passphrase deve ser longa, exclusiva, gerada
aleatoriamente e ter cópia independente no gerenciador de senhas.

O workflow usa `supabase db dump` da versão fixada no lockfile. Os arquivos SQL
permanecem apenas no diretório temporário do runner, são cifrados com
AES-256-CBC, PBKDF2, 200.000 iterações e SHA-256, e são removidos mesmo quando
uma etapa falha. O arquivo cifrado também é removido do runner depois do upload.

## Executar e verificar um backup

1. Abra **Actions > Backup production > Run workflow** e selecione `main`.
2. Confirme que as etapas de roles, schema, data e histórico terminaram.
3. Confirme `Verify encrypted archive` e `Upload encrypted backup`.
4. Confira que o artifact contém somente o arquivo com extensão `.enc`.
5. Registre o run, a data e o digest informado pela action de upload.

Nunca faça upload de SQL claro, archive `.tar.gz` claro ou passphrase como
artifact.

## Descriptografar para teste

Faça esse procedimento somente em uma máquina confiável, com disco cifrado e
fora de diretórios sincronizados. Não informe a passphrase na linha de comando.

```bash
read -rsp "Backup passphrase: " BACKUP_ENCRYPTION_PASSPHRASE
export BACKUP_ENCRYPTION_PASSPHRASE
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in lucrivo-production-backup.tar.gz.enc \
  -out lucrivo-production-backup.tar.gz
unset BACKUP_ENCRYPTION_PASSPHRASE
```

Extraia em um diretório temporário dedicado e confira se os cinco arquivos SQL
esperados existem. Remova com segurança os arquivos claros ao terminar o teste.

## Restauração controlada

Nunca restaure automaticamente e nunca teste restauração diretamente em
produção. Crie um projeto Supabase temporário ou use staging somente após
aprovação explícita e confirmação de que seus dados podem ser substituídos.

1. Baixe e confira o artifact/digest do run escolhido.
2. Descriptografe e extraia o pacote em máquina confiável.
3. Crie ou selecione o projeto de destino e habilite previamente extensões e
   recursos usados pela origem.
4. Obtenha a connection string do Session Pooler e armazene-a em variável de
   ambiente; nunca a cole no histórico do shell.
5. Revise `roles.sql` e `schema.sql` para incompatibilidades de ownership ou
   roles gerenciadas antes de executar qualquer comando.
6. Restaure roles, schema e dados em uma única transação com parada no primeiro
   erro, seguindo a documentação vigente do Supabase:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$RESTORE_DATABASE_URL"
```

7. Restaure `history-schema.sql` e `history-data.sql` somente depois de conferir
   que correspondem às migrations versionadas do commit do backup.
8. Reative publicações Realtime necessárias e refaça configurações externas de
   Auth, SMTP, CAPTCHA, templates, Edge Functions e objetos do Storage.
9. Execute advisors, smoke tests e validações funcionais sem usuários reais.
10. Registre duração, erros, correções manuais e o ponto de recuperação obtido.

Uma restauração considerada válida precisa terminar sem erros, apresentar o
histórico de migrations esperado e passar os smoke tests. A decisão de restaurar
produção exige um plano separado de indisponibilidade, perda de dados e
comunicação; este workflow nunca toma essa decisão.
