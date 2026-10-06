import "server-only";
import { fonteDemo } from "./demo";
import { criarFonteSupabase } from "./supabase";
import type { FonteDados } from "./tipos";

export * from "./tipos";
export * from "./comum";

let fonte: FonteDados | undefined;

/** Supabase se configurado; senão, dados de demonstração. */
export function dados(): FonteDados {
  if (!fonte) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    fonte = url && chave ? criarFonteSupabase(url, chave) : fonteDemo;
  }
  return fonte;
}
