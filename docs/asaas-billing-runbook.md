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
- `asaas_webhook_events` é o ledger idempotente de eventos, com payload
  redigido.
- Somente webhooks verificados podem liberar, renovar ou revogar acesso. O
  retorno do navegador após o Checkout nunca é fonte de verdade.
- Reembolso não é iniciado pelo Lucrivo nesta versão. Eventos de reembolso ou
  chargeback originados externamente continuam sendo processados para manter o
  acesso local coerente.

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

Nos eventos de Checkout v3, cobranças e assinaturas podem referenciar a sessão
no campo `checkoutSession`. Esse valor deve ser conciliado com
`billing_contracts.asaas_checkout_id`; não dependa de `externalReference`, pois
ele pode não estar presente no payload entregue pelo Asaas.

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
pnpm build
```

Todos os comandos devem passar. A geração de tipos não pode alterar
`database.types.ts`.

## Matriz obrigatória no sandbox

Use um usuário de teste exclusivo e valores do catálogo ativo. Para cada caso,
registre o ID local do contrato e todos os IDs de evento relacionados. Verifique
no navegador e consulte `billing_contracts`, `billing_payments` e
`asaas_webhook_events` sem selecionar payloads.

### 1. Mensal no cartão

- Criar o Checkout e concluir o pagamento com cartão de teste.
- Confirmar contrato `monthly`, `credit_card`, `recurring` e acesso de um mês.
- Simular/aguardar a confirmação da renovação e confirmar extensão sem lacuna.
- Cancelar pela tela `/billing` e verificar `cancel_at_period_end`, mantendo
  `access_ends_at` intacto.
- Avançar/aguardar o fim do período e confirmar expiração e bloqueio dos
  relatórios extras.

### 2. Mensal no Pix

- Criar e pagar um Checkout Pix avulso.
- Confirmar exatamente um mês de acesso.
- Confirmar ausência de assinatura e de renovação automática.

### 3. Anual no Pix e no cartão

- Confirmar que o Checkout anual no cartão foi criado com os tipos de cobrança
  `DETACHED` e `INSTALLMENT`; o Asaas exige ambos para oferecer pagamento à
  vista ou parcelado.
- Pagar o anual no Pix à vista e confirmar exatamente 12 meses.
- Fazer uma compra anual no cartão em 1x e confirmar exatamente 12 meses.
- Fazer outra compra anual no cartão em 12x e confirmar exatamente 12 meses.
- Nos três casos, confirmar que não existe renovação automática.

### 4. Idempotência, ordem e reversões

- Reentregar o mesmo evento e confirmar ausência de duplicação de acesso ou
  pagamento.
- Entregar `PAYMENT_RECEIVED` fora de ordem e confirmar convergência segura.
- Emitir reembolso total no sandbox e confirmar revogação conforme webhook.
- Emitir/simular chargeback e confirmar revogação e estado local correspondente.
- Reembolso parcial deve ficar para revisão manual, sem ajuste automático
  silencioso de acesso.

### 5. Callback antes do webhook

- Fazer o navegador chegar a `/billing/return?outcome=success` antes da entrega
  do webhook.
- Confirmar a mensagem de processamento, sem alegação de acesso pago.
- Entregar o webhook, atualizar a página e confirmar o acesso somente então.

### 6. Timeout e reconciliação

- Forçar timeout após uma criação/cancelamento enviado ao provedor.
- Confirmar `pending_reconciliation` e ausência de concessão/revogação baseada
  somente na resposta do navegador.
- Entregar o webhook ou executar reconciliação manual auditada e confirmar
  convergência.

### 7. Jornada de relatórios

- Criar o primeiro relatório gratuito e confirmar leitura.
- Tentar criar um segundo relatório como free e confirmar bloqueio.
- Ativar um pagamento e confirmar criação/leitura de relatórios adicionais.
- Expirar o acesso e confirmar que relatórios pagos ficam ocultos, sem exclusão.
- Reassinar e confirmar que os relatórios voltam a ficar disponíveis.

### Registro da homologação

Não marque uma linha como aprovada sem evidência no navegador e nas três tabelas
locais. Use uma linha adicional para cada variação do caso 3.

| Caso                     | Resultado | Contrato local | Eventos Asaas | Evidência/ticket | Executor | Data UTC |
| ------------------------ | --------- | -------------- | ------------- | ---------------- | -------- | -------- |
| 1. Mensal cartão         | Pendente  | —              | —             | —                | —        | —        |
| 2. Mensal Pix            | Pendente  | —              | —             | —                | —        | —        |
| 3. Anual Pix             | Pendente  | —              | —             | —                | —        | —        |
| 3. Anual cartão 1x       | Pendente  | —              | —             | —                | —        | —        |
| 3. Anual cartão 12x      | Pendente  | —              | —             | —                | —        | —        |
| 4. Ordem/reversões       | Pendente  | —              | —             | —                | —        | —        |
| 5. Callback antecipado   | Pendente  | —              | —             | —                | —        | —        |
| 6. Timeout/reconciliação | Pendente  | —              | —             | —                | —        | —        |
| 7. Acesso a relatórios   | Pendente  | —              | —             | —                | —        | —        |

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
