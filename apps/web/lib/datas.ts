/** Data de hoje no horário de Brasília, AAAA-MM-DD. */
export function hojeBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function formatarData(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}
