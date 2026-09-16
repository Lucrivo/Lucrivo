# Runbook de acesso administrativo

## Princípios

O administrador do Lucrivo é um usuário permanente do Supabase Auth. A
autorização usa exclusivamente o UUID armazenado em
`private.app_administrator`; e-mail, variáveis de ambiente e metadados
editáveis pelo usuário não concedem acesso.

A aplicação aceita no máximo um administrador. Acesso administrativo exige uma
sessão MFA `aal2`. A chave secreta do Supabase nunca deve ser enviada ao
navegador nem usada para decidir se o solicitante é admin.

## Pré-requisitos

1. A migration `create_admin_authorization_foundation` está aplicada.
2. O usuário é permanente, possui e-mail confirmado e não é anônimo.
3. O operador confirmou o UUID em Authentication > Users.
4. O usuário cadastrou e verificou um fator MFA antes da liberação das telas
   administrativas.

Nos comandos abaixo, `:admin_user_id` representa um parâmetro UUID fornecido por
uma conexão `psql` confiável. No SQL Editor do Supabase, substitua o parâmetro
por um literal UUID entre aspas simples e mantenha o cast `::uuid`.

## Conferir o usuário antes da concessão

```sql
select id, email, email_confirmed_at, is_anonymous, deleted_at
from auth.users
where id = :'admin_user_id'::uuid;
```

Prossiga apenas quando houver exatamente uma linha, `email_confirmed_at` não for
nulo, `is_anonymous` for falso e `deleted_at` for nulo.

## Conceder o primeiro acesso

```sql
begin;

insert into private.app_administrator (singleton, user_id)
values (1, :'admin_user_id'::uuid);

select singleton, user_id, created_at
from private.app_administrator;

commit;
```

O `insert` deve falhar se já existir um administrador. Nesse caso, siga o fluxo
de substituição; não apague a linha para contornar a proteção.

## Verificar pela sessão do administrador

Depois do login convencional, execute pela aplicação ou cliente autenticado:

```ts
const { data: isAdmin, error } = await supabase.rpc("current_user_is_admin");
```

O resultado deve ser `true`. Antes do desafio MFA, `private.has_admin_access()`
permanece falso; depois da verificação do segundo fator, a sessão deve conter
`aal2` e o helper passa a retornar verdadeiro nas políticas administrativas.

## Substituir o administrador

Confirme o novo usuário pelos mesmos pré-requisitos e faça a troca em uma única
transação:

```sql
begin;

update private.app_administrator
set user_id = :'new_admin_user_id'::uuid,
    created_at = statement_timestamp()
where singleton = 1
  and user_id = :'current_admin_user_id'::uuid;

select singleton, user_id, created_at
from private.app_administrator;

commit;
```

Confirme que o `update` alterou exatamente uma linha. Depois, encerre as sessões
da conta anterior pelos controles administrativos do Supabase Auth. Tokens já
emitidos podem continuar válidos até expirar, mas a consulta ao singleton nega
imediatamente a antiga identidade.

## Revogar sem substituição

Esta ação deixa o produto sem administrador e deve ser reservada para resposta
a incidente:

```sql
begin;

delete from private.app_administrator
where singleton = 1
  and user_id = :'current_admin_user_id'::uuid;

select count(*) as administrator_count
from private.app_administrator;

commit;
```

O resultado final deve ser `administrator_count = 0`. Encerre também as sessões
da conta comprometida. Uma nova concessão exige repetir a validação completa do
usuário e do MFA.

## Perda do fator MFA

Não crie um segundo administrador e não desative a checagem `aal2`. Recupere a
conta pelos controles confiáveis do Supabase Auth ou substitua temporariamente
o singleton por outra conta permanente que já tenha MFA verificado. Registre
externamente o motivo, o operador, o horário e os UUIDs envolvidos.

## Verificações após qualquer mudança

1. A tabela contém zero ou uma linha.
2. Um usuário comum recebe `false` de `current_user_is_admin()`.
3. O administrador recebe `true` do RPC.
4. Uma sessão `aal1` do administrador não passa a autorização administrativa.
5. Uma sessão `aal2` do administrador passa a autorização administrativa.
6. Nenhum segredo, JWT ou fator MFA foi registrado em logs ou tickets.
