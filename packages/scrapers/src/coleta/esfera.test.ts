import { test } from "node:test";
import assert from "node:assert/strict";
import { lerDataEsfera, maiorNumero, normalizarItemEsfera } from "./esfera.js";

// Itens reduzidos a partir da resposta real de 2026-10-06
const magalu = {
  id: "e000100100",
  displayName: "Magalu",
  route: "/p/magalu/e000100100",
  esf_accumulationValue: "1",
  esf_accumulationFactorValue: "1",
  esf_accumulationPrefix: "Até",
  esf_tempOfferInit: "dd-mm-yyyy HH:MM",
  esf_tempOfferEnd: "dd-mm-yyyy HH:MM",
  skuForShowcase: { categoryIds: ["esf02163", "newCasaDecoracao"] },
};

test("Magalu: 1 ponto por real, até", () => {
  const p = normalizarItemEsfera(magalu)!;
  assert.equal(p.pontosPorReal, 1);
  assert.equal(p.escopo, "até (varia por produto ou cliente)");
  assert.equal(p.url, "https://www.esfera.com.vc/p/magalu/e000100100");
  assert.deepEqual(p.categorias, ["casa"]);
});

test("Azul: 1 ponto a cada 4 reais = 0,25", () => {
  const p = normalizarItemEsfera({ id: "e1", displayName: "Azul", esf_accumulationValue: "1", esf_accumulationFactorValue: "4" })!;
  assert.equal(p.pontosPorReal, 0.25);
  assert.equal(p.escopo, "loja toda");
});

test("faixa exibida 'De 6 a 8 pts a cada 2 reais' vale 4 por real", () => {
  const p = normalizarItemEsfera({
    id: "e2",
    displayName: "Loja",
    esf_accumulationValue: "1",
    esf_accumulationFactorValue: "1",
    externalInfo: { amount: "De 6 a 8 pts", rule: "a cada 2 reais" },
    skuForShowcase: { categoryIds: ["newModaCalcadosAcessorios", "esf02163"] },
  })!;
  assert.equal(p.pontosPorReal, 4);
  assert.equal(p.pontosBase, 1);
  assert.equal(p.promocao, true);
  assert.deepEqual(p.categorias, ["moda"]);
});

test("oferta temporária só conta dentro da janela", () => {
  const item = {
    id: "e3",
    displayName: "Loja",
    esf_accumulationValue: "2",
    esf_accumulationFactorValue: "1",
    esf_tempOfferAccumulationValue: " 10 pontos ",
    esf_tempOfferInit: "15-07-2025 09:00",
    esf_tempOfferEnd: "16-07-2025 23:00",
  };
  assert.equal(normalizarItemEsfera(item, new Date("2025-07-15T15:00:00-03:00"))!.pontosPorReal, 10);
  assert.equal(normalizarItemEsfera(item, new Date("2025-07-20T15:00:00-03:00"))!.pontosPorReal, 2);
});

test("dólar e itens inválidos", () => {
  const p = normalizarItemEsfera({ id: "e4", displayName: "Booking.com", esf_accumulationValue: "1", esf_accumulationFactorValue: "1", esf_accumulationFactorDescription: "dólar em compra" })!;
  assert.equal(p.escopo, "por dólar");
  assert.equal(normalizarItemEsfera({ id: "e5", displayName: "Sem regra" }), null);
  assert.equal(normalizarItemEsfera({ id: "e6", displayName: "Inativa", active: false, esf_accumulationValue: "1" }), null);
});

test("utilitários", () => {
  assert.equal(maiorNumero("De 6 a 8 pts"), 8);
  assert.equal(maiorNumero("2,5 pontos"), 2.5);
  assert.equal(lerDataEsfera("dd-mm-yyyy HH:MM"), null);
  assert.equal(lerDataEsfera("15-07-2025 23:00")?.toISOString(), "2025-07-16T02:00:00.000Z");
});
