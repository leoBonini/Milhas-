import { test } from "node:test";
import assert from "node:assert/strict";
import { marcarPromocoes, type LojaHoje } from "./executar";

const oferta = (v: number, base: number | null) => ({ pontosPorReal: v, pontosBase: base, escopo: "loja toda", promocao: false, url: null, regra: "" });
const dias = (n: number, valor: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-10-${String(10 + i).padStart(2, "0")}`, valor]));

test("Esfera: valor acima do normal do mês vira promoção (Beleza na Web 1 -> 8)", () => {
  const lojas: LojaHoje[] = [{ slug: "beleza-na-web", nome: "Beleza na Web", categorias: [], livelo: null, esfera: oferta(8, 8) }];
  marcarPromocoes(lojas, { "beleza-na-web": { nome: "x", esfera: { ...dias(15, 1), "2026-10-26": 8 } } }, "2026-10-27");
  assert.equal(lojas[0]!.esfera!.pontosBase, 1);
  assert.equal(lojas[0]!.esfera!.promocao, true);
});

test("sem histórico suficiente não marca nada", () => {
  const lojas: LojaHoje[] = [{ slug: "a", nome: "A", categorias: [], livelo: null, esfera: oferta(8, 8) }];
  marcarPromocoes(lojas, { a: { nome: "A", esfera: dias(3, 1) } }, "2026-10-27");
  assert.equal(lojas[0]!.esfera!.promocao, false);
});

test("valor normal não é promoção", () => {
  const lojas: LojaHoje[] = [{ slug: "a", nome: "A", categorias: [], livelo: null, esfera: oferta(2, 2) }];
  marcarPromocoes(lojas, { a: { nome: "A", esfera: dias(15, 2) } }, "2026-10-27");
  assert.equal(lojas[0]!.esfera!.promocao, false);
});
