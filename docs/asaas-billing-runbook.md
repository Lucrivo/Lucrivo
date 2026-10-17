# Runbook de billing com Asaas

Este documento orienta a configuração, homologação, operação e recuperação do
billing do Lucrivo. Ele não contém valores de secrets e não deve ser usado para
registrá-los.

## Responsabilidades e fonte de verdade

- O Asaas processa Checkout, cartão, Pix, parcelas e recorrência.
- O Lucrivo nunca coleta nem persiste número de cartão, CVV, validade, dados
  mascarados ou tokens reutilizáveis de cartão.
- `billing_prices` é o catálogo comercial versionado.
- `billing_contracts` representa a compra e o intervalo de acesso local.
- `billing_payments` normaliza cobranças conhecidas.
- `billing_refund_requests` registra a solicitação, o resultado do envio ao
  provedor e a confirmação financeira final.
- `asaas_webhook_events` é o ledger idempotente de eventos, com payload
  redigido.
- Somente webhooks verificados podem liberar, renovar ou revogar acesso. O
  retorno do navegador após o Checkout nunca é fonte de verdade.
- O cliente pode iniciar um reembolso integral automático em até sete dias
  corridos, incluindo o instante exato do limite, contados do início do acesso
  pago. O acesso é bloqueado assim que a solicitação local é aceita; o webhook
  do Asaas confirma o estado financeiro final.
- Eventos de reembolso ou chargeback iniciados fora do Lucrivo também continuam
  sendo processados para manter o acesso local coerente.

## Concessão permanente da biblioteca Bônus

`bonus_access_grants` registra uma concessão por contrato pago. Dentro da mesma
transação de `apply_asaas_webhook_event`, uma confirmação de Checkout ou
pagamento cria a concessão de forma idempotente. Reembolso integral marca a
linha com `full_refund`; solicitação ou disputa de chargeback marca
`chargeback`. Reembolso parcial mantém a concessão ativa.

Cancelamento, inativação da assinatura e expiração do período não revogam esse
benefício: a compra já confirmou o direito permanente ao guia e à planilha. Uma
revogação afeta apenas o contrato correspondente. Se o cliente tiver outra
concessão sem `revoked_at`, o acesso protegido permanece disponível. Cortesia
administrativa não cria concessão.

Durante uma reconciliação, compare contrato, pagamentos e concessão sem copiar
payloads ou identificadores do provedor para tickets:

```sql
select
  contract.id as contract_id,
  contract.user_id,
  contract.status as contract_status,
  payment.status as payment_status,
  payment.confirmed_at,
  payment.received_at,
  payment.refunded_at,
  payment.chargeback_at,
  bonus_grant.granted_at,
  bonus_grant.revoked_at,
  bonus_grant.revocation_reason
from public.billing_contracts as contract
left join public.billing_payments as payment
  on payment.contract_id = contract.id
left join public.bonus_access_grants as bonus_grant
  on bonus_grant.contract_id = contract.id
where contract.id = '<contract-id>'::uuid
order by payment.due_date, payment.created_at;
```

Depois do replay do evento original, confirme que pagamento confirmado,
recebido ou parcialmente reembolsado tem concessão viva; reembolso integral tem
`full_refund`; e chargeback tem `chargeback`. Não corrija cancelamento ou
expiração revogando a linha manualmente.

O teste focado da política é:

```bash
pnpm exec supabase test db supabase/tests/bonus_library.test.sql supabase/tests/billing_webhooks.test.sql --local
```

## Catálogo comercial vigente

- Padrão mensal: R$ 49,90, um mês de acesso, com renovação mensal no cartão ou
  pagamento avulso no Pix.
- Padrão semestral: R$ 239,40, em até 6x de R$ 39,90 no cartão ou à vista no
  Pix, com seis meses de acesso e sem renovação automática.
- Lançamento mensal: R$ 39,90 no primeiro pagamento, um mês de bônus e dois
  meses de acesso inicial. No cartão, a assinatura nasce com ciclo seguro
  `BIMONTHLY`; depois da confirmação, o Lucrivo agenda a próxima cobrança para
  dois meses após o pagamento e converte o ciclo para `MONTHLY`. No Pix, a
  cobrança é avulsa e não renova.
- Lançamento semestral: R$ 179,40 à vista ou em até 6x de R$ 29,90, seis meses
  de bônus e doze meses de acesso, sem renovação automática.

Os catálogos `standard` e `launch` são snapshots imutáveis. A aplicação escolhe
no servidor exatamente uma oferta de cada modalidade conforme a janela de 15
dias de `LAUNCH_OFFER_START_AT`; o navegador não escolhe catálogo, preço, bônus,
acesso, ciclo ou prazo. O modo `annual` foi removido da base de pré-produção e
não deve ser recriado.

## Ambientes e variáveis

Mantenha credenciais e projetos completamente separados. Nunca reutilize uma
chave, token de webhook ou banco entre sandbox e produção.

### Sandbox ou staging

```dotenv
APP_URL=https://<host-publico-de-staging-ou-tunel>
NEXT_PUBLIC_SUPABASE_URL=<url-do-projeto-sandbox>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave-publicavel-sandbox>
SUPABASE_SECRET_KEY=<secret-key-sandbox>
ASAAS_API_URL=https://api-sandbox.asaas.com
ASAAS_API_KEY=<api-key-sandbox>
ASAAS_WEBHOOK_TOKEN=<token-exclusivo-sandbox>
```

### Produção

```dotenv
APP_URL=https://<host-de-producao>
NEXT_PUBLIC_SUPABASE_URL=<url-do-projeto-producao>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave-publicavel-producao>
SUPABASE_SECRET_KEY=<secret-key-producao>
ASAAS_API_URL=https://api.asaas.com
ASAAS_API_KEY=<api-key-producao>
ASAAS_WEBHOOK_TOKEN=<token-exclusivo-producao>
```

Regras obrigatórias:

- `APP_URL` deve usar HTTPS fora do desenvolvimento local.
- `SUPABASE_SECRET_KEY`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` são
  server-only e nunca recebem prefixo `NEXT_PUBLIC_`.
- Cada `ASAAS_WEBHOOK_TOKEN` deve ter pelo menos 32 caracteres aleatórios e ser
  diferente de `ASAAS_API_KEY`.
- A `ASAAS_API_KEY` precisa permitir criação/cancelamento de Checkout,
  cancelamento de assinatura e escrita de reembolso. Valide essas permissões em
  sandbox antes de publicar a chave em produção.
- Gere tokens com uma fonte criptograficamente segura, por exemplo
  `openssl rand -base64 48`, e armazene-os somente no gerenciador de secrets do
  ambiente.
- Não escreva valores de secrets em tickets, logs, screenshots, documentos ou
  comandos versionados.

## Configuração do webhook

Cadastre um webhook por ambiente no painel correspondente do Asaas:

- URL: `${APP_URL}/api/webhooks/asaas`
- Token de autenticação: o valor de `ASAAS_WEBHOOK_TOKEN`; o Asaas o envia no
  header `asaas-access-token`.
- Entrega: sequencial.
- Fila: ativa.

Assine exatamente estes eventos:

```text
CHECKOUT_CREATED
CHECKOUT_PAID
CHECKOUT_CANCELED
CHECKOUT_EXPIRED
PAYMENT_CREATED
PAYMENT_CONFIRMED
PAYMENT_RECEIVED
PAYMENT_CREDIT_CARD_CAPTURE_REFUSED
PAYMENT_OVERDUE
PAYMENT_REFUNDED
PAYMENT_PARTIALLY_REFUNDED
PAYMENT_CHARGEBACK_REQUESTED
PAYMENT_CHARGEBACK_DISPUTE
SUBSCRIPTION_CREATED
SUBSCRIPTION_UPDATED
SUBSCRIPTION_INACTIVATED
SUBSCRIPTION_DELETED
```

`PAYMENT_CREATED` e `SUBSCRIPTION_UPDATED` são mantidos na assinatura para
rastreabilidade e compatibilidade operacional; na versão atual, são registrados
como ignorados e não concedem acesso. Eventos desconhecidos também devem ser
aceitos de forma compatível e ignorados com segurança.

Antes de homologar Pix, cadastre uma chave Pix na conta Asaas do mesmo ambiente.
Sem uma chave ativa, a API recusa corretamente o Checkout com HTTP `400`, ainda
que o payload `PIX` + `DETACHED` esteja válido.

Após salvar a configuração, envie um evento de teste e confirme:

1. resposta HTTP `200` com corpo sanitizado;
2. uma linha em `asaas_webhook_events`, sem objeto de cartão;
3. `processing_status` igual a `processed` ou `ignored`;
4. nenhuma credencial, dado pessoal ou payload integral nos logs da aplicação.

Respostas `401` indicam token incorreto. Respostas `400` indicam envelope
inválido. Respostas `503` pedem nova tentativa porque a aplicação não confirmou
o processamento seguro.

Ao selecionar outra oferta enquanto existe um Checkout válido pendente, a
aplicação chama `POST /v3/checkouts/{id}/cancel` antes de criar a substituição.
Ela reutiliza a sessão quando a oferta é a mesma. Nunca libere apenas o registro
local: uma falha ou resposta ambígua do cancelamento deve impedir o novo
Checkout até a conciliação, evitando duas sessões simultaneamente pagáveis.

## Reembolso automático

O cliente solicita o reembolso em `POST /api/billing/refund`. O endpoint exige
sessão autenticada, origem válida e não aceita identificadores do cliente no
corpo. A operação é integral; reembolso parcial nunca é iniciado por esse
fluxo.

Após a confirmação explícita na interface:

1. `begin_billing_refund` valida o contrato atual, a janela inclusiva de sete
   dias e a existência dos identificadores necessários;
2. o contrato passa imediatamente para `refund_pending`, revogando o acesso;
3. mensal no cartão ou Pix chama `POST /v3/payments/{paymentId}/refund`;
4. semestral no Pix e semestral no cartão em 1x reembolsam o pagamento;
   semestral parcelado chama `POST /v3/installments/{installmentId}/refund`
   para devolver a compra toda;
5. mensal no cartão também chama `DELETE /v3/subscriptions/{subscriptionId}`
   para impedir nova cobrança;
6. `PAYMENT_REFUNDED` e, quando aplicável, `SUBSCRIPTION_INACTIVATED` ou
   `SUBSCRIPTION_DELETED` confirmam a convergência final.

Cliques duplicados são idempotentes. Uma rejeição explícita do Asaas pode ser
mostrada ao cliente e permite nova tentativa segura. Timeout, resposta ambígua,
falha ao persistir o resultado ou falha ao cancelar a recorrência resultam em
`pending_reconciliation`; não repita a mutação sem consultar o Asaas.

O crédito do cartão pode levar até dez dias úteis para aparecer na fatura. No
Pix, o Asaas pode recusar o estorno se a conta não tiver saldo disponível; esse
caso fica como rejeitado e deve ser resolvido antes de uma nova tentativa.

## Observabilidade segura

Logs de billing ficam limitados a:

- ID e tipo do evento;
- ID local do contrato;
- IDs do Checkout, assinatura, parcela ou pagamento no provedor;
- categoria segura do erro, como `authentication`, `invalid_payload`,
  `database`, `provider_rejected`, `provider_ambiguous` ou `reconciliation`;
- timestamps e resultado operacional.

Nunca registre payload de webhook, headers, tokens, e-mail, CPF/CNPJ, telefone,
endereço, link de Checkout, resposta bruta do provedor ou qualquer dado de
cartão. Mensagens internas de banco/provedor devem ser convertidas em uma
categoria segura antes do log.

Consultas operacionais devem selecionar apenas os campos necessários. Exemplo:

```sql
select
  id,
  event_type,
  contract_id,
  processing_status,
  attempt_count,
  received_at,
  processed_at
from public.asaas_webhook_events
order by received_at desc
limit 100;
```

## Rotação de secrets

### Token do webhook

1. Abra uma janela de mudança e gere um token aleatório novo.
2. Atualize `ASAAS_WEBHOOK_TOKEN` no gerenciador de secrets da aplicação.
3. Faça o deploy e confirme que a aplicação está saudável.
4. Atualize imediatamente o token do webhook no mesmo ambiente do Asaas.
5. Envie um evento de teste e confirme HTTP `200` e ledger processado.
6. Registre horário, ambiente, operador e evento de validação, sem registrar o
   token.

Como não há período de sobreposição de dois tokens, faça os passos 2 a 4 em uma
janela curta e monitore a fila. Eventos que receberem `401` devem permanecer no
Asaas para nova entrega após a correção.

### API key do Asaas e secret key do Supabase

1. Crie a nova credencial no provedor correto.
2. Atualize o gerenciador de secrets e faça o deploy.
3. Valide health check, criação de Checkout em sandbox e processamento de um
   webhook.
4. Revogue a credencial anterior somente após as validações.
5. Registre a mudança sem copiar nenhum valor secreto.

## Fila pausada e recuperação

Se o Asaas pausar a fila após falhas consecutivas:

1. não exclua nem recrie o webhook;
2. identifique a categoria segura do erro usando status HTTP e os IDs dos
   eventos;
3. corrija configuração, disponibilidade ou mapeamento e valide o endpoint;
4. reative a fila com entrega sequencial no painel ou atualize o webhook com
   `PUT /v3/webhooks/{id}` e `{"interrupted": false}`;
5. se houver somente penalização temporária depois da reativação, use
   `POST /v3/webhooks/{id}/removeBackoff`; essa operação não reativa uma fila
   marcada como interrompida;
6. conclua a recuperação dentro da retenção de 14 dias do Asaas;
7. acompanhe o backlog até não haver eventos pendentes e compare os contratos
   locais com os pagamentos do provedor;
8. registre início, causa, correção, primeiro/último evento recuperado e horário
   de normalização.

Uma resposta ambígua do provedor nunca autoriza repetir cegamente uma operação
mutável. Aguarde o webhook ou faça reconciliação por IDs já persistidos.

## Reconciliação e replay

Para eventos `failed` ou contratos `pending_reconciliation`:

1. localize o evento pelo ID e o contrato pelo `external_reference` ou ID de
   provedor já armazenado;
2. compare estado, valor, modalidade e período no Asaas;
3. corrija o mapeamento ou o defeito de código antes do replay;
4. invoque a mesma RPC `apply_asaas_webhook_event` com o ID, tipo e payload
   originais armazenados;
5. confirme o resultado e registre a execução no incidente.

Para uma solicitação de reembolso em `pending_reconciliation`, siga esta ordem:

1. identifique a solicitação local e o contrato sem copiar payloads ou secrets;
2. consulte o pagamento ou parcelamento no Asaas antes de repetir qualquer
   mutação;
3. em mensal no cartão, confirme também que a assinatura está inativa ou
   excluída;
4. reentregue o webhook original ou aplique uma conciliação auditada;
5. confirme que solicitação, contrato, pagamento, acesso e estado visível ao
   cliente estão coerentes.

Nos eventos de Checkout v3, cobranças e assinaturas podem referenciar a sessão
no campo `checkoutSession`. Esse valor deve ser conciliado com
`billing_contracts.asaas_checkout_id`; não dependa de `externalReference`, pois
ele pode não estar presente no payload entregue pelo Asaas.

Para inspecionar o ajuste de renovação, pesquise apenas pelo ID local do
contrato e não inclua IDs do provedor em saídas de suporte:

```sql
select
  id,
  catalog_code,
  billing_mode,
  payment_method,
  status,
  access_ends_at,
  renewal_adjustment_status,
  renewal_adjustment_attempt_count,
  renewal_adjusted_at,
  renewal_adjustment_last_error_code,
  updated_at
from public.billing_contracts
where id = '<contract-id>'::uuid;
```

Um lançamento mensal em `pending_reconciliation` exige consulta ao estado atual
da assinatura no Asaas antes de qualquer nova mutação. Reentregue o webhook
verificado ou execute a reconciliação idempotente usando os identificadores já
persistidos; nunca copie esses identificadores para tickets ou mensagens ao
cliente.

Exemplo administrativo, sempre usando os valores da linha original:

```sql
select public.apply_asaas_webhook_event(
  p_event_id := '<id-original>',
  p_event_type := '<tipo-original>',
  p_payload := '<payload-redigido-original>'::jsonb
);
```

Não altere o ID para contornar idempotência e não edite datas de acesso
manualmente. Uma correção manual excepcional exige incidente auditável com
motivo, evidência, valor anterior, valor novo, operador, aprovador e horário.

## Retenção do ledger local

O payload redigido permanece por 180 dias. Uma manutenção pode apagar apenas
linhas `processed` ou `ignored` anteriores ao corte. Linhas `failed` são retidas
até serem reconciliadas; linhas ainda recebidas também não são removidas.

Execute em transação administrativa e registre a quantidade retornada:

```sql
begin;

delete from public.asaas_webhook_events
where processing_status in ('processed', 'ignored')
  and received_at < statement_timestamp() - interval '180 days'
returning id, event_type, received_at;

commit;
```

Cada execução deve gerar um registro operacional com ambiente, início/fim,
operador, cutoff, quantidade apagada, menor/maior data removida e referência do
ticket. O registro não contém payloads nem secrets.

## Gate automatizado de release

Execute em uma stack Supabase local descartável. `pnpm supabase:reset` apaga os
dados locais:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
pnpm check
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

Todos os comandos devem passar. A geração de tipos não pode alterar
`database.types.ts`. A sobrescrita acima serve somente para validar localmente o
build otimizado: `.env.local` usa deliberadamente a chave dummy oficial do
Turnstile, que a aplicação rejeita sob `NODE_ENV=production`. Não publique o
artefato local gerado com `ci-turnstile-site-key`; staging e produção devem
executar o mesmo `pnpm build` com a site key real do respectivo widget Turnstile.

## Matriz obrigatória no sandbox

Use um usuário de teste exclusivo e valores do catálogo ativo. Para cada caso,
registre o ID local do contrato e todos os IDs de evento relacionados. Verifique
no navegador e consulte `billing_contracts`, `billing_payments` e
`asaas_webhook_events` sem selecionar payloads.

### 1. Lançamento mensal no cartão — R$ 39,90

- Criar o Checkout e concluir o pagamento com cartão de teste.
- Confirmar contrato `launch`, `monthly`, `credit_card`, `recurring`, um mês de
  bônus e dois meses de acesso inicial.
- Confirmar cobrança imediata de R$ 39,90 e assinatura criada com ciclo
  `BIMONTHLY`; nenhum segundo débito pode ocorrer na criação.
- Após o webhook verificado, confirmar atualização para `MONTHLY`, próxima data
  de vencimento exatamente dois meses depois e
  `renewal_adjustment_status = 'completed'`.
- Reentregar os webhooks de pagamento e assinatura e confirmar que a atualização
  não se repete nem muda a próxima data.
- Solicitar reembolso dentro de sete dias, confirmar bloqueio imediato, estorno
  integral do pagamento e exclusão/inativação da assinatura.
- Reentregar os webhooks e inverter a ordem entre reembolso e cancelamento da
  assinatura; o estado final deve continuar `refunded`.
- Cancelar pela tela `/billing` e verificar `cancel_at_period_end`, mantendo
  `access_ends_at` intacto.
- Avançar/aguardar o fim do período e confirmar expiração e bloqueio dos
  relatórios extras.

### 2. Lançamento mensal no Pix — R$ 39,90

- Criar e pagar um Checkout Pix avulso.
- Confirmar exatamente dois meses de acesso, incluindo um mês de bônus.
- Confirmar ausência de assinatura e de renovação automática.
- Solicitar reembolso dentro de sete dias e confirmar o estorno integral pelo
  pagamento, sem operação de assinatura.
- Repetir sem saldo Pix disponível, confirmar rejeição segura e validar uma
  nova tentativa somente depois de recompor o saldo.

### 3. Lançamento semestral — R$ 179,40

- Confirmar que o Checkout semestral no cartão foi criado com os tipos de cobrança
  `DETACHED` e `INSTALLMENT`; o Asaas exige ambos para oferecer pagamento à
  vista ou parcelado.
- Pagar no Pix à vista e confirmar exatamente doze meses de acesso.
- Fazer compras no cartão em 1x, 2x, 3x, 4x, 5x e 6x; todas devem permanecer
  selecionáveis e conceder exatamente doze meses, sem tratar 6x como obrigatório.
- Na opção de 6x, confirmar R$ 29,90 por parcela e total de R$ 179,40.
- Em todos os casos, confirmar que não existe renovação automática.
- Reembolsar Pix pelo pagamento e cartão pelo parcelamento; confirmar devolução
  integral tanto em 1x quanto em 6x.

### 3A. Catálogo padrão depois da campanha

- Mensal no cartão e no Pix deve cobrar R$ 49,90 e conceder um mês, sem bônus.
- Mensal no cartão deve nascer e permanecer `MONTHLY`; não deve entrar no fluxo
  de ajuste promocional.
- Semestral no Pix e no cartão deve cobrar R$ 239,40, permitir de 1x a 6x (6x
  de R$ 39,90) e conceder seis meses, sem bônus ou renovação automática.
- Repetir cancelamento mensal e reembolso integral em até sete dias para
  confirmar que a campanha não alterou essas políticas.

### 4. Idempotência, ordem e reversões

- Criar um Checkout promocional um milissegundo antes do fim; ele deve continuar
  reutilizável somente dentro da validade persistida de uma hora.
- Tentar criar outro Checkout promocional no instante final exato; a aplicação
  deve rejeitá-lo e selecionar o catálogo padrão.
- Reentregar o mesmo evento e confirmar ausência de duplicação de acesso ou
  pagamento.
- Clicar duas vezes em “Pedir reembolso” e confirmar uma única solicitação e
  uma única mutação no Asaas.
- Testar um instante dentro da janela, o limite exato de sete dias e um instante
  posterior; somente o último deve ser recusado por prazo.
- Entregar `PAYMENT_RECEIVED` fora de ordem e confirmar convergência segura.
- Inverter a ordem dos eventos de reembolso e assinatura, confirmando
  convergência.
- Emitir/simular chargeback e confirmar revogação e estado local correspondente.
- Reembolso parcial deve ficar para revisão manual, sem ajuste automático
  silencioso de acesso.

### 5. Callback antes do webhook

- Fazer o navegador chegar a `/billing/return?outcome=success` antes da entrega
  do webhook.
- Confirmar a mensagem de processamento, sem alegação de acesso pago.
- Entregar o webhook, atualizar a página e confirmar o acesso somente então.

### 6. Timeout e reconciliação

- Forçar rejeição e timeout na atualização `BIMONTHLY` → `MONTHLY` depois de o
  pagamento inicial ter sido confirmado.
- Confirmar `pending_reconciliation` e ausência de concessão/revogação baseada
  somente na resposta do navegador.
- Consultar a assinatura antes de repetir qualquer mutação, entregar um webhook
  duplicado e executar reconciliação manual auditada; confirmar uma única
  convergência e a próxima cobrança dois meses após a inicial.

### 7. Jornada de relatórios

- Criar o primeiro relatório gratuito e confirmar leitura.
- Tentar criar um segundo relatório como free e confirmar bloqueio.
- Ativar um pagamento e confirmar criação/leitura de relatórios adicionais.
- Expirar o acesso e confirmar que relatórios pagos ficam ocultos, sem exclusão.
- Reassinar e confirmar que os relatórios voltam a ficar disponíveis.

### Registro da homologação

Não marque uma linha como aprovada sem evidência no navegador e nas três tabelas
locais. Use uma linha adicional para cada variação. Registre somente IDs
internos seguros; nunca inclua chave de API, token de webhook, payload bruto ou
dados de cartão/cliente.

| Caso                                 | Resultado | Contrato/reembolso local | Eventos Asaas | Evidência/ticket | Executor | Data UTC |
| ------------------------------------ | --------- | ------------------------ | ------------- | ---------------- | -------- | -------- |
| 1. Lançamento mensal cartão + ajuste | Pendente  | —                        | —             | —                | —        | —        |
| 2. Lançamento mensal Pix + reembolso | Pendente  | —                        | —             | —                | —        | —        |
| 3. Lançamento semestral Pix          | Pendente  | —                        | —             | —                | —        | —        |
| 3. Lançamento semestral cartão 1–6x  | Pendente  | —                        | —             | —                | —        | —        |
| 3A. Catálogo padrão completo         | Pendente  | —                        | —             | —                | —        | —        |
| 4. Limite exato da campanha          | Pendente  | —                        | —             | —                | —        | —        |
| 4. Limite exato de sete dias         | Pendente  | —                        | —             | —                | —        | —        |
| 4. Clique duplicado                  | Pendente  | —                        | —             | —                | —        | —        |
| 4. Ordem reembolso/assinatura        | Pendente  | —                        | —             | —                | —        | —        |
| 4. Reembolso parcial externo         | Pendente  | —                        | —             | —                | —        | —        |
| 4. Pix sem saldo disponível          | Pendente  | —                        | —             | —                | —        | —        |
| 5. Callback antecipado               | Pendente  | —                        | —             | —                | —        | —        |
| 6. Timeout/reconciliação             | Pendente  | —                        | —             | —                | —        | —        |
| 7. Acesso a relatórios               | Pendente  | —                        | —             | —                | —        | —        |

Não disponibilize os CTAs de produção nem promova o release antes de todas as
linhas estarem aprovadas e vinculadas às evidências.

## Checklist de promoção para produção

- Gate automatizado integralmente verde.
- Matriz sandbox integralmente aprovada e registrada.
- Variáveis de produção configuradas no ambiente correto.
- `ASAAS_API_URL` de produção confirmado.
- Webhook de produção com HTTPS, token exclusivo, entrega sequencial e lista
  exata de eventos.
- Health check sanitizado.
- Alertas e responsáveis por reconciliação definidos.
- Procedimentos de rotação, fila pausada, retenção e incidente acessíveis à
  equipe de operação.
