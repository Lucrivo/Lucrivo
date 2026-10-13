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
4. TOTP está habilitado para enrollment e verification no ambiente.

O primeiro fator não precisa existir antes da atribuição do UUID. Depois da
atribuição, a própria entrada administrativa encaminha a conta ao setup TOTP e
só libera o shell após a verificação `aal2`.

## Configurar o ambiente de homologação

1. Em Supabase Dashboard, habilite enrollment e verification de App
   Authenticator/TOTP nas configurações de MFA. Mantenha Phone MFA desabilitado.
2. Em Authentication > Email Templates > Invite user, configure um link
   TokenHash server-side equivalente a:

   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite"
   >
     Aceitar convite
   </a>
   ```

3. Confirme que o Site URL aponta para a homologação. Convites enviados antes
   da troca do template, especialmente os que usam o fluxo padrão em fragmento,
   devem ser reenviados.
4. Convide a conta permanente em Authentication > Users, conclua a criação da
   senha, confira seu UUID e execute a atribuição do singleton descrita abaixo.
5. Valide a sequência completa: login → `/auth/continue` → `/admin` → setup ou
   challenge TOTP → shell protegido.

Mantenha o procedimento de recuperação do autenticador fora da aplicação. Em
caso de perda, não desabilite `aal2`, não crie uma interface emergencial de
promoção e siga a seção de perda do fator deste runbook.

Nunca copie QR payloads, chaves TOTP, códigos temporários, JWTs ou cookies para
logs, tickets, capturas de tela ou documentos operacionais.

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

## Gestão de usuários

A área `/admin/users` exige a mesma sessão MFA `aal2`. A tela não concede
permissões pelo e-mail: a autorização é repetida em cada RPC no banco. O
administrador atribuído ao singleton não aparece na lista nem pode ser alvo de
ações. Busque um usuário pelo e-mail e confira o UUID antes de confirmar uma
alteração, especialmente quando houver e-mails semelhantes.

Toda alteração exige um motivo com até 500 caracteres e registra um evento
imutável com operador, horário e estado anterior/posterior. O histórico só começa
com a implantação desta funcionalidade; cadastro e último login são fatos da
conta, não um histórico retroativo de sessões. Se a tela informar conflito de
versão, recarregue o cadastro, revise o estado atual e confirme novamente.

### Semântica e recuperação

- **Cortesia:** libera a elegibilidade de relatórios até a data indicada, sem
  criar contrato, cobrança ou receita. Uma assinatura paga vigente continua
  sendo a fonte principal de acesso; encerrar cortesia não a cancela.
- **Bloqueio:** suspende o uso da aplicação e a leitura de dados mesmo com JWT
  já emitido. Desbloquear restaura a elegibilidade normal, sem conceder acesso
  pago. O banco recusa bloquear quem possui um intervalo pago vigente.
- **Exclusão lógica:** suspende a conta e a retira da lista padrão, mas mantém
  identidade Auth, diagnósticos, contratos, pagamentos e auditoria. Restaurar
  preserva o estado de bloqueio que existia antes da exclusão. **Não é
  apagamento de dados pessoais**, não cancela assinaturas e não substitui um
  processo jurídico de eliminação. O banco recusa excluir quem ainda tem acesso
  pago vigente.

Se houver conflito pago, encaminhe o caso ao fluxo financeiro competente antes
de repetir a ação. Esta interface não cancela cobrança, não emite reembolso e
não chama o Asaas. Se uma confirmação de pagamento tentar ativar um contrato de
conta suspensa, a transação é recusada para impedir acesso pago com a conta
indisponível. Investigue o evento de cobrança e resolva manualmente o estado da
conta ou a situação financeira; não remova a proteção do trigger como atalho.

A busca por substring de e-mail usa a tabela gerenciada `auth.users`. A role
normal de migrações não possui essa tabela, portanto não instala índice trigram
diretamente nela. Monitore latência da busca à medida que a base crescer e
planeje uma projeção administrada separada antes de volumes altos; não altere
propriedade ou permissões do esquema Auth apenas para otimizar a tela.
