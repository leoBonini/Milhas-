// Inspeção direta das APIs encontradas na descoberta: imprime, de forma compacta,
// todos os campos simples de alguns itens, para identificar onde está a pontuação.
// Uso: npm run inspecionar -w @milhas/scrapers

import { encontrarListasCandidatas } from "./analise.js";

const UA = process.env.COLETA_USER_AGENT || "MilhasBot/0.1 (+https://github.com/leoBonini/Milhas-)";

function achatar(obj: unknown, prefixo = "", saida: Record<string, unknown> = {}, profundidade = 0) {
  if (profundidade > 3 || obj == null || typeof obj !== "object") return saida;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const chave = prefixo ? `${prefixo}.${k}` : k;
    if (v == null) continue;
    if (Array.isArray(v)) saida[chave] = `[${v.length}] ${JSON.stringify(v).slice(0, 160)}`;
    else if (typeof v === "object") achatar(v, chave, saida, profundidade + 1);
    else saida[chave] = typeof v === "string" ? v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160) : v;
  }
  return saida;
}

async function buscar(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json", ...headers } });
  const texto = await r.text();
  console.log(`\n=== ${r.status} ${url} (${texto.length} bytes, ${r.headers.get("content-type")})`);
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    console.log(texto.slice(0, 300));
    return undefined;
  }
}

async function esfera() {
  const json = (await buscar("https://apigw.esfera.com.vc/bff-product/ehcs/products?categoryId=esf02163", {
    siteid: "esfera",
    origin: "https://www.esfera.com.vc",
    referer: "https://www.esfera.com.vc/",
  })) as { items?: Record<string, unknown>[]; totalResults?: number; hasMore?: boolean } | undefined;
  if (!json?.items) return;
  const { items, ...resto } = json;
  console.log("Metadados:", JSON.stringify(resto).slice(0, 400));
  console.log("Itens:", items.length);

  const planos = items.map((i) => achatar(i));
  // Campos que variam entre itens: são os candidatos a pontuação/categoria
  const chaves = [...new Set(planos.flatMap((p) => Object.keys(p)))].sort();
  console.log("\n--- Campos (valores distintos, exemplos) ---");
  for (const k of chaves) {
    const valores = [...new Set(planos.map((p) => p[k]).filter((v) => v !== undefined).map(String))];
    if (k.toLowerCase().includes("description") && valores.length > 20) continue;
    console.log(`${k} :: ${valores.length} distintos :: ${valores.slice(0, 6).join(" ¦ ").slice(0, 300)}`);
  }
  for (const nome of ["Magalu", "Azul", "Dell", "Fast Shop"]) {
    const i = planos.find((p) => p.displayName === nome);
    if (i) console.log(`\n--- ${nome} ---\n${JSON.stringify(i, null, 1).slice(0, 6000)}`);
  }
}

async function esferaTransferencias() {
  const cab = { siteid: "esfera", origin: "https://www.esfera.com.vc", referer: "https://www.esfera.com.vc/" };
  const j = await buscar("https://apigw.esfera.com.vc/bff-miles/ehis/parity/factor-wi?skus=saer,dazl,dacr,dcop,sair,dibp,sihg,dlta,dsml,stap,stks", cab);
  console.log(JSON.stringify(j).slice(0, 4000));
  await new Promise((r) => setTimeout(r, 2000));
  const ids = "e000100738,e000100099,e000100002,e000100158,e000100695,e000200002,e000100730,e000100072,e000100736,e000100101,e000100734,e000100001,e000100732,e000200000,e000100698,e000100701,e000100704,e000100706,e000100710";
  const p = (await buscar(`https://apigw.esfera.com.vc/bff-product/ehcs/products?limit=250&continueOnMissingProduct=true&productIds=${ids}`, cab)) as
    | { items?: Record<string, unknown>[] }
    | undefined;
  for (const i of p?.items ?? []) {
    const plano = achatar(i);
    const campos = Object.entries(plano).filter(([k]) => /displayName|transfer|parity|factor|bonus|bônus|route|esf_skuCode|id$/i.test(k) && !/image/i.test(k));
    console.log(`\n--- ${plano.displayName}: ${campos.map(([k, v]) => `${k}=${String(v).slice(0, 120)}`).join(" | ")}`);
  }
}

async function livelo() {
  const cab = { origin: "https://www.livelo.com.br", referer: "https://www.livelo.com.br/" };
  const paridades = (await buscar("https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/parities/active", cab)) as
    | Record<string, unknown>[]
    | undefined;
  if (Array.isArray(paridades)) {
    console.log("Paridades:", paridades.length);
    const planos = paridades.map((p) => achatar(p));
    const chaves = [...new Set(planos.flatMap((p) => Object.keys(p)))].sort();
    for (const k of chaves) {
      if (k === "legalTerms") continue;
      const valores = [...new Set(planos.map((p) => p[k]).filter((v) => v !== undefined).map(String))];
      console.log(`${k} :: ${valores.length} distintos :: ${valores.slice(0, 8).join(" ¦ ").slice(0, 300)}`);
    }
    console.log("Com categoryParities:", JSON.stringify(paridades.filter((p) => (p.categoryParities as unknown[])?.length).slice(0, 2)).slice(0, 1500));
    console.log("Códigos:", paridades.map((p) => `${p.partnerCode}=${p.parity}${p.promotion ? "*" : ""}`).join(" "));
  }

  // Página de parceiros sem navegador: procura dados embutidos e endereços de API no HTML
  await new Promise((r) => setTimeout(r, 2000));
  const r = await fetch("https://www.livelo.com.br/juntar-pontos/todos-os-parceiros", { headers: { "user-agent": UA, accept: "text/html" } });
  const html = await r.text();
  console.log(`\n=== ${r.status} página de parceiros (${html.length} bytes)`);
  const apis = [...new Set(html.match(/https?:\/\/[a-z0-9.-]*(?:livelo|pontoslivelo)[a-z0-9.-]*\/[^"'\s<>)]*/gi) ?? [])];
  console.log("URLs no HTML:", apis.slice(0, 60).join("\n"));
  const dadosNext = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (dadosNext) {
    const json = JSON.parse(dadosNext) as unknown;
    const candidatas = encontrarListasCandidatas(json).slice(0, 5);
    for (const c of candidatas) {
      console.log(`\n--- lista ${c.caminho} (${c.quantidade} itens, pontuação ${c.pontuacao}) chaves: ${c.chaves.join(", ").slice(0, 800)}`);
      console.log(JSON.stringify(c.exemplos[0]).slice(0, 2500));
    }
    const melhor = candidatas.find((c) => c.chaves.some((k) => /partnerCode|code/i.test(k)) && c.quantidade > 100) ?? candidatas[0];
    if (melhor) {
      console.log(`\n--- LISTA COMPLETA ${melhor.caminho}`);
      const nomeK = melhor.chaves.find((k) => /^(name|nome|title|partnerName|displayName)$/i.test(k)) ?? "name";
      const codK = melhor.chaves.find((k) => /partnerCode|^code$/i.test(k)) ?? "id";
      const catK = melhor.chaves.filter((k) => /categor/i.test(k));
      for (const i of melhor.itens) {
        const v = (k: string) => JSON.stringify(k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], i))?.slice(0, 200);
        console.log([v(codK), v(nomeK), ...catK.map(v)].join(" | "));
      }
    }
  }
  // Links de parceiros: /juntar-pontos/parceiros/<slug>/<CODIGO>
  const links = new Map<string, string>();
  for (const m of html.matchAll(/juntar-pontos\/parceiros\/([a-z0-9-]+)\/([A-Z0-9]{2,4})/g)) links.set(m[2]!, m[1]!);
  console.log(`Links de parceiros distintos: ${links.size}`);
  console.log([...links].map(([c, s]) => `${c}=${s}`).join(" "));
  // Contexto em volta de partnerCode (para achar nome e categoria)
  let n = 0;
  for (const m of html.matchAll(/partnerCode/g)) {
    if (n++ >= 4) break;
    console.log(`\n[contexto ${n}] ${html.slice(Math.max(0, m.index! - 600), m.index! + 600).replace(/\s+/g, " ")}`);
  }
  console.log("\nTotal 'partnerCode' no HTML:", html.match(/partnerCode/g)?.length);
  for (const termo of ["categor", "Eletr", "transferir", "latam", "smiles", "azul"]) {
    const ocorr = [...html.matchAll(new RegExp(termo, "gi"))].length;
    const ex = html.match(new RegExp(`.{0,150}${termo}.{0,150}`, "i"))?.[0]?.replace(/\s+/g, " ");
    console.log(`\n[termo ${termo}] ${ocorr}x :: ${ex}`);
  }
  const linksTransf = [...new Set(html.match(/https?:\/\/[^"'\s<>]*transf[^"'\s<>]*/gi) ?? [])];
  console.log("\nLinks com 'transf':", linksTransf.slice(0, 20).join("\n"));

  for (const url of [
    "https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/partners",
    "https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/partners/active",
    "https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/parities",
  ]) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const j = await buscar(url, cab);
      if (j !== undefined) console.log(JSON.stringify(j).slice(0, 1500));
    } catch (e) {
      console.log(`falhou: ${url}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

const alvo = process.env.INSPECIONAR || "todos";
if (alvo === "esfera" || alvo === "todos") await esfera();
if (alvo === "transferencias" || alvo === "todos") await esferaTransferencias();
if (alvo === "livelo" || alvo === "todos" || alvo === "transferencias") await livelo();
