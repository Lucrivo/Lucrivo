"use client";

import { useMemo, useState } from "react";

import type { ReportSnapshot } from "../types";
import { calculateReportPreview } from "./calculate-report-preview";
import type { EditableReportDraft } from "./report-editor.types";

type LiveReportPreview = {
  status: "valid" | "invalid";
  snapshot: ReportSnapshot;
  fieldErrors: Record<string, string[]>;
};

function useReportPreview(
  draft: EditableReportDraft,
  initialSnapshot: ReportSnapshot,
): LiveReportPreview {
  const preview = useMemo(() => calculateReportPreview(draft), [draft]);
  const [cache, setCache] = useState({
    draft,
    snapshot: initialSnapshot,
  });

  if (cache.draft !== draft) {
    setCache({
      draft,
      snapshot: preview.status === "valid" ? preview.snapshot : cache.snapshot,
    });
  }

  return {
    status: preview.status,
    snapshot: preview.status === "valid" ? preview.snapshot : cache.snapshot,
    fieldErrors: preview.status === "invalid" ? preview.fieldErrors : {},
  };
}

export { useReportPreview, type LiveReportPreview };
