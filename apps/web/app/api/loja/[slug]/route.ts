import { NextResponse } from "next/server";
import { calcularMelhorMes, PROGRAMAS, textoMelhorMes } from "@milhas/core";
import { dados } from "@/lib/dados";

// Lê só do banco (dados já coletados). Resposta em cache por 5 minutos.
export const revalidate = 300;

export interface RespostaHistorico {
  nome: string;
  /** Uma linha por dia; null quando o programa não tem dado naquele dia */
  serie: { data: string; livelo: number | null; esfera: number | null }[];
  sugestoes: { programa: string; texto: string; temSugestao: boolean }[];
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await dados().historico(slug);
  if (!h) return NextResponse.json({ erro: "Loja não encontrada" }, { status: 404 });

  const porDia = new Map<string, RespostaHistorico["serie"][number]>();
  const linha = (data: string) => porDia.get(data) ?? porDia.set(data, { data, livelo: null, esfera: null }).get(data)!;
  for (const p of h.livelo) linha(p.data).livelo = p.pontos;
  for (const p of h.esfera) linha(p.data).esfera = p.pontos;

  const sugestoes = PROGRAMAS.filter((p) => h[p.id].length).map((p) => {
    const r = calcularMelhorMes(h[p.id]);
    return { programa: p.nome, texto: textoMelhorMes(`${h.parceiro.nome} na ${p.nome}`, r), temSugestao: !!r.sugestao };
  });

  const corpo: RespostaHistorico = {
    nome: h.parceiro.nome,
    serie: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
    sugestoes,
  };
  return NextResponse.json(corpo);
}
