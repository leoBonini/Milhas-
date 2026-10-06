# Fontes de dados

> **Status: pendente.** Nenhuma URL abaixo foi presumida. As seções serão preenchidas
> com o resultado real do script de descoberta (`npm run descobrir`), rodado onde houver
> acesso aos sites (GitHub Actions ou máquina local).

## Como gerar as informações

1. GitHub: **Actions > Descoberta de fontes > Run workflow** (programa = `todos`).
2. O resumo aparece na própria execução (Summary). O artefato `descoberta-<id>` traz:
   - `relatorio.md`: robots.txt, páginas visitadas, candidatos a endpoint JSON (com headers e exemplo de item) e seletores HTML alternativos
   - `requisicoes.json`: todas as requisições XHR/fetch capturadas
   - `corpos/NNN.json`: corpo de cada resposta JSON
   - `paginas/NN.html` e `NN.png`: HTML renderizado e print de cada página
3. Se a página de parceiros não for achada pelos links da home, rode de novo informando a URL
   em `url` (escolhendo um programa só).
4. Se o site bloquear o navegador headless, rode localmente com tela:
   `npm run descobrir -- --programa livelo --com-tela`

Como o script decide o que é "candidato": percorre cada JSON e pontua listas de objetos que
tenham campo de nome (`name`, `nome`, `title`…), campo de pontos (`points`, `pontos`,
`parity`, `multiplier`, `accrual`…), campo de id, e que citem lojas conhecidas
(Magalu, Fast Shop, Amazon…). No HTML, procura textos como "10 pontos por real" e "8x1"
e agrupa pelo seletor CSS.

---

## Livelo

| Item | Valor |
|---|---|
| Página de parceiros | _pendente_ |
| robots.txt | _pendente_ |
| Tipo de fonte | _pendente_ (JSON ou HTML) |

### Endpoint de parceiros

- URL: _pendente_
- Método e parâmetros: _pendente_
- Headers necessários: _pendente_
- Paginação: _pendente_

Exemplo de resposta (resumido):

```json
pendente
```

Campos usados:

| Campo na resposta | Uso no banco |
|---|---|
| _pendente_ | `parceiro_programa.id_externo` |
| _pendente_ | `parceiros.nome` |
| _pendente_ | `pontuacoes.pontos_por_real` |
| _pendente_ | `pontuacoes.pontos_base` |
| _pendente_ | `parceiro_programa.url_parceiro` |

### Seletores HTML (se não houver JSON)

_pendente_

---

## Esfera

| Item | Valor |
|---|---|
| Página de parceiros | _pendente_ |
| robots.txt | _pendente_ |
| Tipo de fonte | _pendente_ (JSON ou HTML) |

### Endpoint de parceiros

- URL: _pendente_
- Método e parâmetros: _pendente_
- Headers necessários: _pendente_
- Paginação: _pendente_

Exemplo de resposta (resumido):

```json
pendente
```

Campos usados:

| Campo na resposta | Uso no banco |
|---|---|
| _pendente_ | `parceiro_programa.id_externo` |
| _pendente_ | `parceiros.nome` |
| _pendente_ | `pontuacoes.pontos_por_real` |
| _pendente_ | `pontuacoes.pontos_base` |
| _pendente_ | `parceiro_programa.url_parceiro` |

### Seletores HTML (se não houver JSON)

_pendente_

---

## Nomes exatos das lojas iniciais

Confirmar com os dados reais e atualizar `supabase/seed.sql` (nome e aliases).

| Seed | Nome na Livelo | Nome na Esfera |
|---|---|---|
| Apple | _pendente_ | _pendente_ |
| Fast Shop | _pendente_ | _pendente_ |
| Magalu | _pendente_ | _pendente_ |
| Casas Bahia | _pendente_ | _pendente_ |
| Extra | _pendente_ | _pendente_ |
| Ponto | _pendente_ | _pendente_ |
| Amazon | _pendente_ | _pendente_ |
| Carrefour | _pendente_ | _pendente_ |
| Americanas | _pendente_ | _pendente_ |
| Samsung | _pendente_ | _pendente_ |
| Mercado Livre | _pendente_ | _pendente_ |
| Kabum | _pendente_ | _pendente_ |
| Girafa | _pendente_ | _pendente_ |

## Blogs (Fase 2)

Passageiro de Primeira e Pontos pra Voar: páginas de arquivo/tag a descobrir na Fase 2.
