# Onboarding de clientes, segmentação e consentimento de WhatsApp

**Data:** 2026-10-09

**Status:** Aprovado em conversa; aguardando revisão da especificação escrita

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/superpowers/specs/2026-09-16-admin-user-management-design.md`
- `docs/superpowers/specs/2026-09-29-report-ai-assistant-design.md`
- `docs/report-ai-interpretation-behavior.md`

## 1. Objetivo

Adicionar uma etapa obrigatória e curta após o primeiro acesso autenticado para
coletar nome, WhatsApp, segmento principal e subcategoria do negócio. Segmento
e subcategoria enriquecerão o contexto do assistente de IA; nome e WhatsApp
permanecerão fora das chamadas ao modelo.

O administrador poderá acompanhar indicadores agregados, gerenciar o catálogo
de segmentos e subcategorias, consultar contatos e exportar somente os contatos
que autorizaram comunicações comerciais por WhatsApp. O cliente poderá corrigir
o próprio perfil e alterar essa autorização a qualquer momento.

Não há usuários de produção nem dados legados. A regra pode, portanto, valer
para todas as contas de cliente desde a implantação, sem exceções ou migração
de perfis existentes.

## 2. Decisões de produto

### 2.1 Momento e formato

O onboarding acontece depois da confirmação do e-mail e antes de qualquer
área privada do cliente:

```text
Cadastro -> confirmação do e-mail -> onboarding -> primeiro diagnóstico -> relatório
```

A experiência será uma página própria em `/onboarding`, não um modal. Uma rota
dedicada mantém atualização, histórico do navegador, erros, foco, mobile e
proteção contra acesso direto previsíveis. O formulário cabe em uma tela, não
usa etapas artificiais e informa que leva menos de um minuto.

O onboarding não pode ser pulado ou dispensado. Ao concluir, o botão
**Começar meu diagnóstico** leva a `/quick-diagnosis`, reduzindo a distância
até o primeiro valor do produto. O cadastro continua solicitando apenas as
credenciais atuais; os dados de negócio só são pedidos depois que a identidade
foi confirmada.

### 2.2 Contexto, não treinamento

Os dados não serão usados para fine-tuning, treinamento de modelos ou criação
de uma base externa. Em cada solicitação do assistente, o servidor pode anexar
apenas o segmento e a subcategoria atuais ao contexto do relatório.

Nome, WhatsApp, estado de consentimento, datas de consentimento e identificadores
internos nunca entram no prompt. O nome pode ser usado pela própria interface,
por exemplo em uma saudação determinística, sem passar pelo modelo.

### 2.3 WhatsApp e comunicações comerciais

O WhatsApp é obrigatório como dado cadastral e canal de atendimento. A
autorização para novidades, conteúdo e ofertas é independente, opcional e
desmarcada por padrão. Recusar comunicações comerciais não restringe nenhuma
funcionalidade.

O texto inicial será versionado como `whatsapp-marketing-v1`:

> **Quero receber pelo WhatsApp novidades, conteúdos e ofertas do Lucrivo.**  
> Esta autorização é opcional e pode ser cancelada a qualquer momento.

O perfil guarda o estado atual. Um histórico imutável registra a decisão
inicial e cada concessão ou revogação posterior, com data, origem e versão do
texto. Alterar o número preserva a escolha atual mostrada ao cliente; o
formulário deixa explícito que ela se aplica ao WhatsApp salvo no perfil.

## 3. Experiência do cliente

### 3.1 Página `/onboarding`

A página autenticada não usa o menu lateral da aplicação. Ela apresenta o logo
do Lucrivo, um formulário central e a seguinte introdução:

**Conte um pouco sobre o seu negócio**

“Leva menos de um minuto. Essas informações ajudam o Lucrivo a tornar suas
análises mais relevantes para a sua realidade.”

Campos, na ordem:

1. **Nome**;
2. **WhatsApp**;
3. **Segmento principal**;
4. **Subcategoria**;
5. **Qual é a sua subcategoria?**, exibido somente quando a escolha for
   “Outro”;
6. autorização opcional para comunicações comerciais.

O segmento e a subcategoria começam sem seleção. A subcategoria permanece
indisponível até o segmento ser escolhido e carrega somente opções ativas
daquele segmento, seguidas da opção sintética “Outro”. Trocar o segmento limpa
uma subcategoria incompatível e informa a mudança sem depender apenas de cor.

O envio preserva os valores em falhas recuperáveis, move o foco para o resumo
de erros e associa cada mensagem ao campo correspondente. Não há botão
“Pular”, fechamento por `Escape` ou saída silenciosa para o dashboard.

### 3.2 Componente de telefone

O campo usa o `PhoneInput` do UI-X instalado como código local pelo registry do
Shadcn:

<https://ui-x.junwen-k.dev/docs/components/phone-input>

O componente inicia com Brasil (`BR`) como país preferencial, aceita números
internacionais e entrega o valor canônico em E.164. A apresentação pode usar o
formato nacional enquanto o país estiver selecionado. O valor persistido nunca
contém espaços, parênteses ou hífens.

O componente é baseado em `react-phone-number-input`. Como sua documentação
descreve comportamento sem controle total (“semi-controlled”), a integração
mantém referências estáveis e recebe testes específicos de foco, digitação,
alteração de país, valor inicial e reenvio após erro. A dependência será fixada
no manifesto e no lockfile; a aplicação não carregará código remoto em tempo de
execução.

O produto valida um número telefônico possível, mas não promete confirmar que
o número possui uma conta ativa no WhatsApp. Verificação por OTP não faz parte
desta entrega.

### 3.3 Página `Minha conta`

A navegação privada ganha uma entrada **Minha conta**. A página reutiliza o
formulário e permite atualizar nome, WhatsApp, segmento, subcategoria e a
autorização comercial. E-mail permanece somente leitura e continua pertencendo
ao Supabase Auth.

Se a opção atual de catálogo tiver sido arquivada, ela continua visível como
“Arquivada”. O usuário pode conservar o valor ao editar outros campos, mas, ao
trocar segmento ou subcategoria, deve escolher uma opção ativa ou “Outro”.

Conceder ou revogar autorização mostra confirmação no próprio formulário. Uma
mudança que não altere o estado do consentimento não cria eventos duplicados.

## 4. Catálogo inicial e administração

### 4.1 Catálogo inicial

O catálogo começa com os segmentos abaixo, nesta ordem:

1. Alimentação;
2. Beleza;
3. Vestuário;
4. Tecnologia;
5. Educação;
6. Construção;
7. Saúde;
8. Comércio.

As subcategorias fornecidas inicialmente são:

- Alimentação: Confeitaria;
- Beleza: Salão de beleza;
- Vestuário: Loja de roupas;
- Tecnologia: Assistência técnica;
- Educação: Curso online.

Construção, Saúde e Comércio começam apenas com a opção sintética “Outro” até
que o administrador cadastre subcategorias. “Outro” nunca é uma linha do
catálogo e não pode ser renomeado ou arquivado.

### 4.2 Área `/admin/onboarding`

A navegação administrativa ganha **Onboarding**, com três seções endereçáveis
por URL:

- **Visão geral:** total de contas de cliente, perfis concluídos, taxa de
  preenchimento, consentimentos ativos, taxa de consentimento e distribuições
  por segmento e subcategoria;
- **Contatos:** busca e filtros por período de conclusão, segmento,
  subcategoria e consentimento, com paginação por cursor;
- **Catálogo:** criação, edição, ordenação, arquivamento e restauração de
  segmentos e subcategorias.

Os gráficos de distribuição usam barras ordenadas e também apresentam os
valores numericamente. “Outro” forma um grupo próprio nos agregados; a descrição
personalizada aparece apenas na listagem de contatos, com limite e escape de
conteúdo. Na visão geral, o período forma uma coorte por data de cadastro da
conta; em Contatos, filtra `completed_at`. Ambos usam o fuso de apresentação
`America/Sao_Paulo`, mantendo `timestamptz` no banco.

Renomear uma opção preserva seu ID e atualiza seu rótulo na interface, nos
indicadores e nas futuras chamadas à IA. Relatórios e respostas de IA já
persistidos não são reescritos. Arquivar impede novas seleções, mas preserva
perfis e agregados históricos. Não existe exclusão permanente pela interface.

Alterações administrativas usam versão para detectar concorrência. Uma edição
baseada em estado antigo retorna conflito e pede atualização, sem sobrescrever
silenciosamente uma alteração mais recente. Nomes duplicados sem distinção de
maiúsculas e minúsculas são recusados no escopo apropriado.

### 4.3 Exportação comercial

O botão se chama **Exportar contatos autorizados**. Ele respeita o período,
segmento e subcategoria selecionados, mas aplica no servidor e no banco a regra
irremovível de incluir apenas consentimentos ativos.

O CSV contém somente:

- nome;
- WhatsApp em E.164;
- segmento;
- subcategoria, usando a descrição personalizada quando for “Outro”;
- data da autorização vigente.

E-mail, ID do usuário, datas de acesso, diagnósticos e dados financeiros não
entram no arquivo. A exportação tem limite de 5.000 linhas; acima disso, a
interface solicita filtros mais restritos. Células que possam ser interpretadas
como fórmula por planilhas são neutralizadas antes da serialização.

Cada exportação registra ator, instante, filtros e quantidade de linhas em uma
tabela privada de auditoria. O conteúdo do CSV e os números de telefone não são
duplicados nesse registro.

## 5. Modelo de dados

### 5.1 `business_segments`

Tabela pública de catálogo com leitura autenticada e escrita exclusivamente
por operações administrativas:

```text
id           bigint identity primary key
name         text not null
sort_order   integer not null
is_active    boolean not null default true
version      integer not null default 0
created_at   timestamptz not null
updated_at   timestamptz not null
```

`name` possui de 2 a 60 caracteres depois de `btrim`. Um índice único por
`lower(btrim(name))` impede duplicatas que diferem apenas por caixa.
`sort_order` fica entre 0 e 10.000, e `version` nunca é negativo.

### 5.2 `business_subcategories`

```text
id           bigint identity primary key
segment_id   bigint not null -> business_segments(id) on delete restrict
name         text not null
sort_order   integer not null
is_active    boolean not null default true
version      integer not null default 0
created_at   timestamptz not null
updated_at   timestamptz not null
```

`name` possui de 2 a 80 caracteres. A unicidade sem distinção de caixa vale
dentro do segmento. Uma chave única adicional `(id, segment_id)` suporta a
chave estrangeira composta do perfil e impede combinar subcategoria com o
segmento errado. `segment_id` recebe índice próprio para manutenção da FK e
listagem ordenada.

### 5.3 `onboarding_profiles`

```text
user_id                        uuid primary key -> auth.users(id) on delete restrict
full_name                      text not null
whatsapp_e164                  text not null
segment_id                     bigint not null
subcategory_id                 bigint null
custom_subcategory             text null
whatsapp_marketing_consent     boolean not null default false
marketing_consent_granted_at   timestamptz null
completed_at                   timestamptz not null
updated_at                     timestamptz not null
version                        integer not null default 0
```

Regras de integridade:

- `full_name`: 2 a 120 caracteres após normalização de espaços;
- `whatsapp_e164`: `+` seguido de 8 a 15 dígitos, no máximo 16 caracteres;
- exatamente um entre `subcategory_id` e `custom_subcategory` deve existir;
- `custom_subcategory`: 2 a 80 caracteres após `btrim`;
- FK composta `(subcategory_id, segment_id)` para
  `business_subcategories(id, segment_id)`;
- consentimento `true` exige `marketing_consent_granted_at`; consentimento
  `false` exige a data nula;
- `version` nunca é negativo.

Índices em `segment_id`, `subcategory_id`, `completed_at` e um índice parcial
para perfis com consentimento ativo sustentam indicadores e exportações.

### 5.4 `private.whatsapp_consent_events`

Histórico append-only:

```text
id             bigint identity primary key
user_id        uuid not null -> auth.users(id) on delete restrict
decision       text not null check in ('granted', 'declined', 'revoked')
copy_version   text not null
source         text not null check in ('onboarding', 'account')
created_at     timestamptz not null
```

A conclusão inicial cria `granted` ou `declined`. Depois disso, apenas uma
mudança efetiva cria `granted` ou `revoked`. O cliente lê seu estado atual no
perfil, não a tabela privada de auditoria. `copy_version` aceita de 1 a 64
caracteres.

### 5.5 Auditoria de exportação

`private.admin_onboarding_export_events` registra um ID, o administrador, os
filtros limitados em JSON, a quantidade exportada e `created_at`. A estrutura
limita a representação textual dos filtros a 2.000 caracteres e a contagem a
0–5.000 linhas; não guarda o CSV nem PII exportada.

## 6. Validação, persistência e concorrência

Os mesmos limites aparecem em três camadas:

1. atributos e feedback imediato do formulário;
2. schemas Zod e serviços do servidor;
3. constraints e funções Postgres.

O cliente nunca é a fonte de verdade. O servidor normaliza espaços do nome e
da descrição personalizada, valida o telefone com a biblioteca usada pelo
componente e envia E.164 ao banco. IDs, estado ativo e vínculo entre catálogo e
perfil são revalidados na transação.

Uma RPC versionada salva o perfil e o evento de consentimento atomicamente.
Ela deriva `user_id` de `auth.uid()` e não aceita identidade arbitrária. Na
criação, exige segmento e subcategoria ativos. Na edição, permite conservar
uma opção arquivada já pertencente ao perfil, mas não adotá-la em uma nova
combinação.

Se uma opção for arquivada entre a abertura e o envio, a função retorna um erro
de domínio e o formulário recarrega o catálogo sem perder os demais dados.
Atualizações usam `expected_version`; conflitos pedem que o usuário atualize a
página. Reenvios idênticos não duplicam eventos de consentimento.

## 7. Rotas e controle de acesso

`resolveAuthenticatedHome` passa a resolver quatro destinos de sucesso:

- administrador elegível -> `/admin`;
- cliente elegível sem perfil -> `/onboarding`;
- cliente elegível com perfil -> `/dashboard`;
- conta inelegível -> `/account-unavailable`.

A rota de onboarding tem um layout autenticado próprio, sem `AppShell`. Se o
perfil já existe, acessar `/onboarding` redireciona para `/dashboard`. O layout
privado do cliente também consulta o estado de conclusão e redireciona para
`/onboarding`; assim, digitar diretamente `/reports`, `/billing` ou uma rota de
diagnóstico não contorna o gate. A área administrativa permanece separada e
não exige perfil de onboarding.

Essa verificação é uma regra de fluxo, não um papel de autorização. As
operações de dados continuam validando usuário, propriedade, elegibilidade e
permissões independentemente da página visitada.

## 8. Segurança Supabase

As tabelas públicas terão RLS habilitada e privilégios mínimos:

- `onboarding_profiles`: o papel autenticado pode ler apenas a própria linha;
  inserção e atualização diretas ficam revogadas e passam pela RPC validada;
- catálogos: usuários autenticados podem ler os rótulos necessários ao
  formulário, inclusive a opção arquivada já usada; não possuem escrita
  direta;
- tabelas privadas: sem acesso direto para `anon` ou `authenticated`.

Operações administrativas chamam `private.has_admin_access()`, que já combina
o administrador configurado com MFA `aal2`. Helpers privilegiados ficam no
schema `private`; somente RPCs estreitas que precisam ser chamadas pela API
ficam em `public`. Toda função `SECURITY DEFINER` usa `search_path = ''`, nomes
qualificados, checagem interna de identidade, grants explícitos e `EXECUTE`
revogado de `PUBLIC`, `anon` e demais papéis não necessários.

O painel usa projeções/RPCs estreitas, paginação por cursor e limites. O browser
nunca recebe chave secreta ou `service_role`. O CSV é criado somente em rota de
servidor após nova chamada a `requireAdmin`; seu resultado usa cabeçalhos para
download e não deve ser armazenado em cache compartilhado.

## 9. Indicadores e consultas administrativas

Uma projeção administrativa versionada retorna, para a coorte de contas
criadas no período escolhido:

- quantidade de contas de cliente confirmadas, excluindo o administrador e
  contas logicamente excluídas, mas incluindo contas bloqueadas;
- quantidade e percentual de perfis concluídos;
- quantidade e percentual de consentimentos ativos entre perfis concluídos;
- distribuição por segmento;
- distribuição por subcategoria, incluindo o grupo “Outro”.

Percentuais com denominador zero retornam valor nulo e a interface mostra
“Ainda sem dados”, nunca `0%` enganoso. Agregados são ordenados por contagem e
ID para resultado determinístico. A lista de contatos aceita busca de até 120
caracteres, limite de página entre 1 e 50 e cursor composto por
`completed_at` e `user_id`.

Consultas e índices serão revisados com `EXPLAIN` e advisors locais. Não se
cria um snapshot periódico nesta fase; a página mostra a visão atual sob os
filtros informados.

## 10. Contexto do assistente de IA

O serviço que monta o contexto do assistente busca o perfil pertencente ao
usuário autenticado e adiciona um objeto pequeno, equivalente a:

```text
businessContext:
  segment: "Alimentação"
  subcategory: "Confeitaria"
```

Quando “Outro” estiver selecionado, `subcategory` recebe a descrição curta.
O texto entra como dado não confiável e nunca como instrução. A política do
prompt deixa explícito que rótulos do perfil não podem alterar regras, pedir
segredos ou comandar ferramentas.

A ausência inesperada do perfil não derruba a leitura de um relatório
existente: o assistente opera sem contexto adicional e registra telemetria
técnica sem PII. Essa tolerância evita indisponibilidade em recuperação de
backup ou inconsistência operacional, embora o gate impeça esse estado no
fluxo normal.

## 11. Estados de erro

- **Falha ao carregar catálogo:** mensagem com ação para tentar novamente; o
  formulário não oferece valores inventados.
- **Telefone incompleto ou inválido:** erro junto ao `PhoneInput`, preservando
  país e valor digitado.
- **Opção arquivada durante o preenchimento:** mensagem específica e recarga
  das opções válidas.
- **Nome duplicado no catálogo:** erro inline na administração.
- **Conflito de versão:** nenhuma sobrescrita; solicitar atualização.
- **Falha ao salvar perfil ou consentimento:** transação inteira revertida.
- **Falha de indicadores/contatos:** estado de erro localizado com nova
  tentativa, mantendo navegação administrativa.
- **Exportação vazia:** informar que nenhum contato autorizado corresponde aos
  filtros e não baixar um arquivo vazio.
- **Limite de exportação:** pedir filtros mais restritos sem produzir arquivo
  parcial.

Logs não incluem número completo, CSV, texto livre do usuário ou conteúdo do
prompt. Quando um identificador operacional for necessário, usa-se `user_id`
ou ID do evento.

## 12. Seed e tipos gerados

A migração cria o catálogo e suas regras. `supabase/seed.sql` e o gerador de
seed realista passam a criar perfis coerentes para as contas de demonstração,
com uma mistura determinística de segmentos, subcategorias, “Outro” e estados
de consentimento. O administrador de demonstração não recebe perfil.

Após a migração, os tipos Supabase são regenerados pelo script existente. O
seed terá testes para garantir que todo perfil referencia uma combinação
válida e que contatos recusados nunca aparecem na projeção de exportação.

## 13. Verificação

### 13.1 Banco

- constraints de comprimento, E.164, XOR da subcategoria e FK composta;
- RLS do próprio perfil e negação entre usuários;
- leitura de catálogo e bloqueio de escrita direta;
- criação e edição atômicas com eventos `granted`, `declined` e `revoked`;
- idempotência e concorrência por versão;
- uso e conservação de opções arquivadas;
- autorização administrativa com `anon`, cliente, admin `aal1` e admin `aal2`;
- indicadores com denominador zero e filtros;
- exportação sempre restrita a consentimento ativo e limite de linhas;
- auditoria de exportação sem PII duplicada.

### 13.2 Aplicação

- resolução pós-login para admin, onboarding, dashboard e conta indisponível;
- gate das rotas privadas e prevenção do loop de redirecionamento;
- formulário com limites, erros associados e preservação de valores;
- dependência entre segmento e subcategoria e comportamento de “Outro”;
- `PhoneInput` com Brasil, número internacional, foco, valor inicial e E.164;
- edição em **Minha conta** e eventos somente quando o consentimento muda;
- catálogo administrativo, conflitos e opções arquivadas;
- filtros, paginação, estados vazio/erro e CSV seguro;
- contexto da IA contendo segmento/subcategoria e excluindo nome, telefone e
  consentimento.

### 13.3 Qualidade visual e acessibilidade

Inspecionar onboarding, conta e administração em desktop e celular, temas
claro e escuro. Verificar teclado, foco visível, nomes acessíveis, mensagens de
erro, contraste, zoom, leitores de tela e movimento reduzido. O seletor de país
e as listas de catálogo precisam funcionar sem mouse e manter alvos de toque
adequados.

Executar testes SQL, testes direcionados Vitest, suíte completa, typecheck,
lint, formatação, geração de tipos e advisors do Supabase.

## 14. Fora de escopo

- treinamento, fine-tuning, embeddings ou base vetorial;
- envio automático de mensagens ou integração com a API do WhatsApp;
- verificação do número por OTP ou confirmação de conta no WhatsApp;
- automação de campanhas dentro do Lucrivo;
- importação de contatos;
- exclusão física de opções de catálogo já utilizadas;
- múltiplos segmentos ou múltiplas subcategorias por cliente;
- coleta de razão social, CNPJ, endereço, faturamento ou quantidade de
  funcionários;
- alteração de e-mail ou credenciais em **Minha conta**;
- snapshots históricos dos rótulos do catálogo em relatórios existentes.
