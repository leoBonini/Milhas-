import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LojaDoDia, Parceiro, PontoDiario, ProgramaId } from "@milhas/core";
import { hojeBrasilia, somarDias } from "../datas";
import type { FonteDados, HistoricoLoja } from "./tipos";

interface LinhaDiaria {
  parceiro_id: string;
  programa_id: ProgramaId;
  data: string;
  pontos_por_real: number;
}

/** O PostgREST devolve no máximo 1000 linhas por chamada: pagina até acabar. */
async function todasAsLinhas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const tamanho = 1000;
  const linhas: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await consulta(de, de + tamanho - 1);
    if (error) throw error;
    linhas.push(...(data ?? []));
    if (!data || data.length < tamanho) return linhas;
  }
}

export function criarFonteSupabase(url: string, chaveAnon: string): FonteDados {
  const db: SupabaseClient = createClient(url, chaveAnon, { auth: { persistSession: false } });

  return {
    demonstracao: false,
    async categorias() {
      const { data, error } = await db.from("categorias").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    async categoria(id) {
      const { data, error } = await db.from("categorias").select("id, nome").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async palavrasChave() {
      const { data, error } = await db.from("palavras_chave").select("termo, categoria_id");
      if (error) throw error;
      return data;
    },
    async lojasDaCategoria(categoriaId): Promise<LojaDoDia[]> {
      const { data: vinculos, error } = await db
        .from("parceiro_categoria")
        .select("parceiros!inner(id, nome, slug, ativo)")
        .eq("categoria_id", categoriaId)
        .eq("parceiros.ativo", true);
      if (error) throw error;
      const parceiros = (vinculos as unknown as { parceiros: Parceiro }[]).map((v) => v.parceiros);
      if (!parceiros.length) return [];

      // Últimos dias: se a coleta de hoje ainda não rodou, mostra o valor mais recente
      const hoje = hojeBrasilia();
      const linhas = await todasAsLinhas<LinhaDiaria>((de, ate) =>
        db
          .from("pontuacao_diaria")
          .select("parceiro_id, programa_id, data, pontos_por_real")
          .in("parceiro_id", parceiros.map((p) => p.id))
          .gte("data", somarDias(hoje, -3))
          .lte("data", hoje)
          .order("data", { ascending: false })
          .range(de, ate),
      );

      return parceiros.map((p) => {
        const doParceiro = linhas.filter((l) => l.parceiro_id === p.id);
        const recente = (programa: ProgramaId) => doParceiro.find((l) => l.programa_id === programa);
        const livelo = recente("livelo");
        const esfera = recente("esfera");
        return {
          parceiro: { id: p.id, nome: p.nome, slug: p.slug },
          livelo: livelo ? Number(livelo.pontos_por_real) : null,
          esfera: esfera ? Number(esfera.pontos_por_real) : null,
          data: [livelo?.data, esfera?.data].filter(Boolean).sort().at(-1) ?? null,
        };
      });
    },
    async historico(slug): Promise<HistoricoLoja | null> {
      const { data: p, error } = await db.from("parceiros").select("id, nome, slug").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const linhas = await todasAsLinhas<LinhaDiaria>((de, ate) =>
        db
          .from("pontuacao_diaria")
          .select("parceiro_id, programa_id, data, pontos_por_real")
          .eq("parceiro_id", p.id)
          .order("data")
          .range(de, ate),
      );
      const serie = (programa: ProgramaId): PontoDiario[] =>
        linhas.filter((l) => l.programa_id === programa).map((l) => ({ data: l.data, pontos: Number(l.pontos_por_real) }));
      return { parceiro: p, livelo: serie("livelo"), esfera: serie("esfera") };
    },
  };
}
