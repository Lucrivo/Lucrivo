import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDetailedDiagnosisIntent,
  readDetailedDiagnosisIntent,
  saveDetailedDiagnosisIntent,
} from "./detailed-diagnosis-intent";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

describe("detailed diagnosis intent", () => {
  const key = "lucrivo:detailed-diagnosis-intent:v1";
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
  });

  it("stores a versioned category for the same user inside two hours", () => {
    expect(
      saveDetailedDiagnosisIntent(storage, {
        userId: "user-1",
        category: "product",
        now: 1_000,
      }),
    ).toBe(true);

    expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toEqual({
      category: "product",
    });
    expect(
      readDetailedDiagnosisIntent(
        storage,
        "user-1",
        1_000 + 2 * 60 * 60 * 1000 - 1,
      ),
    ).toEqual({ category: "product" });
    expect(
      readDetailedDiagnosisIntent(
        storage,
        "user-1",
        1_000 + 2 * 60 * 60 * 1000,
      ),
    ).toBeNull();
    expect(storage.snapshot()[key]).toBeUndefined();
  });

  it("rejects another user, an invalid category, and an unsupported version", () => {
    saveDetailedDiagnosisIntent(storage, {
      userId: "user-1",
      category: "production",
      now: 1_000,
    });

    expect(readDetailedDiagnosisIntent(storage, "user-2", 1_001)).toBeNull();
    expect(storage.snapshot()[key]).toBeUndefined();

    storage.setItem(
      key,
      JSON.stringify({
        version: 1,
        userId: "user-1",
        category: "service",
        createdAt: 1_000,
      }),
    );
    expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toBeNull();

    storage.setItem(
      key,
      JSON.stringify({
        version: 2,
        userId: "user-1",
        category: "product",
        createdAt: 1_000,
      }),
    );
    expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toBeNull();
    expect(storage.snapshot()[key]).toBeUndefined();
  });

  it("drops malformed JSON and survives throwing storage methods", () => {
    storage.setItem(key, "{");
    expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toBeNull();
    expect(storage.snapshot()[key]).toBeUndefined();

    const throwing = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(
      saveDetailedDiagnosisIntent(throwing, {
        userId: "user-1",
        category: "product",
      }),
    ).toBe(false);
    expect(readDetailedDiagnosisIntent(throwing, "user-1")).toBeNull();
    expect(() => clearDetailedDiagnosisIntent(throwing)).not.toThrow();
  });

  it("clears a stored intent explicitly", () => {
    saveDetailedDiagnosisIntent(storage, {
      userId: "user-1",
      category: "production",
      now: 1_000,
    });

    clearDetailedDiagnosisIntent(storage);

    expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toBeNull();
  });
});
