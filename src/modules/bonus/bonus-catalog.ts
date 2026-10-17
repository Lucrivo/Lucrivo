const BONUS_BUCKET = "bonus-materials";

type BonusMaterialSlug = "ebook" | "guide" | "cash-flow";
type BonusDelivery = "new_tab" | "download";
type BonusMaterial = {
  slug: BonusMaterialSlug;
  typeLabel: "E-book" | "Guia" | "Planilha";
  title: string;
  description: string;
  objectPath: string;
  requiresPaidAccess: boolean;
  delivery: BonusDelivery;
  downloadName: string | null;
};

const BONUS_MATERIALS = [
  {
    slug: "ebook",
    typeLabel: "E-book",
    title: "E-book Lucrivo",
    description:
      "O preço descomplicado. Aprenda a entender seus custos, proteger sua margem e descobrir quanto realmente precisa cobrar.",
    objectPath: "ebook/ebook.pdf",
    requiresPaidAccess: false,
    delivery: "new_tab",
    downloadName: null,
  },
  {
    slug: "guide",
    typeLabel: "Guia",
    title: "Método de vendas para o varejo",
    description:
      "Da primeira conversa ao relacionamento que traz o cliente de volta.",
    objectPath: "guide/guide.pdf",
    requiresPaidAccess: true,
    delivery: "new_tab",
    downloadName: null,
  },
  {
    slug: "cash-flow",
    typeLabel: "Planilha",
    title: "Planilha de fluxo de caixa",
    description:
      "Acompanhe entradas, saídas e saldo para decidir com mais segurança.",
    objectPath: "spreadsheet/cash-flow.xlsx",
    requiresPaidAccess: true,
    delivery: "download",
    downloadName: "planilha-controle-fluxo-de-caixa.xlsx",
  },
] as const satisfies readonly BonusMaterial[];

function getBonusMaterial(slug: string): BonusMaterial | null {
  return BONUS_MATERIALS.find((material) => material.slug === slug) ?? null;
}

export {
  BONUS_BUCKET,
  BONUS_MATERIALS,
  getBonusMaterial,
  type BonusDelivery,
  type BonusMaterial,
  type BonusMaterialSlug,
};
