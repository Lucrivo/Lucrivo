# Termos de uso e política de privacidade

**Data:** 2026-10-12

**Status:** Aprovado

**Documentos relacionados:**

- `docs/superpowers/specs/2026-10-09-client-onboarding-and-segmentation-design.md`
- `docs/superpowers/specs/2026-09-16-admin-user-management-design.md`
- `docs/superpowers/specs/2026-09-29-report-ai-assistant-design.md`
- `docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md`

## 1. Objetivo

Publicar os termos de uso e a política de privacidade, registrar o aceite da
versão vigente e impedir que uma conta de cliente use o produto antes desse
aceite.

O fornecedor, nesta versão, é uma pessoa física. Nome completo, CPF e endereço
são dados do operador: a implementação os recebe e os coloca numa única fonte
lida pelas duas páginas. Este spec não inventa esses três valores. O e-mail de
contato já existente é `atendimento@lucrivo.com.br`.

Quando existir CNPJ, a versão do texto muda e o aceite é pedido de novo. Não
há banner de cookies, ferramenta de apagamento de dados, aceite de
administrador nem revisão jurídica nesta etapa.

## 2. Decisões de produto

### 2.1 Dois documentos, uma versão

Os textos ficam em português, em `/terms` e `/privacy`. A versão vigente é a
constante `terms-privacy-v1`, compartilhada pelos dois. Subir a versão não
exige migração: a consulta recebe a constante da aplicação.

O cadastro usa um único checkbox, desmarcado:

> Li e aceito os Termos de Uso e a Política de Privacidade.

As duas expressões são links para `/terms` e `/privacy`. Recusar não é uma
opção de quem quer criar a conta. O consentimento de WhatsApp permanece
opcional, separado e no onboarding.

### 2.2 Quem aceita

Só a conta de cliente aceita. Administrador entra em `/admin` sem passar pela
trava. Visitante lê as páginas públicas sem aceite.

Quem já tem conta e ainda não aceitou a versão vigente vê `/accept-terms` uma
vez. Pode sair da conta. Conta, diagnóstico e assinatura permanecem. Onboarding,
dashboard, cobrança e as demais operações do cliente só abrem depois do aceite.
Login não pede o checkbox de novo.

### 2.3 O que os textos afirmam

Os termos identificam o fornecedor com nome, CPF, endereço e o e-mail de
atendimento. O Lucrivo calcula e explica a partir dos números informados. O
resultado não substitui contador, advogado nem consultor, e a decisão de preço
continua com a pessoa. A conversa com a inteligência artificial segue a mesma
regra e pode errar. A assinatura é mensal ou semestral, no cartão ou no Pix. A
garantia é de 7 dias, com devolução do valor, como a landing já anuncia. O
cancelamento mantém o acesso até o fim do período já pago.

A política usa o mesmo fornecedor. Descreve e-mail, senha sob o serviço de
autenticação, nome, WhatsApp, segmento, números do diagnóstico e dados de
cobrança. A base do serviço é o contrato. O único consentimento opcional é o
WhatsApp de marketing, que a pessoa liga e desliga em Minha conta. Quem recebe
dados:

- Supabase, para conta, banco e e-mail de autenticação;
- Asaas, para cobrança;
- OpenAI, para os fatos do relatório e a pergunta, sem o cadastro inteiro;
- Cloudflare, na verificação de segurança do cadastro, do login e da recuperação
  de senha.

Os cookies citados são os de sessão, o filtro do dashboard do cliente e o
estado da sidebar. Não há cookie de publicidade. O perfil do negócio se corrige
em Minha conta. O e-mail de acesso não se edita ali. Pedido de acesso,
portabilidade ou exclusão vai para `atendimento@lucrivo.com.br`. A exclusão
lógica do administrador só tira o acesso. Dados de cobrança permanecem pelo
tempo da garantia e da obrigação fiscal. O apagamento do restante não existe
nesta etapa, e a política não afirma que existe.

### 2.4 Onde os links aparecem

- rodapé da landing;
- checkbox do cadastro;
- `/accept-terms`;
- Minha conta, só para reler, sem novo aceite.

## 3. Experiência

### 3.1 Cadastro

O checkbox começa desmarcado. Sem ele, a ação recusa o envio antes do
`signUp` e o formulário mostra o erro. Com ele, o cadastro segue o fluxo
atual: confirmação de e-mail ou redirecionamento para `/auth/continue`.

### 3.2 Trava

`/accept-terms` fica fora dos layouts de onboarding, da área logada e do
administrador. A tela tem o mesmo texto do checkbox, os dois links, um botão
para aceitar e o botão de sair da conta que já existe. Não mostra o restante
do produto.

- sem sessão, vai para `/login`;
- administrador vai para `/admin`;
- cliente que já aceitou a versão vigente vai para `/auth/continue`;
- cliente sem aceite permanece na tela;
- falha na consulta esconde o botão de aceitar e oferece tentar de novo e sair.

Depois de aceitar, a ação redireciona para `/auth/continue`.

### 3.3 Destino autenticado

`resolveAuthenticatedHome` passa a resolver, nesta ordem:

1. sem sessão, `/login`;
2. conta inelegível, `/account-unavailable`;
3. administrador, `/admin`;
4. cliente sem aceite da versão vigente, ou falha nessa consulta,
   `/accept-terms`;
5. falha na consulta de onboarding, `/account-unavailable`, como hoje;
6. onboarding incompleto, `/onboarding`;
7. caso restante, `/dashboard`.

A página de conta indisponível não recebe falha de consulta do aceite. Os
layouts de onboarding e da área logada repetem a checagem, para um endereço
direto não furar a trava.

## 4. Modelo de dados

Tabela privada e append-only, no mesmo espírito de
`private.whatsapp_consent_events`:

```text
id            bigint identity primary key
user_id       uuid not null -> auth.users(id) on delete restrict
copy_version  text not null
source        text not null check in ('signup', 'gate')
created_at    timestamptz not null
```

`copy_version` tem de 1 a 64 caracteres. Um índice único em
`(user_id, copy_version)` impede duas linhas da mesma versão. A ausência de
linha é o estado "não aceito". Recusa não grava evento.

RLS fica ligado. Não há policy de acesso. `anon`, `authenticated` e
`service_role` perdem todo privilégio direto sobre a tabela e a sequence. Um
trigger rejeita `UPDATE` e `DELETE`, no mesmo critério do histórico de
WhatsApp. A função do trigger não é executável por papéis públicos.

## 5. Funções

As três funções são `SECURITY DEFINER`, com `search_path = ''` e nomes
qualificados. `EXECUTE` começa revogado para `PUBLIC`, `anon` e
`authenticated`.

`public.record_signup_legal_acceptance_v1(p_user_id uuid, p_copy_version text)`

- executável só por `service_role`;
- grava origem `signup`;
- não recebe origem nem instante do chamador;
- na versão já registrada, devolve sucesso idempotente e não insere outra
  linha;
- rejeita versão fora do limite.

`public.accept_current_legal_terms_v1(p_copy_version text)`

- executável por `authenticated`;
- usa `auth.uid()` e recusa sessão ausente;
- grava origem `gate`;
- é idempotente para a mesma versão;
- não aceita um `user_id` informado pelo cliente.

`public.current_user_has_accepted_legal_copy_v1(p_copy_version text)`

- executável por `authenticated`;
- devolve boolean só com sessão;
- sem sessão, falha, para a aplicação não tratar o caso como "não aceito";
- devolve verdadeiro apenas quando existe linha da versão recebida.

A versão vigente mora na aplicação. O banco não a hardcodifica.

## 6. Gravação

### 6.1 Cadastro

A ação de cadastro exige o campo `acceptedLegalTerms` antes de chamar o
serviço. Sem ele, devolve o erro `legal_acceptance_required`. O serviço de
`signUp` passa a devolver o id do usuário quando ele existir.

A gravação usa o cliente administrativo e a função de cadastro, com a
constante da aplicação. O navegador não escolhe o id. A ação grava somente
quando o `signUp` devolve um usuário com identidade real:

- sessão presente: grava para esse usuário;
- confirmação de e-mail com ao menos uma identity: grava para esse usuário;
- usuário sem identities: não grava, porque essa resposta pode representar uma
  conta que já existia.

Se a conta é criada e a gravação falha, o cadastro não é desfeito. A
confirmação de e-mail segue, ou o redirecionamento para `/auth/continue`
segue. A trava registra o aceite no primeiro login.

### 6.2 Trava

A ação da tela chama `accept_current_legal_terms_v1` com a constante, pela
sessão do cliente. Sucesso redireciona para `/auth/continue`. Falha mantém a
pessoa na tela, com erro, sem abrir o produto.

### 6.3 Entradas do cliente

`requireUser` continua responsável por sessão e elegibilidade. A checagem do
aceite não entra no `try` que hoje transforma qualquer falha em conta
indisponível.

Um helper novo, usado por conta de cliente, faz `requireUser`, isenta
administrador e, para o restante, exige a versão vigente. Falha de consulta ou
falta de aceite produz um erro próprio, distinto de conta indisponível.

Esse helper protege o layout privado, o layout de onboarding e as ações e
rotas de API que hoje chamam `requireUser` para operar o produto do cliente.
`/accept-terms` usa apenas `requireUser`. Área administrativa continua em
`requireAdmin`.

Nas páginas, o erro de aceite redireciona para `/accept-terms`. Nas rotas de
API, a resposta é `403` com código estável `legal_acceptance_required`.

## 7. Páginas e fonte do texto

Uma fonte única guarda a versão, o nome, o CPF, o endereço e o e-mail. As
páginas, o checkbox, a trava e as funções de gravação leem a versão dali. As
duas páginas públicas leem a identificação dali. Minha conta e o rodapé só
precisam dos caminhos `/terms` e `/privacy`.

O CPF fica no código-fonte porque a página pública o exibe. Isso é intencional
para esta versão, enquanto não há CNPJ.

## 8. Falhas

| Situação                             | Comportamento                                                   |
| ------------------------------------ | --------------------------------------------------------------- |
| Checkbox ausente no cadastro         | Erro no formulário, sem `signUp`                                |
| Conta criada e gravação falha        | Cadastro segue; a trava cobre no login                          |
| `signUp` sem identity                | Não grava; a trava cobre no login                               |
| Mesma versão aceita de novo          | Sucesso, sem linha duplicada                                    |
| Consulta do aceite falha             | `/accept-terms` com tentar de novo e sair; sem botão de aceitar |
| Sem sessão em `/accept-terms`        | `/login`                                                        |
| Administrador em `/accept-terms`     | `/admin`                                                        |
| Cliente já aceito em `/accept-terms` | `/auth/continue`                                                |
| Link direto sem aceite               | `/accept-terms`                                                 |
| API de cliente sem aceite            | `403 legal_acceptance_required`                                 |
| Recusa na trava                      | Nenhuma linha; conta e assinatura intactas                      |

A função de cadastro recusa chamada de `anon` e de `authenticated`. A função da
trava não grava aceite de outro usuário.

## 9. Testes

No banco, com pgTAP:

- a tabela existe, RLS está ligado e os três papéis não têm acesso direto;
- `UPDATE` e `DELETE` falham;
- a função de cadastro só executa com `service_role`, grava `signup` e não
  duplica a versão;
- a função da trava exige sessão, grava `gate`, não duplica e não aceita outro
  usuário;
- a consulta responde não sem linha, sim com a versão pedida e não com outra
  versão;
- sessão ausente na consulta é falha, não "não aceito".

Na aplicação:

- cadastro sem checkbox não chama `signUp`;
- com checkbox e identity, grava o aceite;
- sem identity, segue a confirmação e não grava;
- falha de gravação depois da conta criada não desfaz o cadastro;
- destino: administrador `/admin`, inelegível `/account-unavailable`, cliente
  sem aceite `/accept-terms`, com aceite e sem onboarding `/onboarding`, com
  onboarding `/dashboard`;
- falha da consulta de aceite vai para `/accept-terms`, não para
  `/account-unavailable` nem para `/dashboard`;
- helper de cliente isenta administrador e bloqueia cliente sem aceite;
- API de cliente sem aceite responde `403`.

Na interface:

- o checkbox do cadastro começa desmarcado e aponta para `/terms` e `/privacy`;
- a trava mostra aceitar e sair;
- no erro de consulta, aceitar some;
- o rodapé da landing e Minha conta têm os dois links;
- as páginas públicas mostram a versão e a identificação vinda da fonte única.

## 10. Fora do escopo

- banner ou centro de preferência de cookies;
- apagamento de dados pessoais, anonimização ou exclusão no Asaas e na OpenAI;
- aceite do administrador;
- reaceite em todo login;
- transformar o WhatsApp de marketing em aceite obrigatório;
- escolher um prazo numérico de retenção fiscal além de "garantia e obrigação
  fiscal";
- revisão jurídica do texto.

O próximo projeto, separado deste, é a ferramenta que cumpre um pedido real de
exclusão. Até lá, o canal é o e-mail de atendimento, e a política descreve o
limite do que o sistema faz hoje.
