// Inspeção direta das APIs encontradas na descoberta: imprime, de forma compacta,
// todos os campos simples de alguns itens, para identificar onde está a pontuação.
// Uso: npm run inspecionar -w @milhas/scrapers

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

async function livelo() {
  // Tentativas de descoberta (não presumidas como certas): o resultado diz se existem.
  for (const url of [
    "https://www.livelo.com.br/robots.txt",
    "https://apis.pontoslivelo.com.br/api-bff-partners-parities/v1/parities/active",
    "https://apis.pontoslivelo.com.br/api-bff-partners/v1/partners",
  ]) {
    try {
      const j = await buscar(url, { origin: "https://www.livelo.com.br", referer: "https://www.livelo.com.br/" });
      if (j !== undefined) console.log(JSON.stringify(j).slice(0, 3000));
    } catch (e) {
      console.log(`falhou: ${url}: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await esfera();
await livelo();
