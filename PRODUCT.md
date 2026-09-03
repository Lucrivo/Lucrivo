# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O público principal são micro e pequenos empreendedores brasileiros — incluindo
revendedores, produtores e prestadores de serviço — que precisam validar seus
preços e resultados sem depender de conhecimento financeiro avançado.

Eles usam o Lucrivo para entender se cada venda ou atendimento gera lucro, se o
preço cobre a operação e qual ajuste deve ser priorizado.

## Product Purpose

O Lucrivo transforma dados simples do negócio em um diagnóstico financeiro
determinístico. O produto calcula referências de preço e rentabilidade, explica
o resultado em linguagem acessível e indica uma ação prioritária.

O sucesso do produto significa permitir que o empreendedor tome decisões de
preço com clareza, compreenda o que realmente sobra depois dos custos e saiba o
que corrigir primeiro sem precisar operar planilhas ou interpretar linguagem
contábil especializada.

## Positioning

O diferencial central é combinar um fluxo guiado de baixa complexidade com um
motor de regras financeiras determinístico e uma explicação acionável. O
Lucrivo não apresenta apenas números: conecta os dados informados pelo usuário
a um veredito, referências financeiras e uma prioridade de correção.

O produto não pesquisa concorrentes nem determina um “preço correto de
mercado”. Suas referências são calculadas exclusivamente a partir da realidade
financeira informada pelo usuário e das políticas de margem adotadas em cada
diagnóstico.

## Operating Context

O usuário autenticado inicia um diagnóstico rápido e escolhe entre três
contextos de negócio:

- produto adquirido para revenda;
- produção própria de uma unidade;
- prestação de serviço cobrada por hora, minuto ou atendimento.

O fluxo coleta preço, custos e demais dados pertinentes à categoria, apresenta
uma revisão antes da confirmação e gera um relatório privado. O relatório
responde se há lucro, compara o preço atual com referências financeiras,
identifica a principal correção, apresenta metas aplicáveis e permite simular
descontos.

Os diagnósticos confirmados são salvos como registros históricos imutáveis e
podem ser reabertos na biblioteca privada de relatórios.

## Capabilities and Constraints

- Cadastro, autenticação, recuperação e atualização de senha.
- Diagnóstico rápido para revenda, produção própria e serviços.
- Cálculos financeiros determinísticos separados por categoria de negócio.
- Relatórios privados com resumo executivo, números principais, explicações e
  simulação de desconto.
- Histórico paginado de diagnósticos pertencentes ao usuário autenticado.
- Valores monetários apresentados em real brasileiro (`BRL`) e conteúdo de
  interface em português brasileiro.
- Margem de referência interna de 20% para produto e produção e de 15% para
  serviço nas versões atuais.
- Os resultados dependem dos dados fornecidos pelo usuário; dados ausentes
  podem produzir um diagnóstico parcial ou referências indisponíveis.
- Análise detalhada, ficha técnica completa, múltiplos produtos, estoque,
  compartilhamento público e comparação histórica não fazem parte da
  experiência atual.
- Interpretação por IA não é uma capacidade confirmada da versão atual e não
  realiza os cálculos financeiros centrais.
- Identificadores técnicos e código usam inglês; textos apresentados ao usuário
  permanecem em português brasileiro.

## Brand Commitments

- Nome do produto: **Lucrivo**.
- Voz simples, direta, respeitosa e orientada à ação.
- Explicações devem evitar “contabilês”, promessas absolutas e a impressão de
  que o produto conhece o preço praticado pelo mercado.
- A marca possui versões de logo para contextos claros e escuros em
  `src/public/brand/logo.png` e `src/public/brand/logo-dark.png`.

## Evidence on Hand

- Regras de negócio documentadas em `docs/QUICK-DIAGNOSIS.md`.
- Especificações aprovadas dos diagnósticos e relatórios em
  `docs/superpowers/specs/`.
- Fluxos implementados e cobertos por testes automatizados para autenticação,
  diagnósticos, cálculos, persistência, relatórios e componentes.
- Logos oficiais disponíveis no repositório para fundos claros e escuros.
- Não há depoimentos, nomes de clientes, estudos de caso, benchmarks, preços de
  planos ou provas comerciais confirmados. O conteúdo correspondente na landing
  page é provisório e não deve ser apresentado como evidência factual.

## Product Principles

1. **Clareza antes da complexidade.** Traduzir conceitos financeiros sem exigir
   que o usuário domine planilhas ou terminologia especializada.
2. **Cálculo antes da explicação.** Resultados financeiros vêm de regras
   determinísticas; qualquer camada narrativa apenas explica o que foi
   calculado.
3. **Ação antes do excesso de métricas.** Cada diagnóstico deve deixar evidente
   o que o usuário precisa corrigir ou acompanhar primeiro.
4. **Realidade do negócio antes de achismos de mercado.** As referências devem
   respeitar os dados informados e declarar claramente seus limites.
5. **Confiança no histórico.** Diagnósticos salvos preservam o contexto, o
   cálculo e o conteúdo apresentados no momento da confirmação.

## Accessibility & Inclusion

A experiência web deve permanecer navegável por teclado, usar controles e
rótulos semânticos, comunicar estados por texto além de cor e preservar suporte
a movimento reduzido. Os fluxos principais devem manter cobertura automatizada
de acessibilidade e comportamento responsivo.
