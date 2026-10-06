import { melhorValor, type LojaDoDia } from "@milhas/core";
import type { DestaqueDoDia } from "./tipos";

/** Lojas ordenadas pelo melhor valor de hoje entre Livelo e Esfera. */
export function ordenarLojas(lojas: LojaDoDia[]): LojaDoDia[] {
  return [...lojas].sort((a, b) => melhorValor(b) - melhorValor(a) || a.parceiro.nome.localeCompare(b.parceiro.nome));
}

/** As N maiores pontuações do dia, cada par loja+programa conta separado. */
export function melhoresDoDia(lojas: LojaDoDia[], limite: number): DestaqueDoDia[] {
  const pares: DestaqueDoDia[] = [];
  for (const l of lojas) {
    if (l.livelo != null) pares.push({ parceiro: l.parceiro, programa: "livelo", pontos: l.livelo });
    if (l.esfera != null) pares.push({ parceiro: l.parceiro, programa: "esfera", pontos: l.esfera });
  }
  return pares.sort((a, b) => b.pontos - a.pontos).slice(0, limite);
}
