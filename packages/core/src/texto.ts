/** Minúsculas, sem acento, sem pontuação e com espaços simples. */
export function normalizarTermo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PalavraChave {
  termo: string;
  categoria_id: string;
}

/**
 * Acha a categoria de uma busca. Aceita o termo exato ou uma palavra-chave contida
 * na busca ("iphone 15 pro" -> "iphone"). Vence a palavra-chave mais longa
 * ("smart tv" antes de "tv").
 */
export function encontrarCategoria(busca: string, palavras: PalavraChave[]): string | null {
  const termo = normalizarTermo(busca);
  if (!termo) return null;
  const comEspacos = ` ${termo} `;
  let melhor: PalavraChave | undefined;
  for (const p of palavras) {
    const chave = normalizarTermo(p.termo);
    if (!chave) continue;
    const casa = termo === chave || comEspacos.includes(` ${chave} `);
    if (casa && (!melhor || chave.length > normalizarTermo(melhor.termo).length)) melhor = p;
  }
  return melhor?.categoria_id ?? null;
}
