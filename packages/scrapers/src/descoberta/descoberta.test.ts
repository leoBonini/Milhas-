import { test } from "node:test";
import assert from "node:assert/strict";
import { caminhoPermitido, interpretarRobots } from "./robots.js";
import { encontrarListasCandidatas, REGEX_TEXTO_PONTOS } from "./analise.js";

test("robots: respeita Disallow do bloco * e Allow mais específico", () => {
  const r = interpretarRobots(
    "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /conta\nAllow: /conta/publico\nCrawl-delay: 5\n",
    "MilhasBot",
  );
  assert.deepEqual(r.bloquear, ["/conta"]);
  assert.equal(r.intervaloSegundos, 5);
  assert.equal(caminhoPermitido(r, "/parceiros"), true);
  assert.equal(caminhoPermitido(r, "/conta/extrato"), false);
  assert.equal(caminhoPermitido(r, "/conta/publico/x"), true);
});

test("robots: curinga e âncora de fim", () => {
  const r = interpretarRobots("User-agent: *\nDisallow: /*.json$\nDisallow: /busca*?q=\n", "MilhasBot");
  assert.equal(caminhoPermitido(r, "/api/lojas.json"), false);
  assert.equal(caminhoPermitido(r, "/api/lojas.json?x=1"), true);
  assert.equal(caminhoPermitido(r, "/busca/?q=iphone"), false);
});

test("análise: lista de parceiros com pontos fica em primeiro", () => {
  const json = {
    menu: [{ label: "a" }, { label: "b" }, { label: "c" }],
    resultado: {
      itens: [
        { id: 1, nome: "Magalu", pontuacao: { pontos: 5 } },
        { id: 2, nome: "Fast Shop", pontuacao: { pontos: 8 } },
        { id: 3, nome: "Amazon", pontuacao: { pontos: 3 } },
      ],
    },
  };
  const [primeira] = encontrarListasCandidatas(json);
  assert.equal(primeira?.caminho, "$.resultado.itens");
  assert.deepEqual(primeira?.chavesNome, ["nome"]);
  assert.ok(primeira?.chavesPontos.includes("pontuacao.pontos"));
  assert.deepEqual(primeira?.lojasEncontradas.sort(), ["amazon", "fast shop", "magalu"]);
});

test("regex de pontuação reconhece os formatos comuns", () => {
  for (const t of ["10 pontos por real", "até 7 pontos por real", "3 pts/R$", "8x1", "paridade de 10×1", "2,5 pontos a cada real"]) {
    assert.match(t, REGEX_TEXTO_PONTOS, t);
  }
  assert.doesNotMatch("Frete grátis em 10x sem juros", REGEX_TEXTO_PONTOS);
});
