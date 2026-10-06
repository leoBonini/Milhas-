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
