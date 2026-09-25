# Seed realista para desenvolvimento e homologação

**Data:** 2026-09-25

**Status:** Desenho aprovado em conversa; aguardando revisão do documento

**Documentos relacionados:**

- `PRODUCT.md`
- `docs/QUICK-DIAGNOSIS.md`
- `docs/DETAILED-DIAGNOSIS.md`
- `docs/superpowers/specs/2026-09-16-admin-dashboard-design.md`
- `docs/superpowers/specs/2026-09-16-admin-user-management-design.md`
- `docs/superpowers/specs/2026-09-24-detailed-diagnosis-quick-alignment-design.md`

## 1. Objetivo

Criar um conjunto determinístico e relativamente grande de dados fictícios para
desenvolvimento local e homologação. O conjunto deve permitir observar o produto
como uma operação real: listas com várias páginas, filtros com resultados
distintos, indicadores administrativos com histórico e relatórios que cubram os
principais resultados financeiros suportados.

O seed terá um administrador com assinatura anual vigente. Esse administrador
possuirá uma biblioteca canônica com todos os cenários suportados pelos
diagnósticos rápidos e detalhados. Os clientes fictícios terão quantidades
variadas de relatórios, acessos, contratos, pagamentos, atividade e estado de
conta.

## 2. Contexto atual

O projeto usa migrações imperativas e executa `supabase/seed.sql` depois das
migrações em `supabase db reset`. O seed atual possui apenas um usuário
administrador e 12 relatórios rápidos. Ao final, ele expira o contrato usado para
criar os relatórios. Não existem relatórios detalhados nem dados suficientes para
paginar a lista administrativa de usuários.

No instante desta especificação, o projeto remoto vinculado
`lucrivo-staging` possui 3 usuários, 6 diagnósticos, 2 contratos e 8 pagamentos,
mas não possui registro em `private.app_administrator`. Esses registros remotos
preexistentes não fazem parte do seed e devem ser preservados.

## 3. Decisão principal

O artefato executado pelo Supabase continuará sendo SQL versionado, mas será
produzido por um gerador TypeScript determinístico. O gerador reutilizará as
funções de cálculo e construção de snapshots da aplicação para impedir que os
dados de demonstração se afastem dos contratos atuais dos relatórios.

O SQL gerado conterá somente operações de dados e chamadas às funções públicas
de criação de relatórios. Estruturas, funções persistentes, políticas e tipos
continuarão pertencendo exclusivamente às migrações.

Não haverá feature flag na aplicação. Popular dados é uma operação de ambiente,
não um comportamento de produto. Homologação usará um comando separado e
protegido, com confirmação explícita por variável de ambiente e validação do
projeto de destino.

Foram descartadas duas alternativas:

- manter os snapshots manualmente em um SQL cada vez maior, pois isso repetiria
  regras de cálculo e tornaria mudanças de versão propensas a inconsistências;
- criar tudo pela API administrativa, pois isso exigiria rede e segredos mesmo
  no desenvolvimento local e deixaria de exercitar parte dos contratos SQL.

## 4. Arquitetura do seed

A solução terá três unidades com responsabilidades distintas:

1. **Catálogo de cenários:** define comandos de diagnóstico, perfis de usuário,
   históricos de cobrança e deslocamentos de data. Não serializa SQL.
2. **Gerador:** calcula os relatórios com o domínio atual, valida os snapshots e
   serializa um único `supabase/seed.sql` transacional.
3. **Executor de homologação:** valida o alvo e a autorização explícita antes de
   enviar o SQL gerado ao projeto `lucrivo-staging`.

O arquivo gerado terá um cabeçalho que informa sua origem e o comando de
regeneração. Edições manuais nele não serão o fluxo de manutenção. Mudanças
partem do catálogo ou do gerador e produzem uma diferença revisável no SQL.

O gerador usará identificadores fixos dentro de um namespace reservado para o
seed. Datas serão deslocamentos relativos a um único instante capturado no
início da transação. Assim, identidades e distribuições permanecem previsíveis,
enquanto métricas como `hoje`, `esta semana`, atividade em 30 dias e receita do
mês continuam úteis a cada aplicação.

## 5. Volume e distribuição de usuários

O conjunto criará exatamente 97 identidades fictícias:

- 1 administrador;
- 96 clientes.

Os 96 clientes serão distribuídos assim quanto a relatórios:

| Grupo                 | Clientes |        Relatórios por cliente |   Total |
| --------------------- | -------: | ----------------------------: | ------: |
| Sem diagnóstico       |       24 |                             0 |       0 |
| Somente gratuito      |       24 |                             1 |      24 |
| Uso recorrente baixo  |       40 | 2 a 5, dez em cada quantidade |     140 |
| Uso recorrente alto   |        7 | 6 a 12, um em cada quantidade |      63 |
| Cliente de paginação  |        1 |                            32 |      32 |
| **Total de clientes** |   **96** |                               | **259** |

O administrador terá mais 36 relatórios canônicos. O total criado pelo seed
será, portanto, 295 relatórios. A tabela administrativa de usuários terá cinco
páginas com o limite padrão de 20, e o cliente de paginação terá mais de uma
página de relatórios.

A distribuição de estado e atividade dos clientes incluirá:

- 80 contas ativas, 8 bloqueadas e 8 excluídas logicamente;
- 48 acessos nos últimos 30 dias, 32 acessos mais antigos e 16 contas que nunca
  entraram;
- 6 cadastros no dia, mais 10 no restante da semana, mais 16 no restante do
  mês e 64 distribuídos pelos cinco meses anteriores;
- 44 clientes com acesso gratuito no momento, 40 com acesso pago vigente e 12
  com cortesia vigente.

Os grupos de estado, atividade, acesso e volume de relatórios se cruzarão. O
seed não criará apenas blocos artificiais em que todo cliente pago se parece ou
todo cliente bloqueado não tem histórico.

## 6. Administrador e credenciais

O administrador usará uma identidade fixa do seed, e-mail sob domínio `.test`
e senha de desenvolvimento documentada no cabeçalho do arquivo gerado e no
README. A identidade estará confirmada e possuirá a identidade de provedor
necessária para login por e-mail.

O registro `private.app_administrator` será preenchido somente quando estiver
vazio ou já apontar para o mesmo administrador do seed. Se outro administrador
estiver configurado, a transação falhará sem substituir o registro. Essa regra
protege uma homologação que tenha sido configurada manualmente depois da criação
deste seed.

O administrador possuirá contrato anual ativo, pagamento recebido e intervalo
de acesso vigente. A assinatura não será expirada ao final do seed.

Todos os e-mails serão fictícios e usarão domínio reservado `.test`. Nenhum
dado será copiado de produção ou de pessoas reais.

## 7. Catálogo de relatórios

### 7.1 Biblioteca canônica do administrador

O administrador terá exatamente uma ocorrência canônica de cada resultado
suportado:

- Serviço rápido: 6 relatórios, cobrindo `missing_price`, `direct_loss`,
  `operational_loss`, `tight_margin`, `adequate_margin` e `above_target`,
  distribuídos entre hora, minuto, atendimento, dia, semana e mês;
- Produto rápido: 8 relatórios, cobrindo `direct_loss`, `incomplete_volume`,
  `no_sales`, `operational_loss`, `break_even`, `tight_margin`,
  `adequate_margin` e `above_target`, incluindo revenda e produto digital;
- Produção rápida: os mesmos 8 resultados, incluindo custo resumido e
  composição completa;
- Produto detalhado: 7 relatórios, cobrindo `direct_loss`,
  `incomplete_volume`, `no_sales`, `operational_loss`, `break_even`,
  `tight_margin` e `adequate_margin`;
- Produção detalhada: os mesmos 7 resultados.

Os diagnósticos detalhados variarão entre 1, 2, 3, 5, 8, 10 e 12 itens. Produto
usará itens de revenda. Produção cobrirá custo resumido, ficha técnica e
relatórios que combinam os dois modos entre itens diferentes. As fichas
técnicas incluirão ingredientes, rendimento, perda, embalagem, mão de obra
direta e outros gastos variáveis.

O catálogo também provocará orientações detalhadas de quantidade ausente,
perda direta, concentração de receita, melhor contribuição unitária, volume alto
com margem baixa e resultado geral do negócio.

### 7.2 Distribuição entre clientes

Os 259 relatórios de clientes serão derivados do mesmo catálogo, com
identificadores, nomes, valores e datas próprios. Todas as categorias aparecerão
em clientes diferentes, e nenhum cliente sem assinatura vigente receberá mais
relatórios do que sua gratuidade e seu histórico de acesso permitem.

Parte dos relatórios será marcada como excluída logicamente depois da criação.
Eles continuarão existindo para exercitar histórico administrativo, mas não
aparecerão na biblioteca normal do cliente.

Cada usuário com relatórios terá exatamente um primeiro relatório gratuito. Os
demais serão criados dentro de um intervalo de acesso pago e permanecerão
legíveis historicamente quando o contrato correspondente já tiver terminado.

## 8. Cobrança, métricas e históricos

O seed incluirá contratos mensais e anuais, por cartão e Pix, respeitando as
combinações permitidas pelo banco. O conjunto cobrirá todos os estados de
contrato suportados:

- `pending`;
- `pending_reconciliation`;
- `active`;
- `cancel_at_period_end`;
- `expired`;
- `canceled`;
- `refunded`;
- `chargeback`;
- `failed`.

Os pagamentos cobrirão todos os estados suportados, incluindo pendente,
confirmado, recebido, vencido, captura recusada, reembolso parcial ou total e
disputa de chargeback. Somente estados que representam receita alimentarão os
indicadores financeiros.

Haverá pagamentos confirmados ou recebidos em cada um dos 12 meses exibidos no
gráfico de receita. O mês corrente conterá receita e cancelamentos. Cada um dos
seis meses do gráfico de crescimento terá novos clientes.

O cliente de paginação possuirá ao menos 24 contratos históricos e 24 eventos
administrativos coerentes, exercitando as páginas de diagnósticos, assinaturas e
histórico na tela de detalhe do usuário.

## 9. Ordem de criação e coerência

A transação executará as etapas nesta ordem:

1. capturar o instante de referência;
2. remover somente registros pertencentes ao namespace reservado do seed;
3. criar usuários e identidades de autenticação;
4. configurar o administrador com a proteção contra substituição;
5. criar contratos necessários para autorizar os relatórios pagos;
6. impersonar cada identidade por claim local e chamar as funções públicas de
   criação de relatório;
7. ajustar datas relativas e estados finais de contratos e relatórios;
8. criar pagamentos, cortesias e eventos administrativos;
9. aplicar bloqueios e exclusões lógicas somente depois dos relatórios;
10. validar invariantes essenciais e confirmar a transação.

Essa ordem permite que o seed exercite as mesmas validações de acesso usadas
pela aplicação. Contas bloqueadas ou excluídas recebem seu histórico antes de
ficarem inelegíveis.

## 10. Reexecução e isolamento

O seed será reexecutável. Antes de inserir, removerá e recriará somente dados
cujos identificadores pertençam ao namespace reservado. Essa limpeza é
intencional: alterações manuais feitas nas contas fictícias não precisam
sobreviver à regeneração do ambiente.

Registros fora do namespace, inclusive os que já existem em homologação, não
serão apagados nem atualizados. Exclusões respeitarão a ordem das chaves
estrangeiras e permanecerão dentro da mesma transação. Qualquer falha reverterá
toda a aplicação do seed.

O SQL gerado não dependerá da sequência atual das tabelas para identificar seus
registros. Identificadores de autenticação, submissão, contrato, pagamento,
itens e ingredientes serão determinísticos. Identificadores numéricos gerados
pelo banco poderão variar sem afetar o conteúdo ou os testes.

## 11. Execução local e em homologação

Localmente, `supabase db reset --local` continuará sendo o caminho principal.
Ele aplicará todas as migrações e depois o `supabase/seed.sql` gerado.

O repositório oferecerá comandos separados para:

- regenerar o SQL a partir do catálogo;
- conferir que o SQL versionado está atualizado;
- aplicar o SQL localmente;
- aplicar o SQL somente em homologação.

O comando remoto exigirá `ALLOW_STAGING_SEED=true`, conferirá o identificador
exato conhecido de `lucrivo-staging` e abortará diante de qualquer outro
projeto. Ele executará apenas o arquivo de dados; não executará reset remoto e
não aplicará migrações implicitamente. O fluxo não oferecerá uma opção análoga
para produção.

O README documentará que o comando de homologação recria as contas fictícias
do namespace do seed, preserva dados externos a ele e deve ser executado apenas
depois de as migrações correspondentes estarem presentes no ambiente.

## 12. Validação e testes

Testes unitários do gerador verificarão:

- estabilidade dos identificadores e da ordenação;
- escape seguro de strings e JSON no SQL;
- total de usuários e relatórios por grupo;
- cobertura integral da matriz canônica;
- rejeição do comando remoto sem autorização ou com projeto divergente.

Os testes pgTAP do seed verificarão no banco:

- 97 identidades do seed e uma identidade de provedor por usuário;
- administrador correto com contrato anual ativo e pagamento recebido;
- 96 clientes e 295 relatórios no namespace;
- distribuição 0, 1, 2 a 5, 6 a 12 e 32 relatórios;
- exatamente um relatório gratuito por cliente que tenha relatórios;
- todas as categorias, modos de análise, cenários, vereditos e prioridades;
- consistência entre tabelas resumidas, tabelas normalizadas e snapshots;
- todos os estados de contrato e pagamento;
- preenchimento de todos os períodos dos gráficos administrativos;
- mais de uma página nas consultas administrativas escolhidas;
- isolamento: uma linha sentinela fora do namespace sobrevive à reaplicação;
- reexecução sem duplicação.

A verificação completa executará a regeneração, confirmará que não existe
diferença no SQL, reiniciará o banco local, rodará os testes do banco, testes
TypeScript, typecheck, lint e format check. Os advisors do Supabase serão
executados para detectar regressões de segurança ou desempenho.

## 13. Tratamento de falhas

O gerador falhará antes de escrever o artefato quando um comando produzir
snapshot inválido, um cenário obrigatório estiver ausente ou dois registros
compartilharem o mesmo identificador.

O SQL falhará de forma atômica quando:

- o schema necessário não estiver atualizado;
- houver outro administrador configurado;
- uma função de criação rejeitar o relatório;
- uma contagem ou invariante final divergir do catálogo.

O executor remoto mostrará apenas o projeto de destino, o resumo das contagens
e o erro sanitizado. Senhas de banco, chaves secretas e tokens não serão
impressos.

## 14. Escopo excluído

- Usar dados copiados ou anonimizados de produção.
- Disponibilizar o seed para produção.
- Criar uma feature flag visível pela aplicação.
- Criar novos estados de relatório, contrato ou pagamento.
- Alterar cálculos, cópias ou regras de acesso dos relatórios.
- Alterar paginação, filtros ou métricas do produto.
- Executar reset destrutivo no projeto remoto.
- Preservar alterações manuais feitas nas identidades fictícias do seed.

## 15. Critérios de aceitação

A entrega estará concluída quando:

1. um banco local vazio puder ser reconstruído com migrações e seed em um
   único fluxo;
2. o admin fictício puder entrar e consultar 36 relatórios cobrindo toda a
   matriz suportada;
3. tabelas e detalhes administrativos apresentarem paginação real;
4. filtros de conta e acesso retornarem grupos não vazios;
5. KPIs e gráficos exibirem dados distribuídos no tempo;
6. clientes exemplificarem ausência, pouco e muito uso do produto;
7. a reaplicação recriar somente o namespace fictício sem duplicar dados;
8. o comando remoto recusar qualquer destino diferente de
   `lucrivo-staging`;
9. testes automatizados comprovarem as contagens, matrizes e invariantes;
10. nenhuma credencial real ou dado pessoal for versionado.
