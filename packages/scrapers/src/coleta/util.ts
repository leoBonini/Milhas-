export const arredondar = (n: number) => Math.round(n * 100) / 100;

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Fast Shop" -> "fastshop"; usado para casar a mesma loja entre Livelo e Esfera. */
export function chaveLoja(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]/g, "");
}

export function slugLoja(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
