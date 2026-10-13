"use client";

import { useSyncExternalStore } from "react";

const authEmailStorageKey = "lucrivo:auth-email";
const authEmailChangeEvent = "lucrivo:auth-email-change";
let authEmailMemory = "";

function getStoredAuthEmail(): string {
  if (typeof window === "undefined") return "";

  try {
    return window.sessionStorage.getItem(authEmailStorageKey) ?? "";
  } catch {
    return authEmailMemory;
  }
}

function subscribeToAuthEmail(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(authEmailChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(authEmailChangeEvent, onStoreChange);
  };
}

function setStoredAuthEmail(email: string): void {
  authEmailMemory = email;

  try {
    if (email) {
      window.sessionStorage.setItem(authEmailStorageKey, email);
    } else {
      window.sessionStorage.removeItem(authEmailStorageKey);
    }
  } catch {
    // O formulário continua funcional quando o armazenamento está indisponível.
  }

  window.dispatchEvent(new Event(authEmailChangeEvent));
}

function usePersistedAuthEmail(): readonly [string, (email: string) => void] {
  const email = useSyncExternalStore(
    subscribeToAuthEmail,
    getStoredAuthEmail,
    () => "",
  );

  return [email, setStoredAuthEmail] as const;
}

export { usePersistedAuthEmail };
