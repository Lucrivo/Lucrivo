"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightIcon,
  CrownIcon,
  GiftIcon,
  LockKeyholeIcon,
  TargetIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";

import logo from "@/assets/brand/lucrivo-logo.svg";
import notebook from "@/assets/diagnosis/notebook-dashboard.png";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OfferPresentation } from "@/modules/billing/presenters/offer-presentation";

import "./post-diagnosis-dialog.css";

type LaunchOfferDialogProps = {
  offer: OfferPresentation;
  dismissHref?: string;
};

function LaunchOfferDialog({ offer, dismissHref }: LaunchOfferDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && dismissHref) {
      router.replace(dismissHref, { scroll: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="post-diagnosis-dialog">
        <DialogClose type="button" className="post-diagnosis-close">
          <XIcon aria-hidden="true" size={18} />
          <span className="sr-only">Fechar</span>
        </DialogClose>

        <div className="post-diagnosis-top">
          <div className="post-diagnosis-brand" aria-label="Lucrivo">
            <span className="post-diagnosis-mark">
              <Image src={logo} alt="" width={30} height={30} priority />
            </span>
            <span>Lucrivo</span>
          </div>

          {offer.promotional ? (
            <span className="post-diagnosis-badge">
              <GiftIcon aria-hidden="true" size={16} />
              Oferta de lançamento
            </span>
          ) : null}
        </div>

        <div className="post-diagnosis-stage">
          <DialogHeader className="post-diagnosis-copy">
            <DialogTitle className="post-diagnosis-title">
              Você já descobriu como está seu preço.{" "}
              <span>Agora saiba como lucrar mais.</span>
            </DialogTitle>
            <DialogDescription className="post-diagnosis-description">
              Continue acompanhando seu negócio e tome decisões com mais
              segurança.
            </DialogDescription>

            <ul className="post-diagnosis-benefits">
              <li>
                <span>
                  <TrendingUpIcon aria-hidden="true" size={20} />
                </span>
                Entenda quanto realmente sobra das suas vendas.
              </li>
              <li>
                <span>
                  <TargetIcon aria-hidden="true" size={20} />
                </span>
                Saiba quando vale a pena ajustar seu preço.
              </li>
            </ul>
          </DialogHeader>

          <figure className="post-diagnosis-notebook">
            <Image
              src={notebook}
              alt="Notebook mostrando o painel financeiro do Lucrivo."
              width={1536}
              height={1024}
              sizes="(max-width: 720px) 280px, 350px"
              priority
            />
          </figure>
        </div>

        <section className="post-diagnosis-offer" aria-label="Plano mensal">
          <div className="post-diagnosis-offer-main">
            <div className="post-diagnosis-price">
              <p>
                {offer.promotional ? "Oferta de lançamento" : "Plano mensal"}
              </p>
              <div className="post-diagnosis-amount">
                <strong>{offer.monthlyPriceLabel}</strong>
                <span>{offer.monthlyPriceQualifier ?? "/mês"}</span>
              </div>
              {offer.monthlyRenewalPriceLabel ? (
                <small>{offer.monthlyRenewalPriceLabel}</small>
              ) : null}
            </div>

            {offer.monthlyBonusMonths > 0 ? (
              <div className="post-diagnosis-bonus">
                <CrownIcon aria-hidden="true" size={23} />
                <div>
                  <strong>
                    Inclui {offer.monthlyBonusMonths} mês de bônus
                  </strong>
                  <span>
                    Você fica {offer.monthlyAccessMonths} meses com tudo
                    liberado.
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <Link className="post-diagnosis-cta" href="/billing">
            Quero liberar meu acesso completo
            <ArrowRightIcon aria-hidden="true" size={20} />
          </Link>
        </section>

        <p className="post-diagnosis-reassure">
          <LockKeyholeIcon aria-hidden="true" size={16} />
          <span>Acesso imediato e cancelamento quando quiser.</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { LaunchOfferDialog };
export type { LaunchOfferDialogProps };
