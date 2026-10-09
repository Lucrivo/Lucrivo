# Acesso pago ao diagnóstico detalhado

**Data:** 2026-10-08

**Status:** Implementado

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md`
- `docs/superpowers/specs/2026-09-17-detailed-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`
- `docs/superpowers/specs/2026-10-08-billing-refunds-and-plan-pricing-design.md`

## 1. Objetivo

Reservar a criação de diagnósticos detalhados para clientes com acesso pago ou
cortesia vigente, mantendo no plano gratuito exatamente um diagnóstico rápido.
A interface deve informar a restrição antes de o cliente preencher o formulário
detalhado, oferecer a assinatura sem uma surpresa tardia e preservar a intenção
de Produto ou Produção durante a passagem pelo Checkout.

A entrega também remove o rótulo visual `Diagnóstico salvo` da biblioteca. Todo
card da biblioteca já representa um relatório persistido, e o ícone de dinheiro
usado no rótulo cria uma associação indevida com cobrança.

## 2. Regras de produto

### 2.1 Benefício gratuito

O benefício gratuito passa a significar explicitamente **um diagnóstico
rápido**:

- Serviço continua oferecendo somente a modalidade rápida;
- Produto e Produção oferecem rápida e detalhada, mas a detalhada exige acesso
  pago ou cortesia vigente;
- o primeiro diagnóstico rápido do usuário é gratuito, mesmo quando criado
  durante um período de acesso pago;
- um diagnóstico detalhado criado durante o plano nunca consome o diagnóstico
  rápido gratuito;
- depois do fim do plano, o cliente ainda pode usar seu diagnóstico rápido
  gratuito caso nunca o tenha criado;
- excluir o relatório rápido gratuito não restaura o benefício;
- novos diagnósticos rápidos depois do gratuito exigem acesso pago ou cortesia
  vigente.

As regras de leitura histórica não mudam: relatórios criados dentro de um
intervalo de contrato continuam consultáveis depois do término desse intervalo.

### 2.2 Diagnóstico detalhado

Uma nova criação detalhada exige que
`private.has_report_entitlement_for_user(caller_id, statement_timestamp())`
seja verdadeira. A checagem vale para Produto e Produção e ocorre no banco,
independentemente do estado apresentado pela interface.

Um relatório detalhado novo sempre recebe `is_free_report = false`. O banco usa
um erro específico, `paid_access_required`, quando o payload é válido, mas o
usuário não possui acesso. O erro `free_report_limit_reached` continua reservado
à tentativa de criar outro diagnóstico rápido sem acesso vigente.

Repetir uma submissão detalhada idempotente já concluída continua retornando o
mesmo identificador. A exigência de acesso aplica-se à criação de um registro
novo, não à recuperação do resultado de uma operação já persistida.

### 2.3 Cortesia

Cortesia administrativa vigente continua concedendo as mesmas permissões de
criação que o acesso pago, inclusive diagnóstico detalhado. Ela não é
apresentada como assinatura nem gera cobrança. Esta entrega não altera a regra
de leitura depois do fim da cortesia.

### 2.4 Compatibilidade com relatórios existentes

Relatórios detalhados antigos marcados como `is_free_report = true` são
anteriores à nova regra. Eles permanecem legíveis e não são reclassificados nem
apagados, mas deixam de contar como utilização do diagnóstico rápido gratuito.

Para permitir essa compatibilidade:

- a unicidade do benefício gratuito passa a considerar
  `is_free_report = true and analysis_mode = 'quick'`;
- as funções de criação rápida verificam somente a existência de um relatório
  gratuito rápido do mesmo usuário;
- a leitura continua aceitando qualquer relatório legado com
  `is_free_report = true`;
- a migração não altera snapshots, datas, propriedade ou relações normalizadas
  dos relatórios existentes.

Assim, um usuário com um detalhado gratuito legado pode conservar esse relatório
e ainda criar seu único diagnóstico rápido gratuito.

## 3. Jornada do cliente

### 3.1 Remoção de `Diagnóstico salvo`

O rodapé dos cards rápidos deixa de exibir `CircleDollarSignIcon` e
`Diagnóstico salvo`. Cards rápidos e detalhados mantêm somente a ação
`Abrir relatório`, usando o mesmo alinhamento. Nenhum substituto é necessário.

A alteração não depende de plano, gratuidade, veredito ou categoria e não muda
o conteúdo do relatório.

### 3.2 Seleção da modalidade

O card `Diagnóstico detalhado` comunica que a modalidade faz parte dos planos.
O texto deve ser curto e não reduzir a legibilidade do controle. O estado não
usa somente cor ou ícone para comunicar a restrição.

Ao selecionar a modalidade:

- com acesso pago ou cortesia vigente, o wizard detalhado começa normalmente;
- sem acesso vigente, a seleção abre um diálogo e não inicializa o formulário
  detalhado;
- fechar o diálogo mantém o cliente na escolha entre rápida e detalhada;
- escolher a alternativa gratuita seleciona ou mantém `Diagnóstico rápido`;
- escolher os planos registra a intenção e navega para `/billing`.

O bloqueio antecipado evita que o cliente preencha um formulário longo antes de
descobrir a necessidade de pagamento. Não haverá um paywall deliberadamente
adiado até `Gerar diagnóstico detalhado`.

### 3.3 Diálogo de upgrade

O diálogo reutiliza o componente modal e a linguagem já usados no gerenciamento
de relatórios. Conteúdo-base:

- título: `Diagnóstico detalhado faz parte dos planos`;
- descrição: explica que o plano permite analisar vários itens no mesmo
  diagnóstico e que o diagnóstico rápido gratuito continua disponível;
- ação secundária: `Continuar no diagnóstico rápido`;
- ação principal: `Conhecer os planos`.

O foco entra no diálogo, retorna ao controle que o abriu quando ele for fechado
e todas as ações funcionam por teclado. A ação principal não inicia o Checkout
diretamente: ela leva à página de planos para que modalidade, preço e forma de
pagamento permaneçam escolhas explícitas.

### 3.4 Preservação da intenção e retorno do Checkout

Como o bloqueio ocorre antes do formulário, nenhum valor financeiro precisa ser
persistido. O navegador salva apenas uma intenção versionada em
`sessionStorage`, contendo:

- versão do formato;
- identificador do usuário autenticado;
- categoria `product` ou `production`;
- instante de criação.

A intenção expira depois de duas horas, é ignorada para outro usuário, aceita
somente as duas categorias permitidas e é removida depois que a retomada começa.
Dados inválidos ou armazenamento indisponível resultam no fluxo normal, sem
impedir o uso da aplicação.

Quando o retorno do Checkout já observar acesso pago confirmado, a ação
principal passa a ser `Continuar diagnóstico detalhado`. Um pequeno componente
cliente lê a intenção e produz uma URL interna controlada para
`/quick-diagnosis`; a rota valida novamente o acesso e a categoria antes de
iniciar o wizard detalhado.

Se o webhook ainda não tiver confirmado o pagamento, a tela continua no estado
de espera existente. A intenção permanece disponível enquanto estiver dentro do
prazo. Retorno cancelado ou expirado não concede acesso e não inicia o wizard.

### 3.5 Mudança de acesso durante o preenchimento

O banco volta a verificar o acesso no instante da criação. Se uma sessão paga
expirar depois que o formulário detalhado já foi aberto, a submissão recebe
`paid_access_required` e abre o mesmo diálogo de upgrade sem gerar relatório.
Os dados continuam no estado React enquanto o cliente permanecer na página.

Esta versão não persiste o formulário detalhado completo através do Checkout.
Salvar dados financeiros no navegador ou criar rascunhos no servidor fica fora
do escopo porque o bloqueio antecipado elimina esse caso na jornada normal.

### 3.6 Usuário que já consumiu o rápido gratuito

O estado existente de limite continua substituindo o wizard quando o usuário
não tem acesso vigente e já utilizou o diagnóstico rápido gratuito. Seu texto
deve mencionar que novos diagnósticos rápidos e qualquer diagnóstico detalhado
exigem um plano, mantendo `Conhecer os planos` como ação principal.

## 4. Arquitetura e autorização

### 4.1 Visão de cobrança

`BillingOverview` passa a expor capacidades com semântica explícita:

- `canCreateQuickDiagnosis`: acesso vigente ou benefício rápido ainda não usado;
- `canCreateDetailedDiagnosis`: acesso pago ou cortesia vigente;
- `freeQuickDiagnosisUsed`: existência histórica de relatório com
  `is_free_report = true` e `analysis_mode = 'quick'`.

O nome genérico `canCreateDiagnosis` e `freeReportUsed` deve ser removido ou
migrado em todos os consumidores para impedir que modalidades diferentes voltem
a compartilhar uma autorização ambígua.

A consulta do benefício gratuito inclui registros excluídos, preservando a regra
de que soft delete não devolve o benefício.

### 4.2 Banco de dados

O projeto usa migrações imperativas. A implementação cria uma nova migração e
não edita arquivos já aplicados.

A migração:

1. substitui o índice parcial global de relatório gratuito por um índice único
   parcial de relatório rápido gratuito;
2. recria as implementações efetivas dos RPCs rápidos para calcular gratuidade
   somente entre diagnósticos rápidos;
3. recria a implementação efetiva de
   `private.create_detailed_diagnosis_report_impl` para exigir entitlement e
   inserir `is_free_report = false`;
4. preserva assinaturas públicas, `SECURITY INVOKER` dos wrappers,
   `SECURITY DEFINER` estritamente necessário das implementações privadas,
   `search_path = ''`, revogações e grants existentes;
5. mantém o advisory lock por usuário para serializar disputas pelo benefício
   gratuito;
6. não altera a função de leitura histórica nem as políticas RLS existentes.

Todas as relações permanecem qualificadas. A autorização deriva de `auth.uid()`
e nunca aceita um `user_id` enviado pelo cliente. A interface é somente uma
antecipação de UX; chamadas diretas continuam protegidas pelo banco.

### 4.3 Serviços e ações

O serviço de criação detalhada mapeia exclusivamente
`P0001/paid_access_required` para um resultado de plano necessário. Outros
erros, mesmo com mensagem semelhante, continuam sendo falha de criação.

A action preserva validação determinística, autenticação e erros de campos antes
de delegar a persistência. O wizard trata o novo resultado abrindo o diálogo de
upgrade. Os serviços rápidos continuam mapeando
`P0001/free_report_limit_reached` para o limite gratuito.

O servidor fornece as duas capacidades ao wizard. Parâmetros de retomada vindos
da URL não concedem permissão e são ignorados quando
`canCreateDetailedDiagnosis` for falso.

## 5. Estados e falhas

- Falha ao ler cobrança continua impedindo a renderização de uma autorização
  potencialmente incorreta.
- Falha ao usar `sessionStorage` não bloqueia seleção, assinatura ou criação;
  apenas remove a retomada automática.
- Intenção expirada, pertencente a outro usuário ou malformada é descartada.
- Callback do Checkout não concede acesso; somente o estado confirmado pelo
  servidor habilita a continuação.
- Duplo clique no diálogo ou na submissão não cria checkouts nem relatórios
  duplicados.
- A criação detalhada sem acesso não deixa linhas parciais em `diagnoses`,
  `detailed_diagnoses`, itens ou ingredientes.
- O comportamento responsivo e o suporte a movimento reduzido seguem os
  componentes existentes.

## 6. Testes e verificação

### 6.1 Banco

Os testes pgTAP devem provar que:

- usuário sem acesso não cria um primeiro diagnóstico detalhado;
- acesso pago e cortesia vigente permitem diagnóstico detalhado;
- diagnóstico detalhado novo nunca recebe `is_free_report = true`;
- criar detalhado durante acesso vigente não consome o rápido gratuito;
- depois do fim do plano, esse usuário pode criar um rápido gratuito;
- uma segunda criação rápida sem acesso recebe `free_report_limit_reached`;
- detalhado gratuito legado continua legível e não bloqueia o rápido gratuito;
- soft delete do rápido gratuito não restaura o benefício;
- submissão detalhada recusada não deixa escrita parcial;
- permissões, RLS, idempotência e concorrência continuam válidas.

### 6.2 Serviços e interface

Testes unitários e de componentes devem cobrir:

- ausência de `Diagnóstico salvo` e do ícone de dinheiro em todos os cards;
- usuário gratuito continua podendo escolher e gerar a modalidade rápida;
- seleção detalhada sem acesso abre o diálogo e não inicia o wizard;
- acesso pago ou cortesia inicia o detalhado sem diálogo;
- CTA dos planos salva somente uma intenção válida;
- retorno confirmado oferece continuação na categoria correta;
- intenção expirada, inválida ou de outro usuário é ignorada;
- retorno pendente, cancelado ou expirado não inicia diagnóstico;
- perda de acesso durante o formulário abre o diálogo sem criar relatório;
- foco, teclado, textos de erro e layouts móvel/desktop permanecem funcionais.

### 6.3 Documentação

`PRODUCT.md`, documentação dos diagnósticos e especificações antigas que ainda
definem “primeiro relatório” como benefício gratuito devem receber uma nota de
substituição ou ser atualizadas para “primeiro diagnóstico rápido”. A página de
planos continua declarando `1 diagnóstico rápido` no gratuito e diagnósticos
detalhados ilimitados nos planos pagos.

## 7. Fora do escopo

- rascunho completo persistido no banco;
- sincronização de formulário entre dispositivos ou abas;
- armazenamento durável de valores financeiros antes da criação do relatório;
- prévia gratuita dos cálculos detalhados;
- Checkout dentro do diálogo;
- alteração de preço, forma de pagamento, reembolso ou cancelamento;
- mudança nas regras de leitura histórica de relatórios;
- redesign da página de planos ou do wizard completo.

## 8. Critérios de aceite

1. Nenhum usuário sem acesso pago ou cortesia vigente consegue criar um novo
   relatório detalhado, inclusive por chamada direta à RPC.
2. Todo usuário mantém direito a exatamente um diagnóstico rápido gratuito,
   independentemente de relatórios detalhados pagos ou legados.
3. A necessidade de plano é comunicada antes de qualquer preenchimento do
   formulário detalhado.
4. Após pagamento confirmado, a intenção válida permite retomar a categoria
   detalhada escolhida sem repetir a navegação inicial.
5. Relatórios existentes permanecem íntegros e consultáveis pelas regras atuais.
6. A biblioteca não exibe mais `Diagnóstico salvo` nem o ícone associado.
7. Banco, serviços, interface e documentação possuem cobertura automatizada
   proporcional às novas regras.
