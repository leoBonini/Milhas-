import { NomePrograma } from "@/components/Comuns";
import { coletadoEm, transferencias, type TransferenciaArquivo } from "@/lib/dados/arquivo";

export const metadata = { title: "Transferir para milhas · Pontos por Real" };

function textoBonus(t: TransferenciaArquivo) {
  const faixa = t.bonusMinimo && t.bonusMinimo < t.bonusPercentual ? `${t.bonusMinimo}% a ${t.bonusPercentual}%` : `${t.bonusPercentual}%`;
  const ate = t.validaAte ? ` até ${t.validaAte.slice(8, 10)}/${t.validaAte.slice(5, 7)}` : "";
  return `${faixa} de bônus${ate}`;
}

const PRINCIPAIS = ["LATAM Pass", "Smiles", "Azul Fidelidade"];

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function Transferencias() {
  const principais = PRINCIPAIS.map((destino) => ({
    destino,
    linhas: transferencias.filter((t) => t.destino === destino),
  }));
  const outras = transferencias.filter((t) => !PRINCIPAIS.includes(t.destino));

  return (
    <main>
      <h1>Transferir para milhas</h1>
      <p className="sub">
        Bônus de hoje para transferir pontos Livelo e Esfera para companhias aéreas. Com 35% de bônus, 100 mil pontos viram 135 mil
        milhas. Atualizado em {formatarHora(coletadoEm)}.
      </p>

      <div className="transferencias">
        {principais.map(({ destino, linhas }) => (
          <section key={destino} className="cartao destino">
            <h2>{destino}</h2>
            {(["livelo", "esfera"] as const).map((programa) => {
              const t = linhas.find((l) => l.programa === programa);
              return (
                <div key={programa} className="linha-transf">
                  <NomePrograma programa={programa} />
                  {t ? (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className={`bonus${t.bonusPercentual > 0 ? " ativo" : ""}`}>
                      {t.bonusPercentual > 0 ? textoBonus(t) : `sem bônus hoje${t.paridade ? ` · ${t.paridade}` : ""}`}
                    </a>
                  ) : (
                    <span className="valor vazio">não informado</span>
                  )}
                  {t?.campanha && <p className="campanha">{t.campanha}</p>}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {outras.length > 0 && (
        <>
          <h2>Outros programas (Esfera)</h2>
          <div className="cartao">
            <ul className="destaques">
              {outras.map((t) => (
                <li key={`${t.programa}-${t.destino}`}>
                  <span className="nome">{t.destino}</span>
                  <span className="sub" style={{ margin: 0 }}>{t.paridade} pontos:milha</span>
                  <span className={`bonus${t.bonusPercentual > 0 ? " ativo" : ""}`}>{t.bonusPercentual > 0 ? `+${t.bonusPercentual}%` : "sem bônus"}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <p className="dica">O bônus pode depender de cadastro na campanha e de ser assinante do clube. Confira as regras no link antes de transferir.</p>
    </main>
  );
}
