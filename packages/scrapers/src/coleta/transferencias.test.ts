import { test } from "node:test";
import assert from "node:assert/strict";
import { lerTransferenciaLivelo, normalizarTransferenciasEsfera } from "./transferencias";

test("Esfera sem campanha: 1:1 e bônus zero (dados reais de 2026-10-06)", () => {
  const [latam] = normalizarTransferenciasEsfera([{ partnerIdentifier: "dlta", points: 1, miles: 1, type: "DEFAULT", campaignId: null }]);
  assert.deepEqual([latam!.destino, latam!.paridade, latam!.bonusPercentual, latam!.campanha], ["LATAM Pass", "1:1", 0, null]);
});

test("Esfera com campanha: 100 mil viram 135 mil = 35%", () => {
  const [t] = normalizarTransferenciasEsfera([
    { partnerIdentifier: "dlta", points: 1, miles: 1, type: "DEFAULT", campaignId: null },
    { partnerIdentifier: "dlta", points: 1, miles: 1.35, type: "CAMPAIGN", campaignId: "C1" },
  ]);
  assert.equal(t!.bonusPercentual, 35);
  assert.equal(t!.campanha, "Campanha C1");
});

const pagina = (campaign: object) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { x: { partner: { campaign } } } } })}</script></html>`;

test("Livelo: campanha da Azul (texto real)", () => {
  const t = lerTransferenciaLivelo(
    pagina({
      bonus: "Consulte as regras da campanha para ganhar até {{bonus}}% de bônus.",
      longDescription: "<h3>Válida das 09h do dia 05/10 às 23h59 de 07/10/26</h3> <ul> <li>40% de bônus para não assinantes do Clube Azul;</li> <li>100% para clientes Clube Azul com 60 meses</li></ul>",
    }),
    "Azul Fidelidade",
    "u",
    new Date("2026-10-06T12:00:00-03:00"),
  );
  assert.equal(t.bonusPercentual, 100);
  assert.equal(t.bonusMinimo, 40);
  assert.equal(t.validaAte, "2026-10-07");
  assert.match(t.campanha!, /Válida das 09h do dia 05\/10/);
});

test("Livelo: LATAM sem campanha", () => {
  const t = lerTransferenciaLivelo(pagina({ bonus: "", longDescription: "", earnBonus: "" }), "LATAM Pass", "u");
  assert.equal(t.bonusPercentual, 0);
  assert.equal(t.campanha, null);
});

test("Livelo: campanha vencida não conta (Smiles, texto real)", () => {
  const t = lerTransferenciaLivelo(
    pagina({
      bonus: "Consulte as regras da campanha na página do parceiro para ganhar até 70% de bônus na Smiles.",
      longDescription: "<p>Válido das 10h do dia 28/09 às 23h59 do dia 30/09/26.</p><ul><li>40% bônus para todos os clientes.</li></ul>",
    }),
    "Smiles",
    "u",
    new Date("2026-10-06T12:00:00-03:00"),
  );
  assert.equal(t.bonusPercentual, 0);
  assert.equal(t.campanha, null);
});
