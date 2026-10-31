import { melhorValor, type LojaDoDia } from "@milhas/core";
import type { DestaqueDoDia } from "./tipos";

/** Lojas ordenadas pelo melhor valor de hoje entre Livelo e Esfera. */
export function ordenarLojas(lojas: LojaDoDia[]): LojaDoDia[] {
  return [...lojas].sort((a, b) => melhorValor(b) - melhorValor(a) || a.parceiro.nome.localeCompare(b.parceiro.nome));
}

/**
 * Consórcio, seguro e capitalização pagam pontos por parcela, não por compra em loja:
 * ficam fora dos destaques da tela inicial (continuam na categoria Serviços).
 */
const FINANCEIRO = /cons[oó]rcio|plano de sa[uú]de|petlove sa[uú]de|seguro|segurad|capitaliza|ourocap|bancorbr|cr[eé]dito|previd/i;
export const ehCompraEmLoja = (l: LojaDoDia) => !FINANCEIRO.test(l.parceiro.nome);

/** As N maiores pontuações do dia, cada par loja+programa conta separado. */
export function melhoresDoDia(lojas: LojaDoDia[], limite: number): DestaqueDoDia[] {
  const pares: DestaqueDoDia[] = [];
  for (const l of lojas.filter(ehCompraEmLoja)) {
    if (l.livelo != null) pares.push({ parceiro: l.parceiro, programa: "livelo", pontos: l.livelo });
    if (l.esfera != null) pares.push({ parceiro: l.parceiro, programa: "esfera", pontos: l.esfera });
  }
  return pares.sort((a, b) => b.pontos - a.pontos).slice(0, limite);
}

export interface PromocaoDoDia extends DestaqueDoDia {
  /** Pontuação normal da loja nesse programa */
  base: number;
}

/** Lojas pagando acima do normal hoje, das que mais multiplicam a pontuação para as que menos. */
export function promocoesDoDia(lojas: LojaDoDia[], limite: number): PromocaoDoDia[] {
  const lista: PromocaoDoDia[] = [];
  for (const l of lojas.filter(ehCompraEmLoja)) {
    for (const programa of ["livelo", "esfera"] as const) {
      const o = l.ofertas?.[programa];
      if (!o?.promocao || !o.pontosBase || o.pontosPorReal <= o.pontosBase) continue;
      lista.push({ parceiro: l.parceiro, programa, pontos: o.pontosPorReal, base: o.pontosBase });
    }
  }
  return lista.sort((a, b) => b.pontos / b.base - a.pontos / a.base || b.pontos - a.pontos).slice(0, limite);
}
