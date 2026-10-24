# Design — Pixel da Meta e Conversions API

**Data:** 2026-10-23

**Status:** Aprovado para planejamento de implementação

**Escopo:** rastreamento de aquisição com consentimento, Pixel da Meta no navegador e Conversions API para compras

## 1. Objetivo

Integrar o Lucrivo à Meta de forma compatível com a arquitetura atual, com a LGPD e com o fluxo real de negócio. A integração deve medir somente os pontos necessários do funil, sem alterar autenticação, diagnósticos, cobrança, concessão de acesso ou qualquer outra regra já existente.

O sistema continuará funcionando normalmente quando:

- o visitante recusar cookies de publicidade;
- um bloqueador impedir o carregamento do Pixel;
- a Meta estiver indisponível;
- a configuração estiver ausente ou incompleta;
- a fila ou o envio pela Conversions API falhar temporariamente.

Telemetria é sempre uma consequência secundária de uma operação de negócio já concluída. Uma falha de rastreamento nunca transforma sucesso de negócio em erro para o usuário.

## 2. Decisões principais

### 2.1 Eventos medidos

| Evento                 | Canal              | Momento válido                                                                             | Regra de unicidade                                            |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `PageView`             | Pixel no navegador | Entrada inicial ou navegação lógica em rota permitida, depois do consentimento             | Uma vez por visualização lógica                               |
| `CompleteRegistration` | Pixel no navegador | Conta realmente utilizável: sessão autenticada imediata ou confirmação de e-mail concluída | Uma vez por conta                                             |
| `DiagnosticoConcluido` | Pixel no navegador | Primeiro diagnóstico concluído com sucesso pela conta                                      | Uma vez por conta, considerando todos os tipos de diagnóstico |
| `Purchase`             | Conversions API    | Primeiro pagamento confirmado que ativa cada contrato/assinatura                           | Uma vez por contrato                                          |

Renovações, parcelas posteriores, reembolsos, estornos e eventos `PAYMENT_RECEIVED` não geram uma nova conversão de aquisição. Um novo contrato pode gerar sua própria primeira compra.

### 2.2 Rotas do `PageView`

O rastreamento será explícito e limitado às rotas do funil:

- `/`
- `/register`
- `/onboarding`
- `/quick-diagnosis`
- `/reports/[id]`
- `/billing`
- `/billing/return`

Rotas administrativas, páginas de conta, bônus, endpoints de API e rotas contendo tokens de autenticação ou confirmação ficam fora do rastreamento. Não haverá rastreamento automático global de todas as rotas.

### 2.3 Modelo híbrido

- O navegador envia `PageView`, `CompleteRegistration` e `DiagnosticoConcluido`.
- O servidor envia `Purchase` pela Conversions API.
- O `Purchase` usa Supabase Queues, Cron e Edge Function para não bloquear nem acoplar o webhook do Asaas à disponibilidade da Meta.
- O mesmo identificador opaco e estável é reutilizado em cada tentativa do evento para permitir deduplicação.

## 3. Arquitetura

A implementação será separada em cinco responsabilidades:

1. **Consentimento:** registra a escolha versionada de cookies e fornece o estado inicial ao frontend.
2. **Adaptador do Pixel:** é o único módulo autorizado a carregar o script e chamar `fbq`.
3. **Marcos de conversão:** registra eventos idempotentes, sem interferir na transação principal.
4. **Entrega de compras:** publica e processa mensagens assíncronas para a Conversions API.
5. **Configuração por ambiente:** valida flags, identificadores, segredo, modo de teste e data de ativação.

O banco de dados é a fonte de verdade dos marcos de conversão. Cookies temporários do navegador funcionam apenas como indicação de que pode haver um evento pendente; eles não substituem os registros persistidos.

## 4. Consentimento e LGPD

### 4.1 Categorias

O gerenciador terá apenas duas categorias:

- **Necessários:** sempre ativos, pois sustentam autenticação, segurança e funcionamento do produto.
- **Publicidade:** opcional e desativada até uma decisão afirmativa.

Aceitar e recusar terão destaque equivalente. Não haverá caixa previamente marcada, consentimento tácito nem bloqueio do produto quando publicidade for recusada.

### 4.2 Persistência da preferência

A preferência será gravada pelo servidor em cookie próprio com:

- versão do modelo de consentimento;
- decisão sobre publicidade;
- data da decisão;
- validade de seis meses;
- `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção.

O servidor lerá a preferência antes de renderizar o componente de rastreamento. Uma versão desconhecida ou um cookie inválido equivalem a consentimento ainda não concedido.

Para visitantes anônimos, o cookie é a única fonte local da decisão. Para usuários autenticados, o endpoint de preferências também espelha no banco privado a versão, a decisão vigente e a data. Essa cópia permite respeitar uma revogação ocorrida entre o checkout e a confirmação assíncrona do pagamento. O estado mais restritivo prevalece: ausência de consentimento atual no servidor impede um novo envio pela Conversions API, mesmo que exista uma fotografia antiga de atribuição.

Uma alteração futura da versão exigirá nova decisão. Um controle permanente de “Preferências de cookies” permitirá rever a escolha. Ao revogar publicidade, o sistema interromperá novos envios e tentará remover `_fbp` e `_fbc` do domínio atual.

O painel administrativo não exibirá o banner e não carregará rastreamento publicitário.

### 4.3 Documentos legais

`LEGAL_COPY_VERSION` passará para `terms-privacy-v2`. A mudança fará clientes existentes aceitarem a nova versão uma vez pelo fluxo legal já existente. A escolha de cookies continuará independente dessa aceitação e poderá ser recusada sem impedir o acesso ao produto.

A Política de Privacidade deverá explicar, em linguagem clara:

- uso do Pixel da Meta e da Conversions API;
- finalidades de mensuração e atribuição de campanhas;
- categorias de dados enviadas;
- uso de identificadores `_fbp` e `_fbc` quando disponíveis;
- possibilidade de envio do e-mail normalizado e convertido em SHA-256;
- dados técnicos que o Pixel recebe no navegador, como IP, agente do usuário, URL atual e referência de navegação;
- transferência e tratamento por fornecedor externo;
- forma de recusar ou revogar o consentimento;
- retenção aplicável aos registros internos de telemetria.

Os termos comerciais não terão suas regras alteradas; a versão conjunta muda porque a política de privacidade será atualizada.

## 5. Pixel no navegador

### 5.1 Carregamento

O adaptador do Pixel somente será renderizado quando, simultaneamente:

- a rota não pertencer ao painel administrativo;
- houver consentimento válido para publicidade;
- a configuração do ambiente estiver completa e ativa;
- a data atual for igual ou posterior à data de ativação configurada.

O carregamento e as chamadas serão defensivos. Ausência de `fbq`, bloqueio do script ou exceção da biblioteca não poderão interromper a interface.

Eventos automáticos, detecção automática de botões/formulários e correspondência avançada automática ficarão desativados. Somente os quatro eventos definidos nesta especificação serão emitidos. Como o Pixel recebe a URL atual por natureza, o classificador também recusará um `PageView` quando houver parâmetros de consulta fora de uma lista explícita e segura; tokens, e-mail e valores informados pelo cliente nunca serão incluídos como parâmetros personalizados.

### 5.2 `PageView` em aplicação SPA

O adaptador enviará um `PageView`:

- na primeira renderização de uma rota permitida;
- uma vez após cada navegação lógica do App Router para uma rota permitida;
- para a rota atual, uma única vez, se o visitante aceitar publicidade durante a sessão.

Mudanças de renderização, parâmetros internos ou reexecuções de efeitos não podem duplicar a mesma visualização lógica.

### 5.3 Eventos autenticados pendentes

Após o sucesso real de cadastro ou do primeiro diagnóstico, o servidor tentará registrar um marco idempotente com UUID opaco. Essa operação acontece depois da regra de negócio e em tratamento isolado: falhas serão registradas de forma sanitizada, sem alterar a resposta principal.

Para eventos do navegador:

1. o banco mantém o evento como pendente e é a fonte de verdade;
2. um cookie `HttpOnly` temporário armazena até quatro referências opacas pendentes para despertar o cliente;
3. o componente global consulta um endpoint interno autenticado;
4. o endpoint valida usuário, consentimento, validade e propriedade do marco;
5. o navegador envia o evento usando o UUID persistido como `eventID`;
6. somente após o envio, o cliente confirma o evento em um endpoint interno;
7. se o envio ocorrer e a confirmação falhar, a nova tentativa reutiliza o mesmo `eventID`.

Os detalhes permanecem exclusivamente no banco. Marcos do navegador expiram após sete dias. Ao recusar publicidade, o cookie é removido e os marcos pendentes do navegador são descartados; eles não serão enviados retroativamente se o usuário aceitar meses depois.

O payload do navegador não conterá e-mail, identificador interno do usuário, respostas do diagnóstico, resultados financeiros ou outros dados do produto.

## 6. Regras dos marcos

### 6.1 `CompleteRegistration`

O evento não ocorre no envio do formulário. Ele somente é criado quando:

- o cadastro já produz uma sessão autenticada utilizável; ou
- o usuário conclui com sucesso a confirmação do e-mail.

Tentativas de cadastro, contas já existentes, respostas ambíguas do provedor ou cadastros que ainda aguardam confirmação não contam como conversão.

### 6.2 `DiagnosticoConcluido`

O evento é criado depois que um diagnóstico foi persistido com sucesso. A unicidade é por conta, abrangendo diagnósticos rápidos, detalhados, de produto, produção e serviço. A categoria específica pode ser mantida apenas internamente para diagnóstico operacional; não será enviada no payload publicitário.

### 6.3 `Purchase`

O evento representa o primeiro pagamento confirmado que ativa um contrato. A confirmação segue as regras locais já existentes do Asaas e do banco; a Meta nunca decide o estado da assinatura.

O valor será o total contratado em `billing_contracts.amount_cents`, convertido para unidade monetária, com moeda `BRL`. Não será usado apenas o valor de uma parcela quando o contrato representar um total maior.

## 7. Atribuição da compra

No início do checkout, se publicidade estiver consentida, o servidor armazenará uma fotografia privada de atribuição contendo somente:

- versão e data do consentimento;
- `_fbp` e `_fbc`, se presentes e válidos;
- origem permitida do checkout;
- referências internas do usuário e do contrato;
- datas necessárias para auditoria e expiração.

Não serão armazenados nesse registro respostas de diagnóstico, dados de cartão ou dados bancários.

No envio do `Purchase`, a Edge Function incluirá, quando disponíveis:

- e-mail normalizado e convertido em SHA-256;
- `_fbp` e `_fbc` capturados.

O e-mail será normalizado e convertido em hash apenas durante a construção do envio; o hash não será persistido. IP e agente do usuário não serão capturados para a Conversions API na primeira versão. Isso não altera os dados técnicos que o próprio Pixel recebe do navegador e que serão declarados na política.

Sem consentimento válido no checkout, não haverá fotografia de atribuição nem enfileiramento posterior para a Meta, ainda que o pagamento seja confirmado. Se o consentimento for revogado depois do checkout e antes da entrega, a fotografia será descartada e o marco será encerrado como suprimido, sem envio.

## 8. Persistência e segurança

### 8.1 Estruturas privadas

As tabelas, funções e filas ficarão em estruturas privadas, não acessíveis diretamente por `anon` ou `authenticated`. O desenho lógico inclui:

- preferência versionada de publicidade para contas autenticadas;
- fotografia de atribuição vinculada ao contrato;
- marcos idempotentes de conversão;
- histórico sanitizado de tentativas de entrega e falhas finais;
- fila de entrega de `Purchase`.

Os marcos terão restrições de unicidade equivalentes a:

- `(user_id, event_name)` para cadastro e primeiro diagnóstico;
- `(contract_id, event_name)` para compra.

Campos sensíveis e identificadores de atribuição terão retenção limitada e não aparecerão em logs:

- pendências do navegador expiram em sete dias;
- fotografias sem compra elegível expiram em 30 dias;
- `_fbp` e `_fbc` são removidos após entrega, supressão ou expiração da fotografia;
- histórico de tentativas conserva apenas metadados sanitizados por 180 dias;
- o marco mínimo de unicidade permanece enquanto a conta ou o contrato correspondente existir, sem dados de correspondência da Meta.

A migração definirá índices para seleção de pendências, expiração e reconciliação, evitando índices redundantes.

### 8.2 Funções privilegiadas

Funções `security definer`, se necessárias, terão:

- `search_path` vazio e referências totalmente qualificadas;
- privilégios revogados de `PUBLIC`, `anon` e `authenticated` por padrão;
- concessão apenas ao papel de serviço estritamente necessário;
- entradas validadas e comportamento idempotente.

O token da Conversions API e a service role nunca serão enviados ao navegador. Endpoints autenticados de claim e confirmação somente poderão operar nos marcos do usuário atual.

## 9. Entrega assíncrona do `Purchase`

### 9.1 Registro e reconciliação

Depois que o processamento local do webhook confirmar e aplicar o pagamento, uma etapa secundária e idempotente tentará registrar o marco `Purchase` e publicar sua referência na fila. Essa etapa não faz parte da transação que concede acesso e não muda a resposta do webhook em caso de falha.

Como garantia de convergência, um job periódico buscará contratos elegíveis, posteriores à ativação, com fotografia de atribuição ainda válida e ainda sem marco de compra. Ele registrará ou enfileirará os itens ausentes de forma idempotente. Assim, uma falha entre a confirmação local e a publicação não perde definitivamente a conversão.

### 9.2 Processamento

Uma Edge Function consumirá mensagens da fila em lotes pequenos. Para cada referência, ela reconstruirá e validará o payload no servidor, sem confiar em um corpo completo gravado na mensagem. Antes do envio, verificará novamente a configuração, o corte de ativação, a fotografia ainda válida e o consentimento autenticado vigente. Revogação ou expiração encerra a mensagem como suprimida, não como erro repetível.

O payload terá:

- `event_name: Purchase`;
- `event_id`: UUID estável do marco;
- `event_time`: momento da confirmação que ativou o contrato;
- `action_source: website`;
- `currency: BRL`;
- `value`: total contratado;
- dados de correspondência autorizados pelo consentimento.

Sucesso confirma a mensagem e marca o marco como entregue. Falhas transitórias permanecem disponíveis para nova tentativa com espera progressiva. Falhas permanentes ou mensagens que excederem o limite de tentativas serão arquivadas com motivo sanitizado para inspeção e reprocessamento controlado.

O job de reconciliação e o consumidor respeitarão tanto a unicidade quanto a data de ativação. Não haverá backfill de compras anteriores à ativação.

## 10. Configuração por ambiente

O projeto será entregue desativado e preparado para configuração posterior. A validação será centralizada e falhará de forma fechada.

Configurações previstas:

- `META_PIXEL_ID`: identificador público do Pixel, fornecido ao cliente somente quando ativo;
- `META_TRACKING_ENABLED_AT`: instante explícito de ativação e corte de eventos;
- `META_CAPI_ACCESS_TOKEN`: segredo exclusivo do ambiente de execução da Edge Function;
- `META_CAPI_TEST_EVENT_CODE`: código opcional usado apenas na validação de staging;
- `META_PIXEL_ENABLED`: habilita o canal do navegador;
- `META_CAPI_ENABLED`: habilita o canal do servidor.

A versão da Graph API será fixada em código e atualizada deliberadamente, com teste, em vez de variar implicitamente por ambiente.

Configuração ausente, inválida ou parcialmente preenchida mantém o respectivo canal desativado. Nenhum placeholder será interpretado como credencial válida.

## 11. Falhas e observabilidade

- Erros do Pixel ficam restritos ao adaptador e não aparecem para o usuário.
- Erros ao registrar telemetria não desfazem cadastro, diagnóstico, pagamento ou acesso.
- Indisponibilidade da Meta mantém mensagens de compra para nova tentativa.
- Logs contêm UUID do marco, tipo de evento, tentativa, código de resposta e categoria de erro; não contêm token, e-mail, `_fbp`, `_fbc` ou corpo integral da requisição.
- Métricas mínimas incluem pendências, idade da mensagem mais antiga, sucessos, novas tentativas e falhas arquivadas.
- Alertas operacionais serão definidos para fila parada, crescimento anormal e falhas permanentes.

## 12. Testes de aceitação

### 12.1 Consentimento e navegador

- Nenhuma requisição à Meta ocorre antes do consentimento.
- Aceitar carrega o Pixel e envia somente o `PageView` da rota atual.
- Recusar não bloqueia cadastro, diagnóstico, cobrança nem uso do produto.
- Revogar interrompe novos eventos e remove cookies próprios da Meta quando tecnicamente possível.
- Consentimento antigo ou inválido solicita nova escolha.
- Navegações SPA em rotas permitidas produzem um único `PageView`.
- Rotas excluídas, inclusive tokens de autenticação e admin, nunca geram `PageView`.
- Bloqueio do script não causa erro funcional ou visual.

### 12.2 Cadastro e diagnóstico

- Cadastro com sessão imediata gera uma única pendência.
- Cadastro aguardando e-mail não gera evento antes da confirmação.
- Confirmação válida gera uma única pendência, mesmo se a rota for repetida.
- Conta existente ou tentativa inválida não gera conversão.
- O primeiro diagnóstico persistido gera evento; diagnósticos seguintes de qualquer tipo não geram outro.
- Sem consentimento, pendências do navegador não são entregues e são descartadas após decisão negativa ou expiração.
- Nova tentativa de entrega reutiliza o mesmo `eventID`.

### 12.3 Compra e CAPI

- Pagamento pendente não gera `Purchase`.
- A primeira confirmação que ativa o contrato usa o total contratado e `BRL`.
- Webhook duplicado não duplica marco ou mensagem.
- Renovação, parcela posterior e `PAYMENT_RECEIVED` não geram nova compra.
- Contrato sem consentimento de publicidade não gera mensagem.
- Falha ao publicar telemetria não altera a confirmação local nem o acesso.
- Falha transitória da Meta é repetida; falha permanente é arquivada de forma sanitizada.
- Reconciliação recupera marco ausente sem duplicar os existentes.
- Eventos anteriores ao corte de ativação não são enviados.

### 12.4 Regressão

A suíte atual de autenticação, diagnósticos, aceite legal, checkout, webhook, contratos e controle de acesso deverá continuar passando. Serão adicionados testes unitários dos adaptadores, testes de integração das funções/RPCs e testes ponta a ponta dos caminhos críticos de consentimento.

## 13. Implantação e rollback

1. Aplicar estruturas privadas, funções, fila, job e código com todos os canais desativados.
2. Publicar a nova política, o banner e as preferências ainda sem carregar o Pixel.
3. Configurar Pixel, token, código de teste e data de ativação em staging.
4. Validar o funil completo em “Test Events” da Meta, incluindo deduplicação e recusas.
5. Configurar segredos e corte de ativação em produção.
6. Habilitar navegador e servidor separadamente.
7. Fazer uma validação real controlada e monitorar fila e falhas.

O rollback normal consiste em desabilitar as flags de navegador e servidor. As regras de negócio permanecem intactas, e as estruturas de telemetria podem ficar instaladas para auditoria. Mensagens não deverão ser descartadas automaticamente durante uma pausa operacional; a decisão de reprocessá-las respeitará consentimento e data de ativação.

## 14. Documentação de operação

A implementação atualizará:

- `.env.example`, sem credenciais reais;
- guia de configuração do Pixel e da Conversions API;
- instruções de criação e armazenamento do token;
- procedimento de staging com código de teste;
- verificação no Meta Events Manager;
- monitoramento, reprocessamento e rollback;
- matriz de eventos, rotas e dados enviados.

## 15. Fora de escopo

- Google Tag Manager ou outras plataformas de analytics;
- rastreamento de páginas administrativas e uso interno do produto;
- envio de respostas, notas ou conteúdo de diagnósticos;
- eventos de renovação, reembolso, estorno ou cancelamento para a Meta;
- backfill de cadastros, diagnósticos ou compras históricos;
- configuração de campanhas, públicos ou conversões personalizadas no gerenciador da Meta;
- correspondência avançada além de e-mail em SHA-256, `_fbp` e `_fbc`;
- uso de IP ou agente do usuário na primeira versão;
- mudanças nas regras comerciais, de cobrança ou de acesso.

## 16. Critério de conclusão

A integração estará pronta quando os eventos aprovados forem enviados somente após consentimento válido, com unicidade e rotas corretas, o `Purchase` sobreviver a falhas temporárias sem interferir no Asaas, a documentação legal e operacional estiver atualizada e toda a suíte de regressão continuar aprovada.
