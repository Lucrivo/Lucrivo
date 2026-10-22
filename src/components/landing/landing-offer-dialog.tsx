"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRightIcon,
  ChartBarIcon,
  CrownIcon,
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
import { cn } from "@/lib/utils";
import logo from "@/public/brand/lucrivo-logo-dark.svg";
import tablet from "@/public/lp/tablet-diagnostico-financeiro.png";

import type { LandingOfferPresentation } from "./landing-offer";

import "./landing-offer-dialog.css";

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
    text: "Onde o seu dinheiro está indo?",
  },
] as const;

function monthWord(count: number) {
  return count === 1 ? "mês" : "meses";
}

function LandingOfferDialog({ offer }: { offer: LandingOfferPresentation }) {
  const [open, setOpen] = useState(true);
  const promotional = offer.monthlyRenewalPriceLabel !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "landing-offer-dialog",
          promotional && "landing-offer-dialog-offset",
        )}
      >
        <DialogClose type="button" className="landing-offer-dialog-close">
          <XIcon aria-hidden="true" size={18} weight="bold" />
          <span className="sr-only">Fechar</span>
        </DialogClose>

        <div className="landing-offer-dialog-top">
          <div className="landing-offer-dialog-brand">
            <span className="landing-offer-dialog-mark">
              <Image src={logo} alt="" width={28} height={28} />
            </span>
            <span>Lucrivo</span>
          </div>
          {promotional ? (
            <span className="landing-offer-dialog-badge">
              <GiftIcon aria-hidden="true" size={16} weight="fill" />
              Oferta de lançamento
            </span>
          ) : null}
        </div>

        <div className="landing-offer-dialog-stage">
          <DialogHeader className="landing-offer-dialog-copy">
            <DialogTitle className="landing-offer-dialog-title">
              Seu preço pode estar <br />
              <span className="landing-offer-dialog-emphasis">
                dando prejuízo
                <svg
                  className="landing-offer-dialog-scribble"
                  viewBox="0 0 220 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 11 C 28 16, 46 6, 78 12 S 130 17, 168 8 S 200 12, 217 9" />
                </svg>
              </span>{" "}
              <br />e você nem sabe.
            </DialogTitle>
            <DialogDescription className="landing-offer-dialog-description">
              Faça o diagnóstico e descubra onde estão os problemas no seu preço{" "}
              <strong>em poucos minutos.</strong>
            </DialogDescription>
            <ul className="landing-offer-dialog-questions">
              {questions.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <span className="landing-offer-dialog-question-icon">
                    <Icon aria-hidden="true" size={20} weight="fill" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </DialogHeader>

          <figure className="landing-offer-dialog-tablet">
            <Image
              src={tablet}
              alt="Tablet mostrando a etapa 1 do diagnóstico financeiro, com as opções Serviço, Produto e Produção."
              width={974}
              height={1319}
              sizes="(max-width: 720px) 240px, 380px"
              priority
            />
          </figure>
        </div>

        <section
          className="landing-offer-dialog-price"
          aria-label="Plano mensal"
        >
          <div>
            <p className="landing-offer-dialog-plan">Plano mensal</p>
            <p className="landing-offer-dialog-amount">
              <span className="landing-offer-dialog-value">
                {offer.monthlyPriceLabel}
              </span>
              {offer.monthlyPriceQualifier ? (
                <span className="landing-offer-dialog-qualifier">
                  {offer.monthlyPriceQualifier}
                </span>
              ) : (
                <span className="landing-offer-dialog-per">/mês</span>
              )}
            </p>
          </div>

          {promotional ? (
            <div className="landing-offer-dialog-condition">
              {offer.monthlyBonusMonths > 0 ? (
                <p className="landing-offer-dialog-condition-copy">
                  <span
                    className="landing-offer-dialog-crown"
                    aria-hidden="true"
                  >
                    <CrownIcon size={15} weight="fill" />
                  </span>
                  <strong>
                    Inclui {offer.monthlyAccessMonths}{" "}
                    {monthWord(offer.monthlyAccessMonths)} de acesso
                  </strong>{" "}
                  + {offer.monthlyBonusMonths}{" "}
                  {monthWord(offer.monthlyBonusMonths)} de bônus com materiais
                  práticos.
                </p>
              ) : null}
              <p className="landing-offer-dialog-renewal">
                {offer.monthlyRenewalPriceLabel}
              </p>
            </div>
          ) : null}
        </section>

        <a className="landing-offer-dialog-cta" href="/register">
          Quero fazer meu diagnóstico agora
          <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
        </a>
        <p className="landing-offer-dialog-reassure">
          <LockSimpleIcon aria-hidden="true" size={15} weight="fill" />
          Acesso imediato e cancelamento quando quiser.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { LandingOfferDialog };
