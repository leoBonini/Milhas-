"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarPontos } from "@milhas/core";
import type { RespostaHistorico } from "@/lib/historico";

const PERIODOS = [
  { id: "6m", rotulo: "6 meses", dias: 182 },
  { id: "1a", rotulo: "1 ano", dias: 365 },
  { id: "tudo", rotulo: "Tudo", dias: Infinity },
] as const;

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** O SVG do Recharts não aceita var(--x) em atributos: lê o valor final do CSS e acompanha o tema. */
function useCoresSeries() {
  const [cores, setCores] = useState({ livelo: "#2a78d6", esfera: "#eb6834", grade: "#ecebe7", texto: "#7a7974" });
  useEffect(() => {
    const ler = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string) => s.getPropertyValue(n).trim();
      setCores({ livelo: v("--serie-livelo"), esfera: v("--serie-esfera"), grade: v("--grade"), texto: v("--texto-3") });
    };
    ler();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);
  return cores;
}

function formatarDia(data: string) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function DicaGrafico({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null; color: string }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="tooltip">
      <p className="data" style={{ margin: "0 0 4px" }}>{formatarDia(label)}</p>
      {payload.map((p) =>
        p.value == null ? null : (
          <div key={p.dataKey}>
            <span className={`programa ${p.dataKey}`}>{p.dataKey === "livelo" ? "Livelo" : "Esfera"}</span>
            <b>{formatarPontos(p.value)} pts/R$</b>
          </div>
        ),
      )}
    </div>
  );
}

export type CarregarHistorico = (slug: string) => Promise<RespostaHistorico>;

const carregarDaApi: CarregarHistorico = (slug) =>
  fetch(`/api/loja/${slug}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

export function GraficoLoja({ slug, carregar = carregarDaApi }: { slug: string; carregar?: CarregarHistorico }) {
  const [resposta, setResposta] = useState<RespostaHistorico | null>(null);
  const [erro, setErro] = useState(false);
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("1a");
  const cores = useCoresSeries();

  useEffect(() => {
    let ativo = true;
    setResposta(null);
    setErro(false);
    carregar(slug)
      .then((j) => ativo && setResposta(j))
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, [slug, carregar]);

  const dadosPeriodo = useMemo(() => {
    if (!resposta?.serie.length) return [];
    const dias = PERIODOS.find((p) => p.id === periodo)!.dias;
    if (!Number.isFinite(dias)) return resposta.serie;
    const ultimo = new Date(resposta.serie.at(-1)!.data);
    ultimo.setDate(ultimo.getDate() - dias);
    const corte = ultimo.toISOString().slice(0, 10);
    return resposta.serie.filter((l) => l.data >= corte);
  }, [resposta, periodo]);

  if (erro) return <div className="detalhe carregando">Não foi possível carregar o histórico.</div>;
  if (!resposta) return <div className="detalhe carregando">Carregando histórico…</div>;
  if (!resposta.serie.length) {
    return <div className="detalhe"><div className="sugestao"><p>Ainda estamos montando o histórico desta loja.</p></div></div>;
  }

  const temLivelo = resposta.serie.some((l) => l.livelo != null);
  const temEsfera = resposta.serie.some((l) => l.esfera != null);
  const maximoPeriodo = (k: "livelo" | "esfera") => Math.max(...dadosPeriodo.map((l) => l[k] ?? 0));

  return (
    <div className="detalhe">
      <div className="filtros" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button key={p.id} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="legenda">
        {temLivelo && (
          <span className="programa livelo">
            Livelo · máx. <b>{formatarPontos(maximoPeriodo("livelo"))}</b>
          </span>
        )}
        {temEsfera && (
          <span className="programa esfera">
            Esfera · máx. <b>{formatarPontos(maximoPeriodo("esfera"))}</b>
          </span>
        )}
      </div>

      <div className="grafico" role="img" aria-label={`Histórico de pontos por real da ${resposta.nome}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dadosPeriodo} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={cores.grade} />
            <XAxis
              dataKey="data"
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fill: cores.texto, fontSize: 11 }}
              tickFormatter={(d: string) => `${MESES_CURTOS[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`}
            />
            <YAxis
              width={28}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: cores.texto, fontSize: 11 }}
              domain={[0, "auto"]}
            />
            <Tooltip content={<DicaGrafico />} cursor={{ stroke: cores.texto, strokeWidth: 1 }} isAnimationActive={false} />
            {temLivelo && (
              <Line dataKey="livelo" type="stepAfter" stroke={cores.livelo} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4 }} />
            )}
            {temEsfera && (
              <Line dataKey="esfera" type="stepAfter" stroke={cores.esfera} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sugestao">
        {resposta.sugestoes.map((s) => (
          <p key={s.programa}>{s.texto}</p>
        ))}
      </div>
    </div>
  );
}
