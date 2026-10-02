---
target: dashboard do cliente e quatro mudanças propostas
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/pereira/projetos/Lucrivo/src/app/(private)/dashboard/page.tsx"
target_fingerprint: "sha256:b9f39794d4a32006ca32d17e8f88739ebeac43044e5567ede297696644e97c19"
target_path: /home/pereira/projetos/Lucrivo/src/app/(private)/dashboard/page.tsx
timestamp: 2026-10-02T21-23-15Z
slug: src-app-private-dashboard-page-tsx
---
# Crítica de design — Dashboard do cliente

## Saúde do design

| # | Heurística | Nota | Achado principal |
|---|---|---:|---|
| 1 | Visibilidade do estado | 3 | Há loading, “Aplicando...”, `aria-busy`, vazios, erro e “Em foco”; falta anunciar claramente quando os resultados terminaram de atualizar. |
| 2 | Correspondência com o mundo real | 3 | O português é claro em geral, mas “recorte”, “modalidade”, “cenário” e “estado dos dados” exigem tradução mental. |
| 3 | Controle e liberdade | 3 | Chips removíveis, “Limpar filtros” e navegação explícita dão boa reversibilidade. |
| 4 | Consistência e padrões | 3 | Componentes e ações são coerentes; a mesma gramática de card é aplicada a conteúdos com importâncias diferentes. |
| 5 | Prevenção de erros | 3 | Combinações incompatíveis são normalizadas; o intervalo de datas inválido não recebe orientação visível. |
| 6 | Reconhecimento em vez de memória | 3 | Rótulos, filtros ativos e foco selecionado ficam visíveis. |
| 7 | Flexibilidade e eficiência | 2 | “Mais filtros” ajuda, mas aplicar e aguardar uma navegação deixa a exploração lenta. |
| 8 | Estética e design minimalista | 2 | Há uma sucessão longa de painéis, seis cards recentes e muitas ações concorrentes. |
| 9 | Recuperação de erros | 3 | O erro global tranquiliza; a falha de filtros é genérica e pode não refletir falhas assíncronas reais. |
| 10 | Ajuda e documentação | 2 | Existem descrições curtas, mas pouca orientação sobre termos e sobre o que merece atenção primeiro. |
| **Total** |  | **27/40** | **Aceitável — boa base, mas requer melhoria relevante de UX** |

## Veredito de especificidade

**Conteúdo específico, composição genérica.** A página respeita muito bem o domínio do Lucrivo: não agrega valores financeiros incompatíveis, separa contagens do relatório em foco e usa estados persistidos. Visualmente, porém, repete um padrão comum de SaaS — hero em card, quatro KPIs quadrados, cards com barras, grade de itens recentes e outro painel de detalhe. O diferencial “entender o que acontece e saber o que corrigir primeiro” ainda não organiza a composição.

O detector determinístico examinou `src/modules/client-dashboard/components` uma vez e retornou **0 achados**. Isso confirma que não há anti-padrões mecânicos detectáveis nesse escopo; os problemas prioritários são de julgamento visual e experiência. Não houve falso positivo.

Não há overlay visual disponível. Não existe automação de navegador dedicada nesta sessão, o app e o backend locais não estavam ativos, e `/dashboard` exige sessão autenticada. A evidência substituta foi o código da composição mais 23 testes direcionados aprovados.

## Impressão geral

Sua direção está correta. O dashboard não precisa de menos capacidade; precisa de menos “caixas”, uma chegada mais humana e uma sequência visual que diga o que observar primeiro. A maior oportunidade é tornar o relatório ou situação prioritária o centro da experiência, deixando filtros e contagens como ferramentas de apoio.

## O que funciona

- **Integridade financeira:** a separação entre visão agregada e relatório em foco evita médias ou somas enganosas.
- **Estados robustos:** carregamento, falta de histórico, recorte vazio, falha global e foco indisponível têm respostas próprias.
- **Base acessível:** headings semânticos, labels textuais, controles de 44 px, informação além de cor e o selo “Em foco” mostram cuidado consistente.

## Problemas prioritários

### [P1] Filtrar parece recarregar a página

**Por que importa:** o filtro já usa `router.replace` e não faz hard reload, mas a mudança reexecuta o Server Component e a consulta protegida. A troca pelo estado de carregamento pode parecer um reinício, interrompendo a comparação antes/depois.

**Correção:** manter URL e servidor como fonte de verdade, preservar os resultados atuais enquanto os novos chegam, mostrar “Atualizando resultados” perto do conteúdo e anunciar a nova contagem em `aria-live`. Seletores simples podem aplicar automaticamente; datas podem continuar com uma confirmação explícita.

**Comando sugerido:** `$impeccable optimize`

### [P1] Hierarquia fria e excessivamente encaixotada

**Por que importa:** cabeçalho, KPIs, distribuições, recentes e foco usam peso visual parecido. A pessoa precisa ler a página toda para saber o que merece atenção.

**Correção:** remover o card inicial, abrir com saudação e orientação em fundo livre, manter apenas um CTA primário, reduzir bordas e sombras e dar mais autoridade ao insight/relatório prioritário. “Olá, empreendedor” funciona, mas “Olá!” ou o nome real, quando houver dado confiável, soa menos genérico. Exemplo de apoio: “Veja o que merece sua atenção e retome seus diagnósticos.”

**Comando sugerido:** `$impeccable distill`

### [P2] Relatórios recentes ocupam espaço e fragmentam a decisão

**Por que importa:** seis cards repetem badges, metadados, duas métricas e duas ações. O usuário precisa escanear muitas estruturas para localizar um relatório.

**Correção:** usar tabela semântica com até cinco linhas no desktop e linhas empilhadas no celular. Manter apenas informações essenciais — relatório, tipo, situação, prioridade, data e ação — e preservar “Em foco” por texto. Evitar uma tabela comprimida com rolagem horizontal como única solução.

**Comando sugerido:** `$impeccable layout`

### [P2] KPIs têm altura e affordance incoerentes

**Por que importa:** o primeiro KPI não possui `details`, enquanto os outros três têm uma área de link de 44 px. Como a grade iguala alturas, isso cria exatamente o vazio percebido. Além disso, todos herdam sombra no hover, inclusive o card sem ação.

**Correção:** transformar os quatro números em uma faixa compacta, sem slots vazios. Se os KPIs filtrarem a visão, tornar essa ação explícita e consistente; se forem apenas informativos, remover o hover que sugere clique. Um resumo como “12 relatórios · 3 com perdas · 2 pendentes” pode ser mais humano que quatro caixas equivalentes.

**Comando sugerido:** `$impeccable polish`

### [P2] Linguagem e microtipografia não estão calibradas ao público

**Por que importa:** “recorte”, “modalidade”, “cenário” e “estado dos dados”, somados a textos recorrentes em 12 px, aumentam o esforço para pessoas mais velhas ou sem formação financeira.

**Correção:** preferir “Filtrar relatórios”, “Tipo de diagnóstico” e “Preenchimento”; manter metadados importantes em pelo menos 14 px e explicações decisivas em 16 px. “Seus relatórios mais recentes” é mais natural que expor “até seis diagnósticos deste recorte”.

**Comando sugerido:** `$impeccable clarify`

## Carga cognitiva e jornada

Falham 5 de 8 critérios: foco único, chunking, hierarquia, uma decisão por vez e escolhas mínimas. Há mais de quatro opções em Situação, Prioridade e Cenário, e os seis relatórios podem apresentar até doze ações. O agrupamento, os chips e a divulgação em “Mais filtros” funcionam bem.

A chegada é correta, mas clínica. Os filtros formam o primeiro vale emocional; os indicadores informam, porém não priorizam; os cards recentes repetitivos criam um segundo vale. O relatório em foco é o melhor encerramento, mas aparece tarde. O estado de erro é um ponto forte: garante que os relatórios continuam salvos e oferece recuperação clara.

## Red flags por persona

**Alex — usuário avançado:** precisa aplicar filtros repetidamente; a navegação reconsulta a rota; os seis cards com duas ações dificultam comparação rápida; “Ver neste dashboard” e “Abrir relatório” criam rotas mentais concorrentes. Os filtros na URL são um ponto positivo.

**Sam — teclado, leitor de tela ou baixa visão:** a semântica é boa, mas falta região viva para anunciar a nova contagem; o foco selecionado atualiza conteúdo distante; `text-xs` prejudica leitura; a futura tabela precisa de cabeçalhos, caption, foco visível e versão empilhada no mobile.

**Célia — microempreendedora mais velha, sem formação financeira:** encontra cinco termos analíticos antes de qualquer orientação; muitos blocos dizem que há dados, mas não por onde começar; perdas podem gerar ansiedade sem ação associada; badges e metadados pequenos tornam o histórico cansativo.

## Observações menores

- O cabeçalho repete o contexto já apresentado pelo shell; a saudação em fundo aberto reduz essa duplicidade.
- Barras categóricas com `role="progressbar"` podem sugerir progresso rumo a uma meta; os rótulos e valores já comunicam os dados.
- `generatedAtLabel` existe no view model, mas não aparece, perdendo um sinal de atualidade.
- O maior ganho da lista de cinco itens virá de remover informação secundária, não apenas de reduzir um item.

## Perguntas a considerar

- Em cinco segundos, a pessoa deve saber quantos diagnósticos existem ou qual merece atenção primeiro?
- Se o relatório em foco é onde os números ficam úteis, ele deveria aparecer antes da lista de recentes?
- Os quatro KPIs precisam ser quatro caixas ou podem formar uma única frase visual?
- Clicar na linha do relatório pode substituir “Ver neste dashboard” com feedback imediato?
