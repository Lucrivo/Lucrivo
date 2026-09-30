# Assistente de IA dos relatórios — runbook operacional

Este runbook cobre a configuração, observabilidade e resposta a incidentes do
Assistente Lucrivo. O assistente explica o snapshot validado de um relatório;
ele não recalcula resultados nem executa ações no negócio.

## 1. Segredos e configuração

Configure estas variáveis somente no ambiente do servidor:

```text
OPENAI_API_KEY=
OPENAI_REPORT_ASSISTANT_MODEL=gpt-6-luna
```

`OPENAI_API_KEY` é obrigatória. O modelo usa `gpt-6-luna` por padrão e pode ser
alterado por ambiente com `OPENAI_REPORT_ASSISTANT_MODEL`. Nenhuma dessas
variáveis pode receber o prefixo `NEXT_PUBLIC_`, aparecer em logs, fixtures ou
commits.

A aplicação falha de forma fechada quando a configuração está ausente ou
inválida. Depois de alterar uma variável, faça um novo deploy para que todos os
processos recebam a configuração atual.

## 2. Preparação local

Use um projeto OpenAI exclusivo para desenvolvimento, com limite de gasto
baixo. Nunca copie uma chave de produção para `.env.local`.

1. Inicie e reconstrua a stack local com `pnpm supabase:start` e
   `pnpm supabase:reset`.
2. Use um usuário do seed que possua assinatura paga ativa.
3. Preencha `OPENAI_API_KEY` e, se necessário,
   `OPENAI_REPORT_ASSISTANT_MODEL` em `.env.local`.
4. Execute `pnpm dev`, abra um relatório desse usuário e envie uma pergunta
   curta e específica sobre os números exibidos.

Os testes automatizados usam clientes OpenAI falsos e não consomem a API.

## 3. Limites de uso

Os limites iniciais são:

- 2.000 caracteres por pergunta;
- 800 tokens de saída por resposta;
- dez reservas por usuário em uma janela móvel de um minuto;
- 100 reservas por usuário em cada mês calendário UTC;
- uma geração simultânea por conversa;
- 60 segundos de timeout para o provedor.

Reenvios idempotentes do mesmo `requestId` não reservam uma segunda cota. Uma
reserva só deixa de contar quando o servidor consegue provar que a requisição
não chegou ao provedor. Resultados incertos, timeouts e desconexões depois do
aceite continuam contabilizados.

## 4. Monitoramento de custo

Agregue mensalmente, em UTC, as colunas `input_tokens`,
`cached_input_tokens` e `output_tokens` de `report_ai_turns`, agrupadas por
`model`. Mantenha separadas as três contagens: preços e descontos de cache podem
mudar e devem ser aplicados fora do caminho crítico conforme a tabela vigente
do provedor.

Compare o consumo com:

- quantidade de turnos concluídos e falhos;
- usuários ativos e usuários que atingiram o limite mensal;
- distribuição de tokens por resposta;
- chamadas extras de compactação, já somadas ao turno que as originou.

Não exporte perguntas, respostas, snapshots ou prompts para a ferramenta de
custos.

## 5. Alertas

Configure alertas por taxa e por volume absoluto para:

- erros do provedor (`provider_rejected`, `provider_timeout` e
  `provider_unavailable`);
- timeouts e leases vencidos (`generation_lease_expired`);
- falhas de persistência (`persistence_failed`);
- crescimento da taxa de `monthly_limit`;
- aumento abrupto de tokens por turno ou por modelo.

Use IDs técnicos, código de erro, modelo, latência e contagens de tokens. Nunca
inclua conteúdo da conversa ou erros brutos do SDK.

## 6. Resposta a incidentes

Quando houver risco de custo, privacidade ou respostas incorretas:

1. Remova ou desative `OPENAI_API_KEY` no ambiente de deploy; alternativamente,
   defina um modelo indisponível para forçar o caminho fechado enquanto a chave
   é preservada para investigação.
2. Faça um novo deploy e confirme que novas perguntas retornam falha segura.
3. Não remova o endpoint de leitura nem as tabelas: o histórico existente deve
   continuar disponível.
4. Investigue por IDs, códigos, latência e métricas agregadas, sem consultar ou
   copiar conteúdo salvo salvo quando houver autorização formal e necessidade
   operacional documentada.
5. Depois da correção, restaure a configuração e execute um smoke test com um
   usuário pago de desenvolvimento.

## 7. Rotação da chave

1. Crie uma nova chave server-side no projeto OpenAI correto.
2. Substitua `OPENAI_API_KEY` no gerenciador de segredos, sem imprimir o valor.
3. Faça o redeploy de todos os processos.
4. Revogue a chave anterior.
5. Execute uma única pergunta curta com um usuário pago e confirme streaming e
   persistência após recarregar a página.

Registre somente resultado, ambiente, ID do relatório, ID do turno e latência.

## 8. Privacidade

Todas as chamadas usam a Responses API com `store: false`. Esse parâmetro não
deve ser descrito como garantia de retenção zero: políticas da conta e controles
de abuso do provedor ainda se aplicam.

Nunca registre chaves, perguntas, respostas, snapshots, prompts completos ou
erros brutos. O contexto enviado deve conter apenas a projeção segura do
snapshot validado, o resumo acumulado, até dez turnos recentes e a pergunta
atual. O assistente não possui busca web, ferramentas, anexos ou acesso a outros
relatórios.

## 9. Rollback

Em um rollback funcional, remova primeiro o ponto de entrada da interface ou
desabilite a configuração do provedor. Preserve os endpoints de leitura e o
histórico existente.

Não elimine `report_ai_conversations` nem `report_ai_turns` durante o rollback.
As migrations de remoção, se algum dia forem necessárias, exigem plano próprio
de retenção, exportação e aprovação.

## Checklist de aceite local

Com uma chave de desenvolvimento e a stack local:

1. Abra o relatório de um usuário pago em largura desktop e mobile.
2. Envie uma pergunta específica e observe texto progressivo.
3. Recarregue e confirme a resposta persistida.
4. Edite o relatório e confirme que a versão anterior fica somente para
   leitura.
5. Remova o acesso pago local e confirme que o histórico permanece visível e o
   compositor fica bloqueado.
6. Confirme que outro usuário recebe `not_found` ao tentar consultar a URL da
   conversa.
7. Inspecione a saída da aplicação e confirme que nenhum prompt, resposta ou
   segredo foi registrado.

Registre somente passa/falha, IDs e latência. Não cole conteúdo de conversa no
repositório, logs ou tickets.
