# Milhas

App (PWA) que mostra quantos pontos por real cada loja parceira da **Livelo** e da **Esfera**
paga hoje, com histórico em gráfico e sugestão do melhor mês para comprar.

Regra principal: **nenhuma ação do usuário gera custo variável**. Toda coleta roda em jobs
agendados; o app só lê dados prontos do banco.

## Estrutura

```
/apps/web            -> Next.js (PWA)                     [Fase 3 — pronto]
/packages/scrapers   -> descoberta (Fase 0) e coletores    [Fase 0/1/2]
/packages/core       -> tipos, busca, melhor mês + testes  [pronto]
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

## O app (Fase 3)

```bash
npm run dev -w @milhas/web     # http://localhost:3000
```

Sem `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` o app roda com **dados de
demonstração** (simulados, com aviso amarelo na tela). Com as duas variáveis preenchidas,
lê do Supabase (view `pontuacao_diaria`). O app nunca chama sites externos: só lê o banco.

Telas: Início (melhores de hoje + categorias), Busca (normaliza o termo e procura em
`palavras_chave`), Categoria (lojas ordenadas, Livelo e Esfera lado a lado) e, ao tocar
numa loja, gráfico do histórico com filtros 6 meses / 1 ano / tudo e sugestão de melhor mês.

### Publicar (Vercel, gratuito para começar)

1. Em vercel.com, "Add New Project" e importe este repositório.
2. Root Directory: `apps/web` (o Vercel detecta o Next.js e instala o monorepo).
3. Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou deixe vazio para o modo demonstração).
4. Deploy. No celular, abra o endereço e use "Adicionar à tela inicial".

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
