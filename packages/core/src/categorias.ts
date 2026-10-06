// Categorias do app e como os programas chamam as suas.
// O coletor usa isso para classificar cada parceiro automaticamente.

export const CATEGORIAS_APP = [
  { id: "eletronicos", nome: "Eletrônicos" },
  { id: "moda", nome: "Moda" },
  { id: "beleza", nome: "Beleza" },
  { id: "viagem", nome: "Viagem" },
  { id: "casa", nome: "Casa" },
  { id: "pet", nome: "Pet" },
  { id: "esporte", nome: "Esporte" },
  { id: "mercado", nome: "Mercado" },
  { id: "saude", nome: "Saúde" },
  { id: "infantil", nome: "Infantil" },
  { id: "livros", nome: "Livros" },
  { id: "servicos", nome: "Serviços" },
  { id: "outros", nome: "Outros" },
] as const;

export type CategoriaAppId = (typeof CATEGORIAS_APP)[number]["id"];

/**
 * Ids de categoria da Esfera (campo parentCategories[].repositoryId) -> categoria do app.
 * Levantados na descoberta de 2026-10-06. Ids genéricos (ex: esf02163, "Junte pontos")
 * não aparecem aqui de propósito.
 */
export const CATEGORIAS_ESFERA: Record<string, CategoriaAppId> = {
  esf_categorias_moda: "moda",
  newModaCalcadosAcessorios: "moda",
  "esf_categorias_beleza_bem-estar": "beleza",
  newBelezaPerfumaria: "beleza",
  newPetShop: "pet",
  newFitnessSaudeMental: "esporte",
  newSaudeOculosVacinas: "saude",
  esf_categorias_alimentos_bebidas: "mercado",
  new02155: "mercado",
  newCasaDecoracao: "casa",
  newPresentesPersonalizados: "casa",
  esf_categorias_viagens_servicos: "viagem",
  newCruzeiros: "viagem",
  newBrinquedos: "infantil",
  new02221: "infantil",
  newStreamingAssinaturas: "servicos",
};

/**
 * Palavras no NOME do id de categoria que indicam a categoria do app. Cobre ids que
 * ainda não estão no dicionário acima (ex: "newEletronicosInformatica").
 */
const PISTAS: [RegExp, CategoriaAppId][] = [
  [/eletr|tecnolog|informat|celular|games|eletrodom/i, "eletronicos"],
  [/moda|calcad|roupa|acessor/i, "moda"],
  [/beleza|perfum|cosmet/i, "beleza"],
  [/viag|turism|cruzeir|hote|passag|aere|aluguel.?de.?carro/i, "viagem"],
  [/casa|decor|movei|cozinh/i, "casa"],
  [/pet/i, "pet"],
  [/fitness|esport|academia|suplement/i, "esporte"],
  [/aliment|bebida|mercado|vinho|gourmet/i, "mercado"],
  [/saude|farma|drogar|otica|oculos/i, "saude"],
  [/brinqued|infantil|bebe|crianca/i, "infantil"],
  [/livr|ebook/i, "livros"],
  [/streaming|assinatura|servic|curso|educa/i, "servicos"],
];

/** Converte os ids/nomes de categoria de um parceiro nas categorias do app (sem repetir). */
export function categoriasDoParceiro(idsExternos: string[], dicionario: Record<string, CategoriaAppId>): CategoriaAppId[] {
  const resultado = new Set<CategoriaAppId>();
  for (const id of idsExternos) {
    const direta = dicionario[id];
    if (direta) {
      resultado.add(direta);
      continue;
    }
    for (const [regex, categoria] of PISTAS) if (regex.test(id)) resultado.add(categoria);
  }
  return [...resultado];
}

/** Mesma normalização do coletor: "Fast Shop" -> "fastshop". */
export function chaveNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * O que cada loja vende (não diz se é parceira: isso vem só da coleta do dia).
 * Usado quando o programa não informa a categoria da loja.
 */
const LOJAS_CONHECIDAS: Record<string, CategoriaAppId[]> = {
  magalu: ["eletronicos", "casa"],
  fastshop: ["eletronicos", "casa"],
  casasbahia: ["eletronicos", "casa"],
  pontofrio: ["eletronicos", "casa"],
  ponto: ["eletronicos", "casa"],
  extra: ["eletronicos", "casa"],
  kabum: ["eletronicos"],
  samsung: ["eletronicos"],
  motorola: ["eletronicos"],
  dell: ["eletronicos"],
  lenovo: ["eletronicos"],
  lg: ["eletronicos"],
  iplace: ["eletronicos"],
  jbl: ["eletronicos"],
  positivo: ["eletronicos"],
  philco: ["eletronicos", "casa"],
  britania: ["eletronicos", "casa"],
  panasonic: ["eletronicos"],
  acer: ["eletronicos"],
  midea: ["eletronicos", "casa"],
  electrolux: ["eletronicos", "casa"],
  brastemp: ["eletronicos", "casa"],
  consul: ["eletronicos", "casa"],
  gazin: ["eletronicos", "casa"],
  lojascolombo: ["eletronicos", "casa"],
  efacil: ["eletronicos", "casa"],
  frigelar: ["eletronicos", "casa"],
  dufrio: ["eletronicos", "casa"],
  centralar: ["eletronicos", "casa"],
  cookeletroraro: ["eletronicos", "casa"],
  nespresso: ["casa", "mercado"],
  dolcegusto: ["casa", "mercado"],
  mercadolivre: ["eletronicos", "casa", "moda"],
  shopee: ["eletronicos", "casa", "moda"],
  aliexpress: ["eletronicos", "casa", "moda"],
  temu: ["eletronicos", "casa", "moda"],
  shein: ["moda"],
  amazon: ["eletronicos", "casa", "livros"],
  americanas: ["eletronicos", "casa"],
  carrefour: ["mercado", "eletronicos", "casa"],
  carrefourshopping: ["eletronicos", "casa"],
  samsclub: ["mercado"],
  samsclubecommerce: ["mercado", "eletronicos"],
  leroymerlin: ["casa"],
  booking: ["viagem"],
  bookingcom: ["viagem"],
  hoteis: ["viagem"],
  hoteiscom: ["viagem"],
  decolar: ["viagem"],
  latamairlines: ["viagem"],
  gol: ["viagem"],
  azul: ["viagem"],
  qatarairways: ["viagem"],
  avianca: ["viagem"],
  buser: ["viagem"],
  clickbus: ["viagem"],
  flixbus: ["viagem"],
  localiza: ["viagem"],
  movida: ["viagem"],
  unidas: ["viagem"],
  rentcars: ["viagem"],
  disney: ["servicos"],
  disneyplus: ["servicos"],
  netshoes: ["esporte", "moda"],
  centauro: ["esporte", "moda"],
  decathlon: ["esporte"],
  petz: ["pet"],
  cobasi: ["pet"],
  petlove: ["pet"],
};

const PISTAS_NOME: [RegExp, CategoriaAppId][] = [
  [/eletro|tech|tecno|informat|celular|games|\bar\b|refrigera/i, "eletronicos"],
  [/moda|cal[cç]ad|roupa|outlet|jeans|lingerie|underwear|shoes|sapat/i, "moda"],
  [/beleza|perfum|cosmet|beauty|make|botic/i, "beleza"],
  [/viag|turism|cruzeir|hotel|hoteis|passage|airline|aere|resort|park|seguro.?viagem|aluguel|rent|car\b|bus\b/i, "viagem"],
  [/casa|decor|move(l|is)|cozinh|colch|cama|constru|home/i, "casa"],
  [/pet|zoo|dog|cat\b/i, "pet"],
  [/sport|esport|fitness|academ|suplement|nutri|bike|run/i, "esporte"],
  [/mercado|aliment|bebida|vinho|wine|caf[eé]|coffee|gourmet|chocolat|cestas|delivery/i, "mercado"],
  [/sa[uú]de|farm[aá]c|drogar|[oó]tic|oculos|lente|odonto|medic|vacina/i, "saude"],
  [/brinqued|infantil|beb[eê]|kids|crian/i, "infantil"],
  [/livr|book(?!ing)/i, "livros"],
  [/seguro|cons[oó]rcio|capitaliza|curso|educa|streaming|assinatura|telefon|claro|tim\b|energia|cr[eé]dito|banco|cart[aã]o/i, "servicos"],
];

/** Categorias pelo nome da loja: dicionário de lojas conhecidas e, depois, palavras do nome. */
export function categoriasPorNome(nome: string): CategoriaAppId[] {
  const conhecida = LOJAS_CONHECIDAS[chaveNome(nome)];
  if (conhecida) return conhecida;
  const achadas = new Set<CategoriaAppId>();
  for (const [regex, cat] of PISTAS_NOME) if (regex.test(nome)) achadas.add(cat);
  return [...achadas];
}
