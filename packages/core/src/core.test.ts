import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularMelhorMes, percentil, textoMelhorMes } from "./melhorMes";
import { encontrarCategoria, normalizarTermo } from "./texto";
import type { PontoDiario } from "./tipos";

/** Gera um ponto por dia 1 de cada mês, com o pico informado por mês. */
function serie(anos: number[], picoPorMes: (ano: number, mes: number) => number): PontoDiario[] {
  const r: PontoDiario[] = [];
  for (const ano of anos)
    for (let mes = 1; mes <= 12; mes++) {
      const mm = String(mes).padStart(2, "0");
      r.push({ data: `${ano}-${mm}-01`, pontos: 2 }, { data: `${ano}-${mm}-15`, pontos: picoPorMes(ano, mes) });
    }
  return r;
}

test("percentil com interpolação linear", () => {
  assert.equal(percentil([1, 2, 3, 4], 0.75), 3.25);
  assert.equal(percentil([5], 0.75), 5);
  assert.equal(percentil([], 0.75), 0);
});

test("novembro vence quando é pico em todos os anos", () => {
  const r = calcularMelhorMes(serie([2023, 2024, 2025], (_a, m) => (m === 11 ? 10 : m === 5 ? 6 : 3)));
  assert.equal(r.mesesComDados, 36);
  assert.equal(r.sugestao?.mes, 11);
  assert.equal(r.sugestao?.frequencia, 3);
  assert.equal(r.sugestao?.media, 10);
  assert.equal(
    textoMelhorMes("Magalu", r),
    "Historicamente, o melhor mês da Magalu é novembro, com média de 10 pontos por real nos últimos 3 anos.",
  );
});

test("frequência pesa mais que média", () => {
  // Picos: ago=8, set=7, out=7 todo ano; março=30 só em 2024. O p75 fica em 7.
  // Março tem a maior média (12), mas só 1 ano no p75; agosto tem 3 anos.
  const r = calcularMelhorMes(
    serie([2023, 2024, 2025], (a, m) => (m === 3 && a === 2024 ? 30 : m === 8 ? 8 : m === 9 || m === 10 ? 7 : 3)),
  );
  assert.equal(r.percentil75, 7);
  assert.equal(r.ranking[0]?.mes, 8);
  assert.ok(r.ranking.find((x) => x.mes === 3)!.media > r.ranking[0]!.media);
});

test("empate em frequência é decidido pela média", () => {
  const r = calcularMelhorMes(serie([2024, 2025], (_a, m) => (m === 6 ? 9 : m === 12 ? 9.5 : m === 1 ? 9 : 3)));
  assert.equal(r.ranking[0]?.mes, 12);
});

test("sem 12 meses de dados não há sugestão", () => {
  const r = calcularMelhorMes(serie([2025], (_a, m) => (m === 11 ? 10 : 3)).filter((p) => p.data < "2025-11-30"));
  assert.equal(r.mesesComDados, 11);
  assert.equal(r.sugestao, null);
  assert.equal(textoMelhorMes("Kabum", r), "Ainda estamos montando o histórico desta loja.");
});

test("vencedor que só apareceu em 1 ano não vira sugestão", () => {
  const r = calcularMelhorMes(serie([2025], (_a, m) => (m === 11 ? 10 : 3)));
  assert.equal(r.mesesComDados, 12);
  assert.equal(r.ranking[0]?.mes, 11);
  assert.equal(r.sugestao, null);
});

test("normalização e busca por palavra-chave", () => {
  assert.equal(normalizarTermo("  Televisão  4K! "), "televisao 4k");
  const palavras = [
    { termo: "tv", categoria_id: "eletronicos" },
    { termo: "smart tv", categoria_id: "tvs" },
    { termo: "iphone", categoria_id: "eletronicos" },
  ];
  assert.equal(encontrarCategoria("iPhone 15 Pro", palavras), "eletronicos");
  assert.equal(encontrarCategoria("Smart TV Samsung", palavras), "tvs");
  assert.equal(encontrarCategoria("tvzinha", palavras), null);
  assert.equal(encontrarCategoria("geladeira", palavras), null);
});

import { categoriasPorNome } from "./categorias";

test("categorias pelo nome da loja", () => {
  assert.deepEqual(categoriasPorNome("Fast Shop"), ["eletronicos", "casa"]);
  assert.deepEqual(categoriasPorNome("Drogaria São Paulo"), ["saude"]);
  assert.deepEqual(categoriasPorNome("Booking.com"), ["viagem"]);
  assert.deepEqual(categoriasPorNome("Bradesco Consórcios"), ["servicos"]);
  assert.deepEqual(categoriasPorNome("Xyzabc"), []);
});
