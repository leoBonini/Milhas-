import { NextResponse } from "next/server";
import { dados } from "@/lib/dados";
import { montarRespostaHistorico } from "@/lib/historico";

// Lê só do banco (dados já coletados). Resposta em cache por 5 minutos.
export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await dados().historico(slug);
  if (!h) return NextResponse.json({ erro: "Loja não encontrada" }, { status: 404 });
  return NextResponse.json(montarRespostaHistorico(h));
}
