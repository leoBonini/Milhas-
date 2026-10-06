import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarParidadeLivelo } from "./livelo";

// Itens reais da API de 2026-10-06
const info = (codigo: string, nome: string, slug: string) => ({ codigo, nome, slug, categorias: [] });

test("promoção com 'até' (AGE)", () => {
  const p = normalizarParidadeLivelo(
    { partnerCode: "AGE", currency: "R$", currencyValue: 1, parity: 4, parityClub: 6, separator: "até", parityBau: 1, promotion: true },
    info("AGE", "Loja", "loja"),
  )!;
  assert.equal(p.pontosPorReal, 4);
  assert.equal(p.pontosBase, 1);
  assert.equal(p.promocao, true);
  assert.equal(p.escopo, "até (varia por produto ou categoria)");
  assert.match(p.regra, /Clube Livelo: 6/);
});

test("paridade por categoria (Mercado Livre)", () => {
  const p = normalizarParidadeLivelo(
    {
      partnerCode: "MCL", currency: "R$", currencyValue: 1, parity: 2, parityClub: 2, separator: "até", parityBau: 1, promotion: true,
      categoryParities: [{ name: "BEBÊS", parity: 2 }, { name: "BRINQUEDOS", parity: 2 }],
    },
    info("MCL", "Mercado Livre", "mercado-livre"),
  )!;
  assert.equal(p.pontosPorReal, 2);
  assert.equal(p.url, "https://www.livelo.com.br/juntar-pontos/parceiros/mercado-livre/MCL");
});

test("a cada N reais e dólar", () => {
  assert.equal(normalizarParidadeLivelo({ partnerCode: "X", currencyValue: 5, parity: 2 }, info("X", "X", "x"))!.pontosPorReal, 0.4);
  assert.equal(normalizarParidadeLivelo({ partnerCode: "Y", currency: "U$", currencyValue: 1, parity: 3 }, info("Y", "Y", "y"))!.escopo, "por dólar");
});

test("sem nome conhecido não entra", () => {
  assert.equal(normalizarParidadeLivelo({ partnerCode: "ZZZ", parity: 3 }, undefined), null);
});

import { lerCartoesLivelo } from "./livelo";

test("cartões: nome pelo alt, sem confundir 'Pontofrio' com pontuação", () => {
  const cartao = (slug: string, cod: string, alt: string, textos: string[]) =>
    `<a data-testid="a_PartnerCard_card_link" href="https://www.livelo.com.br/juntar-pontos/parceiros/${slug}/${cod}"><img data-testid="img_PartnerCard_partnerImage" alt="${alt}"/>${textos
      .map((t) => `<span data-testid="Text_Typography">${t}</span>`)
      .join("")}</a>`;
  const html =
    cartao("pontofrio", "PTF", "Pontofrio", ["Até 1 ponto por R$1"]) +
    cartao("mercado-livre", "MCL", "", ["Promoção", "Mercado Livre", "Até 2 pontos por R$1", "Ir para regras do parceiro"]) +
    cartao("cea", "CEA", "Ganhe 3 pontos", []);
  assert.deepEqual(
    lerCartoesLivelo(html).map((c) => [c.codigo, c.nome]),
    [["PTF", "Pontofrio"], ["MCL", "Mercado Livre"], ["CEA", "Cea"]],
  );
});
