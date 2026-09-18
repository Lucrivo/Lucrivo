# Gestão de relatórios e ajustes administrativos

**Data:** 2026-09-18

**Status:** Aprovado para revisão e planejamento

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md`
- `docs/superpowers/specs/2026-09-16-admin-dashboard-design.md`
- `docs/superpowers/specs/2026-09-16-admin-user-management-design.md`
- `docs/superpowers/specs/2026-09-17-detailed-diagnosis-design.md`

## 1. Objetivo

Permitir que o cliente continue consultando relatórios gerados durante uma
assinatura, navegue por todo o histórico e, enquanto possuir plano pago ativo,
edite os dados diretamente na página do relatório com recálculo imediato.

A entrega também permite substituir o relatório atual, salvar o resultado como
um novo relatório e excluir relatórios por soft delete. No painel
administrativo, corrige a lista de assinaturas recentes, persiste os filtros da
tabela de usuários e adiciona filtros operacionais mínimos ao dashboard.

O redesenho dos quatro KPIs do dashboard do cliente será uma iniciativa
posterior e não faz parte desta especificação.

## 2. Escopo

### 2.1 Incluído

- Manter legíveis os relatórios produzidos durante um intervalo de assinatura
  paga, mesmo depois do término do plano.
- Preservar a leitura do relatório gratuito do cliente.
- Permitir voltar por todas as páginas da biblioteca, inclusive até a primeira.
- Exibir a ação `Editar diagnóstico` nos relatórios compatíveis.
- Exigir plano pago ativo para editar, substituir ou salvar como novo.
- Apresentar um modal de upgrade quando o cliente sem plano pago ativo tentar
  editar.
- Editar diagnósticos rápidos e detalhados na própria página do relatório.
- Recalcular a simulação enquanto os campos válidos são alterados.
- Substituir atomicamente o registro atual quando o cliente escolher
  `Salvar alterações`.
- Criar outro registro e preservar o atual quando o cliente escolher
  `Salvar como novo relatório`.
- Excluir um relatório pertencente ao cliente por soft delete, mesmo sem plano
  pago ativo.
- Remover relatórios excluídos da biblioteca e impedir sua abertura pela rota
  de detalhe.
- Excluir tentativas de checkout que nunca concederam acesso da lista
  `Assinaturas recentes`.
- Adicionar filtros de período, modalidade e situação à lista de assinaturas do
  dashboard administrativo.
- Persistir busca, estado da conta e tipo de acesso da tabela administrativa de
  usuários em cookie.
- Manter a paginação existente da tabela administrativa de usuários.
- Atualizar documentação de produto que ainda declare todos os relatórios como
  imutáveis.
- Cobrir regras de banco, serviços, interface e navegação com testes.

### 2.2 Excluído

- Redefinição dos quatro KPIs do dashboard do cliente.
- Lixeira, restauração ou exclusão física de relatórios.
- Edição sem plano pago ativo.
- Edição de relatórios cujo snapshot antigo não contenha entradas suficientes
  para reconstruir o formulário com segurança.
- Edição pelo fluxo guiado de criação.
- Salvamento automático no servidor durante a digitação.
- Histórico visual das substituições de um mesmo relatório.
- Comparação entre versões.
- Alteração ampla das métricas ou dos gráficos do dashboard administrativo.

## 3. Decisões de produto

### 3.1 Leitura após o fim da assinatura

Um relatório não pago permanece visível quando existir um contrato do próprio
cliente cujo intervalo de acesso contenha o instante de criação do diagnóstico.
A autorização é histórica: ela considera quando o relatório foi produzido, não
se o cliente ainda possui acesso pago no momento da leitura.

O relatório gratuito continua legível independentemente de assinatura. O
relatório precisa pertencer ao usuário autenticado, a conta precisa continuar
elegível e o registro não pode estar excluído.

Tentativas de checkout, contratos sem intervalo de acesso e contratos de outro
usuário não concedem leitura histórica.

### 3.2 Edição e plano pago

A leitura histórica não concede direito de edição. A edição exige que um
contrato pago ativo cubra o instante da operação. Cortesia administrativa não é
tratada como plano pago para essa ação.

A interface pode informar antecipadamente que o cliente não possui plano, mas
a decisão autoritativa ocorre novamente no servidor e no banco no momento do
salvamento.

### 3.3 Substituir

`Salvar alterações` atualiza o mesmo diagnóstico e conserva seu identificador e
posição no histórico. A operação substitui, na mesma transação:

- entradas normalizadas específicas da categoria;
- snapshot completo do relatório;
- colunas resumidas usadas pela biblioteca e pelo admin;
- itens e ingredientes do diagnóstico detalhado;
- versões de schema, cálculo e conteúdo;
- instante de atualização.

A data original de criação não muda. O banco valida propriedade, conta
elegível, plano pago ativo, categoria compatível e coerência entre comando,
cálculo e snapshot antes de atualizar qualquer dado. Uma falha preserva o
relatório anterior por inteiro.

### 3.4 Salvar como novo

`Salvar como novo relatório` usa os dados editados para criar um novo
diagnóstico pela mesma validação determinística usada na criação normal. O
relatório de origem permanece inalterado e ambos aparecem na biblioteca.

O novo relatório não é gratuito e exige plano pago ativo, inclusive quando a
origem era o diagnóstico gratuito da conta. Identificadores de submissão são
novos para manter a idempotência.

### 3.5 Exclusão

`Excluir relatório` solicita confirmação e preenche `deleted_at` no registro
pertencente ao cliente. A operação não depende de assinatura, pois o cliente
deve poder organizar seus próprios dados depois do término do plano.

Registros excluídos não aparecem em consultas normais, não contam na biblioteca
do cliente e não podem ser abertos por URL direta. Dados relacionados continuam
armazenados para permitir recuperação administrativa futura, embora nenhuma
interface de restauração faça parte desta entrega.

Excluir o diagnóstico gratuito não restaura o benefício gratuito já utilizado.
A regra de gratuidade considera a utilização histórica, inclusive registros
com `deleted_at` preenchido.

## 4. Experiência do cliente

### 4.1 Biblioteca e paginação

A biblioteca mantém ordenação por criação decrescente e paginação por cursor.
Cada avanço acrescenta o cursor atual a uma pilha codificada e validada. A
navegação apresenta:

- `Primeira página` quando o cliente não está na primeira;
- `Anterior` quando existe histórico de cursores;
- `Próxima` quando a consulta informa mais resultados.

Uma URL com cursor ou pilha inválidos volta com segurança para a primeira
página. A pilha possui limite de tamanho para impedir URLs sem controle.

Relatórios excluídos são filtrados antes da aplicação do cursor para manter as
páginas consistentes.

### 4.2 Entrada no modo de edição

A página do relatório possui a ação `Editar diagnóstico` para snapshots atuais
que possam ser convertidos de volta em dados de formulário.

- Com plano pago ativo, a página entra no espaço de edição.
- Sem plano pago ativo, abre um modal com explicação curta, `Agora não` e
  `Ver planos`.
- Em relatório antigo incompatível, a ação fica indisponível com uma explicação
  de que o relatório continua legível, mas não contém todos os dados necessários
  para edição segura.

### 4.3 Espaço de edição

O relatório vira um espaço de trabalho responsivo sem enviar o cliente de volta
ao assistente passo a passo. Em telas largas, campos e resultado ocupam duas
colunas, com o resumo do resultado visível durante a edição. Em telas menores,
os campos aparecem primeiro e o resultado atualizado fica logo abaixo, sem
rolagem horizontal.

Os campos são agrupados conforme o contexto do diagnóstico:

- Serviço: objetivo mensal, gastos, forma e valor de cobrança, rotina,
  materiais e taxas.
- Produto rápido: preço, custo, gastos, volume, pró-labore e taxas.
- Produção rápida: preço, composição de custo, gastos, volume, pró-labore e
  taxas.
- Produto e Produção detalhados: dados gerais, itens, custos e ingredientes
  quando aplicável.

Os controles reutilizam rótulos, máscaras, limites e textos de ajuda dos fluxos
atuais. O modo detalhado permite adicionar, editar e remover itens e
ingredientes respeitando os mínimos já definidos.

### 4.4 Simulação em tempo real

Cada alteração atualiza um rascunho local. Depois de validar os campos
necessários, a interface usa os mesmos cálculos determinísticos do domínio para
reconstruir a prévia. Nenhuma gravação ocorre durante a digitação.

Campos inválidos exibem mensagens próximas ao controle e mantêm a última prévia
válida visível com indicação de que existem dados pendentes. Valores monetários
continuam representados como inteiros no domínio; conversões de texto ocorrem
somente nas bordas do formulário.

A prévia mostra primeiro os efeitos que ajudam a decisão: preço, margem,
resultado ou contribuição, veredito e prioridade. O relatório completo é
reconstruído no servidor ao salvar.

### 4.5 Salvamento e descarte

O rodapé do editor oferece:

- `Cancelar`, que descarta o rascunho local;
- `Salvar como novo relatório`;
- `Salvar alterações`, como ação principal.

As ações ficam desabilitadas durante o envio e não aceitam submissões
duplicadas. Depois de substituir, a página exibe o relatório atualizado no
mesmo endereço. Depois de salvar como novo, a navegação segue para o novo
relatório.

Conflitos de edição são detectados por um número de versão ou pelo instante de
atualização lido ao abrir o editor. Se o relatório mudou ou foi excluído em
outra sessão, o servidor rejeita a substituição e orienta o cliente a recarregar
a página; ele nunca sobrescreve silenciosamente a alteração concorrente.

### 4.6 Exclusão

A ação `Excluir relatório` fica no menu de ações secundárias. Um diálogo informa
que o relatório desaparecerá da conta. Após confirmar, o servidor realiza o
soft delete e redireciona para `/reports` com uma confirmação textual.

O diálogo recebe foco ao abrir, pode ser cancelado por teclado e não depende de
cor para comunicar o caráter destrutivo.

## 5. Arquitetura de dados e segurança

### 5.1 Metadados de relatório

`public.diagnoses` recebe:

- `updated_at timestamptz not null`;
- `deleted_at timestamptz null`;
- `version integer not null default 0` com valor não negativo.

Um índice parcial acompanha as consultas da biblioteca por usuário, criação e
identificador onde `deleted_at is null`. Índices e políticas existentes são
reavaliados para não degradar a paginação.

### 5.2 Autorização histórica de leitura

A função central de leitura de diagnósticos passa a aceitar relatórios próprios
não excluídos quando uma destas condições for verdadeira:

1. `is_free_report = true`; ou
2. existe contrato pago do mesmo usuário com intervalo válido que contém
   `diagnoses.created_at`.

A mudança se aplica à tabela principal e às tabelas específicas de Serviço,
Produto, Produção e Detalhado. A função mantém `auth.uid()` e elegibilidade da
conta como requisitos e continua inacessível a chamadas públicas indevidas.

### 5.3 Mutação

As operações de substituição e exclusão usam funções transacionais versionadas.
Elas verificam o usuário autenticado dentro do banco e nunca aceitam um
`user_id` informado pelo cliente como prova de propriedade.

Substituição exige:

- relatório existente, próprio e não excluído;
- `version` esperada;
- conta elegível;
- acesso pago vigente;
- categoria e modo de análise inalterados;
- entrada e snapshot nas versões atuais suportadas.

Exclusão exige relatório existente, próprio, não excluído e `version` esperada,
mas não exige plano pago. Ambas incrementam `version` e atualizam `updated_at`.

Os privilégios seguem negação por padrão. As funções públicas recebem `EXECUTE`
somente para `authenticated`, usam `search_path` vazio, relações qualificadas e
checagens explícitas de identidade. Tabelas continuam protegidas por RLS.

### 5.4 Compatibilidade

Relatórios antigos continuam sendo interpretados pelos parsers versionados já
existentes. Apenas snapshots atuais com conversão completa para o contrato de
entrada podem ser editados.

A substituição não altera a categoria nem converte diagnóstico rápido em
detalhado. Para mudar essas escolhas, o cliente cria um diagnóstico novo pelo
fluxo normal.

## 6. Serviços e componentes

### 6.1 Leitura

O serviço de detalhe retorna, além do snapshot:

- `version`;
- capacidade de edição do formato;
- estado atual de plano pago;
- capacidade de exclusão.

A biblioteca recebe o estado de paginação anterior e ignora registros
excluídos. O cliente administrativo usado atualmente apenas para diferenciar
relatório bloqueado de inexistente deixa de ser necessário para relatórios que
possuam direito histórico de leitura; usos restantes são revistos para não
contornar RLS.

### 6.2 Adaptação e cálculo

Adaptadores separados convertem snapshots atuais em entradas editáveis para
Serviço, Produto, Produção e Detalhado. Eles não reinterpretam snapshots
antigos nem inventam campos ausentes.

Os cálculos e construtores de snapshot existentes permanecem a única fonte das
regras financeiras. O editor orquestra esses módulos sem duplicar fórmulas nos
componentes.

### 6.3 Ações

Ações de servidor distintas tratam:

- substituição de relatório rápido;
- substituição de relatório detalhado;
- criação de novo relatório a partir da edição;
- soft delete.

Todas validam novamente o payload com os schemas de entrada e traduzem falhas
para estados fechados: entrada inválida, plano necessário, conflito, relatório
ausente e falha inesperada.

## 7. Ajustes administrativos

### 7.1 Assinaturas recentes

A lista representa assinaturas que chegaram a conceder acesso. Contratos sem
`access_starts_at` são tentativas de checkout e não aparecem, mesmo quando seu
estado final é `expired`, `failed` ou `canceled`.

Renovações ou compras diferentes do mesmo usuário continuam sendo registros
legítimos e podem aparecer separadamente. A correção não deduplica usuários;
ela remove falsos positivos de checkout.

### 7.2 Filtros do dashboard administrativo

A seção de assinaturas oferece filtros por:

- período de criação: 7, 30 ou 90 dias, além de todos;
- modalidade: todas, mensal ou anual;
- situação operacional: todas, com acesso vigente ou encerradas.

Os filtros são representados na URL, aplicados no banco antes do limite e
mantêm ordenação determinística. O título e o estado vazio deixam claro que os
filtros afetam a lista de assinaturas, sem sugerir que recalculam os KPIs ou
gráficos do dashboard.

### 7.3 Filtros de usuários em cookie

A busca por e-mail, o estado da conta e o tipo de acesso são persistidos em um
cookie administrativo com atributos `SameSite=Lax`, `Secure` em produção,
caminho `/admin/users`, duração limitada e tamanho validado.

Parâmetros explícitos da URL têm precedência e atualizam o cookie. Na ausência
deles, a página restaura os valores válidos do cookie. Valores inválidos usam os
padrões atuais. Cursor e pilha de páginas nunca são persistidos.

A interface inclui `Limpar filtros`, que remove os valores persistidos e volta
à primeira página.

## 8. Estados de erro

- Falha ao ler relatórios mantém o estado de erro existente.
- Relatório excluído ou pertencente a outro usuário retorna `notFound` sem
  revelar sua existência.
- Perda do plano entre abrir e salvar retorna `Plano necessário` e oferece o
  acesso à assinatura sem apagar o rascunho local.
- Conflito de versão preserva o rascunho e solicita recarregamento.
- Falha na substituição mantém o registro antigo intacto.
- Falha ao salvar como novo não modifica o relatório de origem.
- Falha no soft delete mantém o relatório visível e permite tentar novamente.
- Filtros administrativos inválidos retornam aos valores seguros.

## 9. Acessibilidade e responsividade

- Modal e diálogo de confirmação possuem nome acessível, gerenciamento de foco
  e retorno de foco ao acionador.
- Todos os campos mantêm rótulo visível e mensagens de erro associadas.
- Atualizações da prévia usam anúncio discreto e não interrompem a digitação.
- Estados de carregamento, conflito, plano e exclusão usam texto além de cor.
- Alvos interativos mantêm pelo menos 44 por 44 pixels em telas de toque.
- Layouts não exigem rolagem horizontal em 320 pixels.
- Animações respeitam `prefers-reduced-motion`.

## 10. Testes e critérios de aceite

### 10.1 Banco

- Relatório próprio criado durante acesso pago permanece legível depois do fim
  do contrato.
- Relatório criado fora de um intervalo pago não recebe acesso histórico.
- Contrato de outro usuário não concede acesso.
- Relatório soft deleted não é selecionável.
- Substituição sem plano ativo é negada.
- Substituição atualiza todas as representações na mesma transação.
- Versão divergente rejeita substituição e exclusão.
- Exclusão funciona sem plano e não apaga linhas fisicamente.
- Excluir relatório gratuito não libera outro relatório gratuito.
- Consultas administrativas ignoram checkout sem início de acesso.
- Funções e políticas negam usuários anônimos e proprietários incorretos.

### 10.2 Aplicação

- A paginação avança, volta e retorna diretamente à primeira página.
- Cursores inválidos não causam erro nem acesso indevido.
- Cliente sem plano vê o modal de upgrade ao tentar editar.
- Cliente pago edita cada categoria suportada e recebe prévia atualizada.
- `Salvar alterações` mantém a URL e apresenta os novos valores.
- `Salvar como novo relatório` preserva a origem e abre o novo identificador.
- Relatório antigo incompatível continua legível e explica a indisponibilidade
  da edição.
- Exclusão exige confirmação e redireciona à biblioteca.
- Relatório excluído deixa a lista e retorna `notFound` por URL direta.
- Filtros administrativos são aplicados antes da paginação.
- Filtros de usuários sobrevivem à navegação e podem ser limpos.

### 10.3 Regressão

- Criação normal de diagnósticos rápidos e detalhados continua funcionando.
- Cálculos existentes mantêm os resultados para as mesmas entradas.
- Cancelamento, checkout e webhooks de cobrança não mudam de comportamento.
- Admin, MFA e isolamento entre usuários permanecem obrigatórios.
- Testes unitários, testes SQL, typecheck, lint e build passam.

## 11. Sequência de entrega

1. Autorização histórica, metadados e soft delete.
2. Paginação completa da biblioteca.
3. Adaptadores de snapshot e editor rápido com prévia.
4. Editor detalhado com itens e ingredientes.
5. Substituição, salvamento como novo e tratamento de conflitos.
6. Correção e filtros de assinaturas no admin.
7. Persistência dos filtros administrativos de usuários.
8. Verificação integrada e atualização da documentação de produto.

Após esta entrega, o próximo trabalho de produto será escolher e implementar
métricas úteis para os quatro KPIs do dashboard do cliente.
