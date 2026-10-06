# Milhas

App (PWA) que mostra quantos pontos por real cada loja parceira da **Livelo** e da **Esfera**
paga hoje, com histórico em gráfico e sugestão do melhor mês para comprar.

Regra principal: **nenhuma ação do usuário gera custo variável**. Toda coleta roda em jobs
agendados; o app só lê dados prontos do banco.

## Estrutura

```
/apps/web            -> Next.js (PWA)                     [Fase 3]
/packages/scrapers   -> descoberta (Fase 0) e coletores    [Fase 0/1/2]
/packages/core       -> tipos, categorias, melhor mês      [Fase 3]
/supabase/migrations -> SQL do banco
/supabase/seed.sql   -> dados iniciais
/docs                -> fontes.md, decisoes.md
/.github/workflows   -> descoberta, testes e (Fase 1) cron da coleta
```

## Começando

```bash
npm install
cp .env.example .env      # preencher conforme a fase
npm test                  # testes de todos os pacotes
npm run typecheck
```

## Fase 0 — descoberta das fontes

```bash
# Precisa de acesso aos sites. No Linux, se faltar o Chromium:
#   npm exec -w @milhas/scrapers -- playwright install --with-deps chromium
npm run descobrir                                   # livelo e esfera
npm run descobrir -- --programa esfera --url <url>  # começar de uma página específica
npm run descobrir -- --programa livelo --com-tela   # navegador visível
```

Resultado em `saida/descoberta/<programa>/relatorio.md`. Pelo GitHub:
**Actions > Descoberta de fontes > Run workflow**. Detalhes em [docs/fontes.md](docs/fontes.md).

## Banco (Supabase)

```bash
supabase db reset   # aplica migrations + seed no banco local (Supabase CLI)
```
