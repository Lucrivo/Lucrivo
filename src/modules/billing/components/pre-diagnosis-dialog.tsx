"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowRightIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GiftIcon,
  LockSimpleIcon,
  TagIcon,
  XIcon,
} from "@phosphor-icons/react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logo from "@/assets/brand/lucrivo-logo-dark.svg";
import notebook from "@/assets/diagnosis/notebook-dashboard.png";
import tablet from "@/assets/diagnosis/tablet-diagnosis.png";
import ebook from "@/assets/marketing/ebook-pricing-guide.png";

import "./pre-diagnosis-dialog.css";

const storageKey = "lucrivo:pre-diagnosis-dialog";
const diagnosisPreviewAlt = "Exemplo do diagnóstico financeiro no Lucrivo.";

const { props: desktopPreviewProps } = getImageProps({
  src: notebook,
  alt: diagnosisPreviewAlt,
  width: 1536,
  height: 1024,
  sizes: "(max-width: 760px) 0px, 420px",
  priority: true,
});

const { props: mobilePreviewProps } = getImageProps({
  src: tablet,
  alt: diagnosisPreviewAlt,
  width: 1089,
  height: 1444,
  sizes: "(max-width: 760px) 132px, 0px",
  priority: true,
});

const questions = [
  {
    icon: TagIcon,
    text: "Seu preço cobre todos os seus custos?",
  },
  {
    icon: CurrencyDollarIcon,
    text: "Você realmente está tendo lucro?",
  },
  {
    icon: ChartBarIcon,
    text: "Quanto sobra de cada venda?",
  },
] as const;

const listeners = new Set<() => void>();
let dismissedWithoutStorage = false;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function isPreDiagnosisDialogPending() {
  if (dismissedWithoutStorage) return false;

  try {
    return window.sessionStorage.getItem(storageKey) !== "shown";
  } catch {
    return true;
  }
}

function dismissPreDiagnosisDialog() {
  try {
    window.sessionStorage.setItem(storageKey, "shown");
  } catch {
    dismissedWithoutStorage = true;
  }

  for (const listener of listeners) listener();
}

function PreDiagnosisDialog({
  oncePerSession = true,
}: {
  oncePerSession?: boolean;
}) {
  const pendingThisSession = useSyncExternalStore(
    subscribe,
    isPreDiagnosisDialogPending,
    () => false,
  );
  const [manuallyOpen, setManuallyOpen] = useState(true);
  const open = oncePerSession ? pendingThisSession : manuallyOpen;

  function dismiss() {
    if (oncePerSession) {
      dismissPreDiagnosisDialog();
      return;
    }
    setManuallyOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss();
      }}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="pre-diagnosis-dialog">
        <DialogClose type="button" className="pre-diagnosis-dialog-close">
          <XIcon aria-hidden="true" size={18} weight="bold" />
          <span className="sr-only">Fechar</span>
        </DialogClose>

        <div className="pre-diagnosis-dialog-top">
          <div className="pre-diagnosis-dialog-brand">
            <span className="pre-diagnosis-dialog-mark">
              <Image src={logo} alt="" width={28} height={28} />
            </span>
            <span>Lucrivo</span>
          </div>
          <span className="pre-diagnosis-dialog-badge">
            <GiftIcon aria-hidden="true" size={16} weight="fill" />
            Oferta especial
          </span>
        </div>

        <div className="pre-diagnosis-dialog-stage">
          <DialogHeader className="pre-diagnosis-dialog-copy">
            <DialogTitle className="pre-diagnosis-dialog-title">
              Seu preço pode estar <br />
              <span className="pre-diagnosis-dialog-emphasis">
                dando prejuízo
                <svg
                  className="pre-diagnosis-dialog-scribble"
                  viewBox="0 0 220 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 11 C 28 16, 46 6, 78 12 S 130 17, 168 8 S 200 12, 217 9" />
                </svg>
              </span>{" "}
              <br />e você nem sabe.
            </DialogTitle>
            <DialogDescription className="pre-diagnosis-dialog-description">
              Faça seu <strong>diagnóstico gratuito</strong> e descubra se o
              preço dos seus produtos ou serviços cobre seus custos e gera
              lucro.
            </DialogDescription>
            <ul className="pre-diagnosis-dialog-questions">
              {questions.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <span className="pre-diagnosis-dialog-question-icon">
                    <Icon aria-hidden="true" size={20} weight="fill" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </DialogHeader>

          <figure className="pre-diagnosis-dialog-notebook">
            <Image
              className="pre-diagnosis-dialog-ebook"
              src={ebook}
              alt="Capa do e-book Guia Prático de Precificação."
              width={1086}
              height={1448}
              sizes="(max-width: 760px) 90px, 112px"
            />
            <picture className="pre-diagnosis-dialog-device">
              <source
                media="(max-width: 760px)"
                srcSet={mobilePreviewProps.srcSet}
                sizes={mobilePreviewProps.sizes}
              />
              <img {...desktopPreviewProps} alt={diagnosisPreviewAlt} />
            </picture>
          </figure>
        </div>

        <section
          className="pre-diagnosis-dialog-offer"
          aria-label="Primeiro diagnóstico gratuito"
        >
          <span className="pre-diagnosis-dialog-offer-gift">
            <GiftIcon
              className="pre-diagnosis-dialog-offer-icon"
              aria-hidden="true"
              size={36}
              weight="duotone"
            />
          </span>
          <p className="pre-diagnosis-dialog-offer-price">
            <span>Seu primeiro diagnóstico é</span>
            <strong>Grátis</strong>
          </p>
          <p className="pre-diagnosis-dialog-offer-note">
            Faça seu diagnóstico grátis e receba um e-book de brinde.
          </p>
        </section>

        <Link
          className="pre-diagnosis-dialog-cta"
          href="/quick-diagnosis"
          onClick={dismiss}
        >
          Quero fazer meu diagnóstico grátis
          <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
        </Link>
        <p className="pre-diagnosis-dialog-reassure">
          <LockSimpleIcon aria-hidden="true" size={15} weight="fill" />
          Gratuito, sem cartão de crédito e com resultado em poucos minutos.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { PreDiagnosisDialog, storageKey };
