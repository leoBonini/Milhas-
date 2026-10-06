import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PROGRAMAS, type LojaDoDia, type Parceiro, type PontoDiario, type ProgramaId } from "@milhas/core";
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

  /**
   * "Parceiro hoje" = aparece na coleta mais recente do programa. Se uma loja sai da
   * Livelo, ela some da coleta seguinte e deixa de ser mostrada para aquele programa.
   */
  async function lojasDeHoje(): Promise<LojaDoDia[]> {
    const porParceiro = new Map<string, { livelo: number | null; esfera: number | null; data: string | null }>();
    for (const { id: programa } of PROGRAMAS) {
      const { data: ultima, error } = await db
        .from("pontuacao_diaria")
        .select("data")
        .eq("programa_id", programa)
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!ultima) continue;
      const linhas = await todasAsLinhas<LinhaDiaria>((de, ate) =>
        db
          .from("pontuacao_diaria")
          .select("parceiro_id, programa_id, data, pontos_por_real")
          .eq("programa_id", programa)
          .eq("data", ultima.data)
          .range(de, ate),
      );
      for (const l of linhas) {
        const atual = porParceiro.get(l.parceiro_id) ?? { livelo: null, esfera: null, data: null };
        atual[programa] = Number(l.pontos_por_real);
        if (!atual.data || l.data > atual.data) atual.data = l.data;
        porParceiro.set(l.parceiro_id, atual);
      }
    }
    if (!porParceiro.size) return [];

    const ids = [...porParceiro.keys()];
    const parceiros: Parceiro[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db.from("parceiros").select("id, nome, slug").in("id", ids.slice(i, i + 200)).eq("ativo", true);
      if (error) throw error;
      parceiros.push(...data);
    }
    return parceiros.map((p) => ({ parceiro: p, ...porParceiro.get(p.id)! }));
  }

  return {
    demonstracao: false,
    async categorias() {
      const { data, error } = await db.from("categorias").select("id, nome").order("ordem").order("nome");
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
    lojasDeHoje,
    async lojasDaCategoria(categoriaId) {
      const { data, error } = await db.from("parceiro_categoria").select("parceiro_id").eq("categoria_id", categoriaId);
      if (error) throw error;
      const daCategoria = new Set(data.map((v) => v.parceiro_id as string));
      return (await lojasDeHoje()).filter((l) => daCategoria.has(l.parceiro.id));
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
