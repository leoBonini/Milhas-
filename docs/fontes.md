# Fontes de dados

Levantadas em 2026-10-06 pela descoberta (`npm run descobrir`) e pela inspeção
(`npm run inspecionar`), rodadas no GitHub Actions. Nada aqui foi presumido: cada
endereço foi chamado e a resposta conferida.

Regras de acesso usadas pelos coletores: user agent identificável (`COLETA_USER_AGENT`),
3 s entre requisições ao mesmo site, só GET em páginas/APIs públicas que o próprio site usa.
robots.txt da Livelo: `User-agent: * / Allow: /`.

---

## Esfera

### Parceiros e pontuação (JSON)

- **GET** `https://apigw.esfera.com.vc/bff-product/ehcs/products?categoryId=esf02163`
- Headers necessários: `siteid: esfera`, `origin: https://www.esfera.com.vc`, `referer: https://www.esfera.com.vc/`
- Resposta (~2,9 MB): `{ totalResults: 170, limit: 250, items: [...] }`. Sem paginação enquanto `totalResults <= 250`
  (o coletor falha se passar disso).
- Página correspondente no site: https://www.esfera.com.vc/junte-pontos/junte-pontos/esf02163

Campos usados de cada item:

| Campo | Uso |
|---|---|
| `id` (ex: `e000100100`) | `idExterno` |
| `displayName` | nome da loja |
| `esf_accumulationValue` | pontos (numerador) |
| `esf_accumulationFactorValue` | a cada N reais (denominador). Pontos por real = valor / fator |
| `esf_accumulationPrefix` | "Até" → escopo "até" |
| `esf_accumulationFactorDescription` | "Real em compra" / "dólar em compra" (dólar → escopo "por dólar") |
| `externalInfo.amount` + `externalInfo.rule` | texto exibido, ex: "De 6 a 8 pts" "a cada 2 reais" (usa o maior) |
| `esf_tempOfferAccumulationValue`, `esf_tempOfferInit`, `esf_tempOfferEnd` | oferta temporária (só conta dentro da janela; datas `dd-mm-yyyy HH:MM`, placeholder `dd-mm-yyyy HH:MM` = sem oferta) |
| `skuForShowcase.categoryIds`, `parentCategories[].repositoryId` | categorias (mapeadas em `packages/core/src/categorias.ts`) |
| `route` | link: `https://www.esfera.com.vc{route}` |

Exemplos reais: Magalu `1/1` = 1 pt/R$ (até); Dell `1/3` = 0,33; Azul `1/4` = 0,25.

### Transferência para milhas

- **GET** `https://apigw.esfera.com.vc/bff-miles/ehis/parity/factor-wi?skus=dlta,dsml,dazl,...` (mesmos headers)
- Resposta: `[{ partnerIdentifier: "dlta", points: 1, miles: 1, type: "DEFAULT", campaignId: null }, ...]`
- `dlta` LATAM Pass, `dsml` Smiles, `dazl` Azul, `dibp` Iberia, `stap` TAP, `sair` Flying Blue, etc.
- Bônus = paridade padrão ÷ paridade da campanha − 1 (linha com `campaignId`). Em 2026-10-06 todas eram `DEFAULT` (sem bônus).

---

## Livelo

O site `www.livelo.com.br` bloqueia navegador automatizado (headless) com "Access Denied",
mas responde normalmente a requisições simples com o nosso user agent.

### Paridades (JSON)

- **GET** `https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/parities/active`
- Headers: `origin: https://www.livelo.com.br`, `referer: https://www.livelo.com.br/`
- Resposta: lista com 468 itens:

```json
{"partnerCode":"AGE","currency":"R$","currencyValue":1,"parity":4,"parityClub":6,
 "parityBau":1,"promotion":true,"separator":"até","categoryParities":[]}
```

| Campo | Uso |
|---|---|
| `partnerCode` | código da loja (casa com a página de parceiros) |
| `parity` | pontos hoje (com promoção) |
| `parityBau` | pontuação padrão → `pontosBase` |
| `parityClub` | pontos para assinantes do Clube Livelo (mostrado na regra) |
| `currencyValue` | a cada N reais; `currency` `U$` → por dólar |
| `separator` = "até", `categoryParities` | escopo "até (varia por produto ou categoria)"; vale o maior |
| `promotion` | selo de promoção |

### Nomes dos parceiros (HTML)

- **GET** `https://www.livelo.com.br/juntar-pontos/todos-os-parceiros` (HTML ~1,5 MB, renderizado no servidor)
- Cada parceiro é um cartão `<a data-testid="a_PartnerCard_card_link" href=".../juntar-pontos/parceiros/<slug>/<CODIGO>">`
  com imagem `data-testid="img_PartnerCard_partnerImage"` (alt) e textos `data-testid="Text_Typography"`.
- 251 cartões em 2026-10-06. **Só entra no app quem tem cartão nesta página** (parceiro ativo hoje).
- A página não traz categoria por loja: a categoria vem da mesma loja na Esfera ou do nome (`categoriasPorNome`).

### Transferência para milhas (HTML com dados embutidos)

- `https://www.livelo.com.br/livelo-para-parceiros/latam/MTPTransfer` (LATAM Pass)
- `https://www.livelo.com.br/livelo-para-parceiros/smiles/SMLTransfer` (Smiles)
- `https://www.livelo.com.br/livelo-para-parceiros/azul/AZLTransfer` (Azul)
- Dentro de `<script id="__NEXT_DATA__">`, o objeto `partner.campaign` traz `bonus` (texto) e
  `longDescription` (HTML com validade e faixas, ex: "40% de bônus para não assinantes ... 100% para ...").
- O coletor pega o maior e o menor % e a última data do texto como fim; **campanha vencida é descartada**
  (a página da Smiles ainda mostrava uma campanha de 28 a 30/09 em 06/10).
- A paridade base (pontos:milhas) não aparece nessas páginas.

---

## Lojas iniciais (seed) × realidade em 2026-10-06

| Seed | Livelo | Esfera |
|---|---|---|
| Apple | não é parceira | não é parceira |
| Fast Shop | FST | sim |
| Magalu | MZL | sim |
| Casas Bahia | CSB | não |
| Extra | EXT | não |
| Ponto | PTF (Pontofrio) | não |
| Amazon | não | não |
| Carrefour | Carrefour Mercado (CRM) e Carrefour Shopping (CRF) | Carrefour |
| Americanas | não | não |
| Samsung | cartão SSG na página, mas sem paridade na API (não entra) | sim |
| Mercado Livre | MCL | não |
| Kabum | KBM (Kabum!) | sim |
| Girafa | não | não |

## Blogs (Fase 2)

Passageiro de Primeira e Pontos pra Voar: a descobrir na Fase 2.
