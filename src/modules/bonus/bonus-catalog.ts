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
    title: "E-book de gestão financeira",
    description:
      "Aprenda os fundamentos para cuidar melhor do dinheiro do seu negócio.",
    objectPath: "ebook/ebook.pdf",
    requiresPaidAccess: false,
    delivery: "new_tab",
    downloadName: null,
  },
  {
    slug: "guide",
    typeLabel: "Guia",
    title: "Guia prático para organizar o negócio",
    description:
      "Transforme a rotina financeira em passos simples, claros e consistentes.",
    objectPath: "guide/guide.pdf",
    requiresPaidAccess: true,
    delivery: "new_tab",
    downloadName: null,
  },
  {
    slug: "cash-flow",
    typeLabel: "Planilha",
    title: "Planilha de controle de fluxo de caixa",
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
