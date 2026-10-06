import { lerTransferenciaLivelo, normalizarTransferenciasEsfera, DESTINOS_ESFERA, type ParidadeEsfera, type TransferenciaColetada } from "./transferencias";
import { esperar } from "./util";

export async function coletarTransferenciasEsfera(ua: string): Promise<TransferenciaColetada[]> {
  const url = `https://apigw.esfera.com.vc/bff-miles/ehis/parity/factor-wi?skus=${Object.keys(DESTINOS_ESFERA).join(",")}`;
  const r = await fetch(url, {
    headers: { "user-agent": ua, accept: "application/json", siteid: "esfera", origin: "https://www.esfera.com.vc", referer: "https://www.esfera.com.vc/" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`respondeu ${r.status}`);
  const linhas = (await r.json()) as ParidadeEsfera[];
  if (!Array.isArray(linhas) || !linhas.length) throw new Error("resposta vazia");
  return normalizarTransferenciasEsfera(linhas);
}

/** Páginas de transferência da Livelo (links do rodapé do site). */
const DESTINOS_LIVELO = [
  { nome: "LATAM Pass", caminho: "latam/MTPTransfer" },
  { nome: "Smiles", caminho: "smiles/SMLTransfer" },
  { nome: "Azul Fidelidade", caminho: "azul/AZLTransfer" },
];

export async function coletarTransferenciasLivelo(ua: string): Promise<TransferenciaColetada[]> {
  const resultado: TransferenciaColetada[] = [];
  for (const d of DESTINOS_LIVELO) {
    const url = `https://www.livelo.com.br/livelo-para-parceiros/${d.caminho}`;
    const r = await fetch(url, { headers: { "user-agent": ua, accept: "text/html" }, signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`${d.nome} respondeu ${r.status}`);
    resultado.push(lerTransferenciaLivelo(await r.text(), d.nome, url));
    await esperar(3000);
  }
  return resultado;
}
