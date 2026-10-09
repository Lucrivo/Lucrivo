import type { DetailedDiagnosisCategory } from "../types";

const DETAILED_DIAGNOSIS_INTENT_KEY = "lucrivo:detailed-diagnosis-intent:v1";
const DETAILED_DIAGNOSIS_INTENT_TTL_MS = 2 * 60 * 60 * 1000;

type StoredDetailedDiagnosisIntent = {
  version: 1;
  userId: string;
  category: DetailedDiagnosisCategory;
  createdAt: number;
};

function isDetailedDiagnosisCategory(
  value: unknown,
): value is DetailedDiagnosisCategory {
  return value === "product" || value === "production";
}

function isStoredIntent(
  value: unknown,
): value is StoredDetailedDiagnosisIntent {
  if (typeof value !== "object" || value === null) return false;
  const intent = value as Partial<StoredDetailedDiagnosisIntent>;
  return (
    intent.version === 1 &&
    typeof intent.userId === "string" &&
    intent.userId.length > 0 &&
    isDetailedDiagnosisCategory(intent.category) &&
    typeof intent.createdAt === "number" &&
    Number.isFinite(intent.createdAt)
  );
}

function removeIntent(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(DETAILED_DIAGNOSIS_INTENT_KEY);
}

function saveDetailedDiagnosisIntent(
  storage: Pick<Storage, "setItem">,
  input: {
    userId: string;
    category: DetailedDiagnosisCategory;
    now?: number;
  },
): boolean {
  try {
    storage.setItem(
      DETAILED_DIAGNOSIS_INTENT_KEY,
      JSON.stringify({
        version: 1,
        userId: input.userId,
        category: input.category,
        createdAt: input.now ?? Date.now(),
      } satisfies StoredDetailedDiagnosisIntent),
    );
    return true;
  } catch {
    return false;
  }
}

function readDetailedDiagnosisIntent(
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  now = Date.now(),
): { category: DetailedDiagnosisCategory } | null {
  try {
    const raw = storage.getItem(DETAILED_DIAGNOSIS_INTENT_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      !isStoredIntent(parsed) ||
      parsed.userId !== userId ||
      now >= parsed.createdAt + DETAILED_DIAGNOSIS_INTENT_TTL_MS
    ) {
      removeIntent(storage);
      return null;
    }

    return { category: parsed.category };
  } catch {
    try {
      removeIntent(storage);
    } catch {
      return null;
    }
    return null;
  }
}

function clearDetailedDiagnosisIntent(
  storage: Pick<Storage, "removeItem">,
): void {
  try {
    removeIntent(storage);
  } catch {
    return;
  }
}

export {
  clearDetailedDiagnosisIntent,
  readDetailedDiagnosisIntent,
  saveDetailedDiagnosisIntent,
};
