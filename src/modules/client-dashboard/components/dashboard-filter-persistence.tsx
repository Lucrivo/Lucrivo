"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  toStoredClientDashboardFilters,
  type StoredClientDashboardFilters,
  type ClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";

let persistenceQueue = Promise.resolve();

function updateStoredClientDashboardFilters(
  method: "POST" | "DELETE",
  filters?: StoredClientDashboardFilters,
): Promise<string> {
  const operation = persistenceQueue
    .catch(() => undefined)
    .then(async () => {
      const response = await fetch("/api/dashboard/filters", {
        method,
        headers: filters ? { "Content-Type": "application/json" } : undefined,
        body: filters ? JSON.stringify(filters) : undefined,
        keepalive: true,
      });
      const payload: unknown = await response.json();

      if (
        !response.ok ||
        typeof payload !== "object" ||
        payload === null ||
        !("href" in payload) ||
        typeof payload.href !== "string" ||
        !payload.href.startsWith("/dashboard")
      ) {
        throw new Error("client_dashboard_filters_update_failed");
      }

      return payload.href;
    });

  persistenceQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

function clearStoredClientDashboardFilters() {
  return updateStoredClientDashboardFilters("DELETE");
}

function DashboardFilterPersistence({
  enabled,
  filters,
}: {
  enabled: boolean;
  filters: ClientDashboardFilters;
}) {
  const [failed, setFailed] = useState(false);
  const serializedFilters = JSON.stringify(
    toStoredClientDashboardFilters(filters),
  );

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    void updateStoredClientDashboardFilters(
      "POST",
      JSON.parse(serializedFilters) as StoredClientDashboardFilters,
    ).then(
      () => {
        if (active) setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      },
    );

    return () => {
      active = false;
    };
  }, [enabled, serializedFilters]);

  return failed ? (
    <p role="alert" className="text-destructive px-1 text-sm">
      Os filtros foram aplicados, mas não foi possível salvá-los. Tente
      aplicá-los novamente.
    </p>
  ) : null;
}

function ClearDashboardFiltersButton({
  className,
  size = "sm",
  variant = "ghost",
}: {
  className?: string;
  size?: "sm" | "lg";
  variant?: "default" | "ghost";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clear() {
    if (pending) return;

    startTransition(async () => {
      try {
        const href = await clearStoredClientDashboardFilters();
        router.replace(href, { scroll: false });
      } catch {
        router.replace("/dashboard?dataState=all", { scroll: false });
      }
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={clear}
    >
      {pending ? "Limpando filtros..." : "Limpar filtros"}
    </Button>
  );
}

export {
  ClearDashboardFiltersButton,
  DashboardFilterPersistence,
  clearStoredClientDashboardFilters,
};
