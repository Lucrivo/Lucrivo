import Link from "next/link";
import {
  BadgeCheckIcon,
  CheckIcon,
  CreditCardIcon,
  LockKeyholeIcon,
  QrCodeIcon,
  ReceiptTextIcon,
} from "lucide-react";

import type { ActiveBillingPrice, BillingOverview } from "../types";
import { CheckoutButton } from "./checkout-button";
import styles from "./billing-plans.module.css";

type BillingPlansProps = {
  prices: ActiveBillingPrice[];
  overview?: BillingOverview;
  context: "public" | "account";
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const paidBenefits = [
  "Diagnósticos rápidos e detalhados ilimitados",
  "Relatórios completos ilimitados",
  "IA para explicar e interpretar seus relatórios",
  "Vários produtos no mesmo diagnóstico detalhado",
] as const;

function formatBRL(cents: number): string {
  return currencyFormatter.format(cents / 100).replace(/\u00a0/g, " ");
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <CheckIcon aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function PlanHeader({
  name,
  tagline,
  Heading,
}: {
  name: string;
  tagline: string;
  Heading: "h2" | "h3";
}) {
  return (
    <div className={styles.planHeader}>
      <Heading className={styles.planName}>{name}</Heading>
      <p className={styles.planTagline}>{tagline}</p>
    </div>
  );
}

function TrustRail() {
  return (
    <div
      className={styles.trustRail}
      role="region"
      aria-label="Segurança e transparência"
    >
      <div>
        <LockKeyholeIcon aria-hidden="true" />

        <span>
          <strong>Pagamento seguro com Asaas</strong>
          <small>Seus dados protegidos</small>
        </span>
      </div>

      <div>
        <ReceiptTextIcon aria-hidden="true" />

        <span>
          <strong>Sem letras miúdas</strong>
          <small>Preços e condições transparentes</small>
        </span>
      </div>

      <div>
        <BadgeCheckIcon aria-hidden="true" />

        <span>
          <strong>Acesso liberado após confirmação</strong>
          <small>Comece a usar em instantes</small>
        </span>
      </div>
    </div>
  );
}

function BillingPlans({ prices, overview, context }: BillingPlansProps) {
  const monthly = prices.find((price) => price.billingMode === "monthly");
  const annual = prices.find((price) => price.billingMode === "annual");

  const catalogReady = monthly !== undefined && annual !== undefined;

  const Heading = context === "public" ? "h3" : "h2";

  const freeHref =
    context === "public"
      ? "/register"
      : overview?.canCreateDiagnosis
        ? "/quick-diagnosis"
        : "/reports";

  const freeAction =
    context === "public"
      ? "Começar grátis"
      : overview?.canCreateDiagnosis
        ? "Fazer diagnóstico"
        : "Ver meu relatório";

  const annualInstallmentLimit = annual?.installmentLimit ?? 1;

  const annualInstallmentAmountCents = annual
    ? Math.round(annual.amountCents / annualInstallmentLimit)
    : 0;

  function checkoutActions(
    price: ActiveBillingPrice,
    cardLabel: string,
    featured = false,
  ) {
    if (context === "public") {
      return (
        <div className={styles.planActions}>
          <Link
            href="/register"
            className={featured ? styles.primaryAction : styles.darkAction}
          >
            {cardLabel}

            <span aria-hidden="true" className={styles.actionArrow}>
              →
            </span>
          </Link>

          <p className={styles.signupHint}>
            Crie a conta primeiro. Cartão ou Pix na hora de assinar.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.planActions}>
        <CheckoutButton
          priceId={price.id}
          paymentMethod="credit_card"
          className={featured ? styles.primaryAction : styles.darkAction}
        >
          <CreditCardIcon aria-hidden="true" />

          {cardLabel}

          <span aria-hidden="true" className={styles.actionArrow}>
            →
          </span>
        </CheckoutButton>

        <CheckoutButton
          priceId={price.id}
          paymentMethod="pix"
          className={styles.secondaryAction}
        >
          <QrCodeIcon aria-hidden="true" />
          Pagar com Pix
        </CheckoutButton>
      </div>
    );
  }

  return (
    <div
      className={styles.root}
      data-context={context}
      role="region"
      aria-label="Opções de plano"
    >
      <div className={styles.grid} data-catalog-ready={catalogReady}>
        <article className={styles.card} aria-label="Plano gratuito">
          <PlanHeader
            name="Grátis"
            tagline="Comece sem custo"
            Heading={Heading}
          />

          <div className={styles.priceBlock}>
            <p className={styles.planPrice}>R$ 0</p>

            <p className={styles.planDescription}>
              Conheça o Lucrivo sem compromisso.
            </p>
          </div>

          <ul className={styles.benefits}>
            <Benefit>1 diagnóstico rápido</Benefit>
            <Benefit>1 relatório completo</Benefit>
          </ul>

          <div className={styles.freeAction}>
            <Link href={freeHref} className={styles.outlineAction}>
              {freeAction}

              <span aria-hidden="true" className={styles.actionArrow}>
                →
              </span>
            </Link>

            <small>Sem cartão de crédito.</small>
          </div>
        </article>

        {catalogReady ? (
          <>
            <article
              className={`${styles.card} ${styles.featuredCard}`}
              aria-label="Plano Anual"
            >
              <div className={styles.popularBadge}>
                <span aria-hidden="true" className={styles.popularDot} />
                Mais vantajoso
              </div>

              <PlanHeader
                name="Anual"
                tagline="Melhor custo-benefício"
                Heading={Heading}
              />

              <div className={styles.priceBlock}>
                <p className={`${styles.planPrice} ${styles.annualPrice}`}>
                  <span className={styles.installmentCount}>
                    {annualInstallmentLimit}x de
                  </span>

                  <span className={styles.installmentValue}>
                    {formatBRL(annualInstallmentAmountCents)}
                  </span>
                </p>

                <p className={styles.planDescription}>
                  ou {formatBRL(annual.amountCents)} à vista
                </p>

                {monthly.amountCents * 12 > annual.amountCents ? (
                  <p className={styles.saving}>
                    <BadgeCheckIcon aria-hidden="true" />
                    Economize{" "}
                    {formatBRL(
                      monthly.amountCents * 12 - annual.amountCents,
                    )}{" "}
                    no ano.
                  </p>
                ) : null}
              </div>

              <ul className={styles.benefits}>
                {paidBenefits.map((benefit) => (
                  <Benefit key={benefit}>{benefit}</Benefit>
                ))}
                <Benefit>12 meses de acesso</Benefit>
              </ul>

              {checkoutActions(
                annual,
                context === "public" ? "Escolher anual" : "Assinar anual",
                true,
              )}
            </article>

            <article className={styles.card} aria-label="Plano Mensal">
              <PlanHeader
                name="Mensal"
                tagline="Mais flexibilidade"
                Heading={Heading}
              />

              <div className={styles.priceBlock}>
                <p className={styles.planPrice}>
                  {formatBRL(monthly.amountCents)}/mês
                </p>

                <p className={styles.planDescription}>
                  Ideal para pagar mês a mês com flexibilidade.
                </p>
              </div>

              <ul className={styles.benefits}>
                {paidBenefits.map((benefit) => (
                  <Benefit key={benefit}>{benefit}</Benefit>
                ))}
              </ul>

              {checkoutActions(
                monthly,
                context === "public" ? "Escolher mensal" : "Assinar mensal",
              )}
            </article>
          </>
        ) : (
          <article
            className={`${styles.card} ${styles.unavailableCard}`}
            aria-labelledby="paid-plans-unavailable"
          >
            <span className={styles.unavailableIcon}>
              <ReceiptTextIcon aria-hidden="true" />
            </span>

            <div>
              <Heading
                id="paid-plans-unavailable"
                className={styles.unavailableTitle}
              >
                Planos pagos temporariamente indisponíveis
              </Heading>

              <p className={styles.planDescription} role="status">
                Não conseguimos carregar os valores agora. Atualize a página em
                alguns instantes para tentar novamente.
              </p>
            </div>
          </article>
        )}
      </div>

      <TrustRail />
    </div>
  );
}

export { BillingPlans, formatBRL };
export type { BillingPlansProps };
