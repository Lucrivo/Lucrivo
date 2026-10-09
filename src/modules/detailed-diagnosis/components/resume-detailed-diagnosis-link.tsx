"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { DetailedDiagnosisCategory } from "@/modules/detailed-diagnosis/types";

import {
  clearDetailedDiagnosisIntent,
  readDetailedDiagnosisIntent,
} from "../services/detailed-diagnosis-intent";

type ResumeDetailedDiagnosisLinkProps = {
  userId: string;
};

function ResumeDetailedDiagnosisLink({
  userId,
}: ResumeDetailedDiagnosisLinkProps) {
  const [category, setCategory] = useState<DetailedDiagnosisCategory | null>(
    null,
  );

  useEffect(() => {
    setCategory(
      readDetailedDiagnosisIntent(window.sessionStorage, userId)?.category ??
        null,
    );
  }, [userId]);

  const href = category
    ? `/quick-diagnosis?resume=detailed&category=${category}`
    : "/quick-diagnosis";

  return (
    <Link
      href={href}
      className={buttonVariants()}
      onClick={() => {
        if (category) clearDetailedDiagnosisIntent(window.sessionStorage);
      }}
    >
      {category ? "Continuar diagnóstico detalhado" : "Fazer diagnóstico"}
    </Link>
  );
}

export { ResumeDetailedDiagnosisLink };
