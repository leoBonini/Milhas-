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
