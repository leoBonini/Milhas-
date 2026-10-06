# Decisões

Registro das decisões técnicas e do motivo de cada uma.

## 2026-10-06 — Fase 0

**Monorepo com npm workspaces.** `apps/*` e `packages/*` (estrutura sugerida). Sem
turborepo/pnpm por enquanto: menos peças, e o npm já vem com o Node.

**Scripts TypeScript rodados com `tsx`.** Sem etapa de build para os coletores.
Testes com o `node:test` nativo, sem Jest/Vitest.

**Playwright fixado em 1.56.1.** É a versão cujo Chromium já está no ambiente de
desenvolvimento. No Actions, o navegador é instalado com `npx playwright install chromium`.

**`unique nulls not distinct` em `pontuacoes`.** No schema original, `escopo` pode ser nulo.
Em Postgres, nulos são diferentes entre si numa restrição `unique`, então duas coletas no
mesmo dia sem escopo nunca conflitariam e a coleta duplicaria linhas. `nulls not distinct`
(Postgres 15+, padrão do Supabase) resolve isso sem mudar o significado da coluna.

**View `pontuacao_diaria`.** Implementa a regra de leitura: maior `pontos_por_real` do dia
entre todas as fontes. Registros com `confianca = 'baixa'` ficam de fora até a revisão
manual aprová-los.

**RLS ligado em todas as tabelas.** Catálogo e pontuações: leitura pública, escrita só pela
`service_role` (jobs). `desejos` e `push_subscriptions`: cada usuário só vê os seus.
O app nunca recebe a chave `service_role`.

**Descoberta roda no GitHub Actions.** O ambiente de desenvolvimento na nuvem não tem
acesso aos sites da Livelo/Esfera (política de rede). O workflow manual
`descoberta.yml` roda o mesmo script num runner do GitHub e publica o relatório.
Observação: runners do GitHub ficam fora do Brasil; se os sites bloquearem por região
ou por bot, o relatório mostrará status 403 e a alternativa é rodar localmente com `--com-tela`.

**User agent identificável.** Configurável por `COLETA_USER_AGENT` (variável do repositório
no Actions). Intervalo padrão de 3 s entre páginas, ou o `Crawl-delay` do robots.txt se for maior.

## 2026-10-06 — App (Fase 3 adiantada)

**Fonte de dados plugável.** `apps/web/lib/dados` define uma interface única. Com as
variáveis do Supabase, lê do banco; sem elas, usa dados de demonstração determinísticos,
sempre com aviso na tela. Permite usar e publicar o app antes de a coleta existir.

**Valor "de hoje".** Se a coleta do dia ainda não rodou, mostra o valor mais recente dos
últimos 3 dias e informa a data na tela de categoria.

**Melhor mês por programa.** O cálculo roda separado para Livelo e Esfera (as promoções são
independentes), com o texto do template: "o melhor mês da Magalu na Livelo é…".

**Percentil 75** com interpolação linear sobre os picos mensais da loja (no programa).

**Gráfico em degraus (`stepAfter`).** A pontuação vale o dia inteiro e muda em saltos; a
linha em degrau mostra isso sem sugerir valores intermediários. Cores das séries:
slots 1 (azul) e 2 (laranja) da paleta categórica validada, com versões para tema escuro.

**PWA.** Manifest e ícones gerados pelo Next (sem binários no repo) e service worker com
cache de arquivos estáticos e rede-primeiro para páginas. O mesmo service worker receberá o
Web Push na Fase 4.
