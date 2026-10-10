"use client";

import { useRef, useState } from "react";
import { DownloadIcon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { AdminOnboardingFilters } from "../admin-onboarding.filters";

type ExportMessage = {
  kind: "status" | "error";
  text: string;
};

const FALLBACK_FILENAME = "lucrivo-contatos-autorizados.csv";

function exportUrl(filters: AdminOnboardingFilters) {
  const params = new URLSearchParams();
  if (filters.segmentId !== null) {
    params.set("segmentId", String(filters.segmentId));
  }
  if (filters.subcategoryId !== null) {
    params.set("subcategoryId", String(filters.subcategoryId));
  }
  if (filters.from !== null) params.set("from", filters.from);
  if (filters.to !== null) params.set("to", filters.to);
  const query = params.toString();
  return `/api/admin/onboarding/export${query ? `?${query}` : ""}`;
}

function responseFilename(response: Response) {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] &&
    /^lucrivo-contatos-autorizados(?:-\d{4}-\d{2}-\d{2})?\.csv$/.test(match[1])
    ? match[1]
    : FALLBACK_FILENAME;
}

function AdminOnboardingExportButton({
  filters,
}: {
  filters: AdminOnboardingFilters;
}) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<ExportMessage | null>(null);

  async function download() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(exportUrl(filters), {
        credentials: "same-origin",
      });

      if (response.status === 204) {
        setMessage({
          kind: "status",
          text: "Nenhum contato autorizado corresponde aos filtros.",
        });
        return;
      }
      if (response.status === 422) {
        setMessage({
          kind: "error",
          text: "Reduza o período ou escolha filtros mais específicos para exportar até 5.000 contatos.",
        });
        return;
      }
      if (!response.ok) throw new Error("Onboarding export failed");

      const objectUrl = URL.createObjectURL(await response.blob());
      try {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = responseFilename(response);
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      setMessage({
        kind: "error",
        text: "Não foi possível exportar os contatos. Tente novamente.",
      });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-sm flex-col items-start gap-2 sm:items-end sm:text-right">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={download}
      >
        {pending ? (
          <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
        ) : (
          <DownloadIcon aria-hidden="true" />
        )}
        {pending ? "Exportando..." : "Exportar contatos autorizados"}
      </Button>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Somente contatos com autorização ativa no momento da exportação são
        incluídos.
      </p>
      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export { AdminOnboardingExportButton };
