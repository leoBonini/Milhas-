// Leitura simples de robots.txt: considera os blocos "User-agent: *" e o do nosso bot.
// Suficiente para decidir se um caminho pode ser visitado; não implementa curingas avançados
// além de "*" e "$", que são os usados na prática.

export interface RegrasRobots {
  permitir: string[];
  bloquear: string[];
  intervaloSegundos?: number;
  bruto: string;
}

export function interpretarRobots(texto: string, nomeBot: string): RegrasRobots {
  const regras: RegrasRobots = { permitir: [], bloquear: [], bruto: texto };
  const nome = nomeBot.toLowerCase();
  let agentesDoBloco: string[] = [];
  let lendoAgentes = false;

  for (const linhaBruta of texto.split(/\r?\n/)) {
    const linha = linhaBruta.replace(/#.*/, "").trim();
    if (!linha) continue;
    const separador = linha.indexOf(":");
    if (separador < 0) continue;
    const campo = linha.slice(0, separador).trim().toLowerCase();
    const valor = linha.slice(separador + 1).trim();

    if (campo === "user-agent") {
      // Várias linhas User-agent seguidas formam um único bloco
      if (!lendoAgentes) agentesDoBloco = [];
      agentesDoBloco.push(valor.toLowerCase());
      lendoAgentes = true;
      continue;
    }
    lendoAgentes = false;
    const seAplica = agentesDoBloco.some((a) => a === "*" || (a && nome.includes(a)));
    if (!seAplica) continue;

    if (campo === "disallow" && valor) regras.bloquear.push(valor);
    else if (campo === "allow" && valor) regras.permitir.push(valor);
    else if (campo === "crawl-delay") {
      const n = Number(valor);
      if (Number.isFinite(n)) regras.intervaloSegundos = Math.max(regras.intervaloSegundos ?? 0, n);
    }
  }
  return regras;
}

function padraoParaRegex(padrao: string): RegExp {
  const escapado = padrao
    .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\\\$$|\$$/, "$");
  return new RegExp("^" + escapado);
}

/** Regra mais específica (maior padrão) vence; empate favorece Allow, como no Google. */
export function caminhoPermitido(regras: RegrasRobots, caminho: string): boolean {
  let melhor: { tamanho: number; permitido: boolean } | undefined;
  const avaliar = (lista: string[], permitido: boolean) => {
    for (const padrao of lista) {
      if (!padraoParaRegex(padrao).test(caminho)) continue;
      if (!melhor || padrao.length > melhor.tamanho || (padrao.length === melhor.tamanho && permitido)) {
        melhor = { tamanho: padrao.length, permitido };
      }
    }
  };
  avaliar(regras.bloquear, false);
  avaliar(regras.permitir, true);
  return melhor?.permitido ?? true;
}
