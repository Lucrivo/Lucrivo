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
  const semiannual = prices.find((price) => price.billingMode === "semiannual");

  const sharedCatalogReady =
    monthly !== undefined &&
    semiannual !== undefined &&
    monthly.catalogCode === semiannual.catalogCode &&
    monthly.installmentLimit === null &&
    semiannual.installmentLimit === 6 &&
    semiannual.amountCents % semiannual.installmentLimit === 0;
  const launchCatalogReady =
    sharedCatalogReady &&
    monthly.catalogCode === "launch" &&
    monthly.amountCents === 3990 &&
    monthly.accessMonths === 2 &&
    monthly.bonusMonths === 1 &&
    semiannual.amountCents === 17940 &&
    semiannual.accessMonths === 12 &&
    semiannual.bonusMonths === 6;
  const standardCatalogReady =
    sharedCatalogReady &&
    monthly.catalogCode === "standard" &&
    monthly.amountCents === 4990 &&
    monthly.accessMonths === 1 &&
    monthly.bonusMonths === 0 &&
    semiannual.amountCents === 23940 &&
    semiannual.accessMonths === 6 &&
    semiannual.bonusMonths === 0;
  const catalogReady = launchCatalogReady || standardCatalogReady;
  const isLaunch = launchCatalogReady;

  const Heading = context === "public" ? "h3" : "h2";

  const freeHref =
    context === "public"
      ? "/register"
      : overview?.canCreateQuickDiagnosis
        ? "/quick-diagnosis"
        : "/reports";

  const freeAction =
    context === "public"
      ? "Começar grátis"
      : overview?.canCreateQuickDiagnosis
        ? "Fazer diagnóstico"
        : "Ver meu relatório";

  const semiannualInstallmentLimit = semiannual?.installmentLimit ?? 1;

  const semiannualInstallmentAmountCents = semiannual
    ? semiannual.amountCents / semiannualInstallmentLimit
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
            {isLaunch
              ? "Crie a conta primeiro. Ao iniciar o checkout, esta condição fica reservada por 1 hora."
              : "Crie a conta primeiro. Cartão ou Pix na hora de assinar."}
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
        {isLaunch ? (
          <p className={styles.signupHint}>
            Ao iniciar o checkout, esta condição fica reservada por 1 hora.
          </p>
        ) : null}
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
              aria-label="Plano Semestral"
            >
              <div className={styles.popularBadge}>
                <span aria-hidden="true" className={styles.popularDot} />
                {isLaunch ? "Oferta de lançamento" : "Mais vantajoso"}
              </div>

              <PlanHeader
                name="Semestral"
                tagline="Melhor custo-benefício"
                Heading={Heading}
              />

              <div className={styles.priceBlock}>
                <p className={`${styles.planPrice} ${styles.fixedTermPrice}`}>
                  <span className={styles.installmentValue}>
                    <span className={styles.installmentCount}>
                      em até {semiannualInstallmentLimit}x de{" "}
                    </span>
                    <span className={styles.installmentAmount}>
                      {formatBRL(semiannualInstallmentAmountCents)}
                    </span>
                  </span>
                  <small> ou {formatBRL(semiannual.amountCents)} à vista</small>
                </p>
                {isLaunch ? (
                  <>
                    <p className={styles.saving}>
                      <BadgeCheckIcon aria-hidden="true" />
                      {semiannual.bonusMonths} meses de bônus incluídos
                    </p>
                    <p className={styles.comparisonPrice}>
                      Depois da oferta: {formatBRL(23940)}
                    </p>
                  </>
                ) : (
                  <p className={styles.saving}>
                    <BadgeCheckIcon aria-hidden="true" />
                    Economize {formatBRL(6000)} em seis meses
                  </p>
                )}
              </div>

              <ul className={styles.benefits}>
                {paidBenefits.map((benefit) => (
                  <Benefit key={benefit}>{benefit}</Benefit>
                ))}
                <Benefit>{semiannual.accessMonths} meses de acesso</Benefit>
              </ul>

              {checkoutActions(
                semiannual,
                context === "public"
                  ? "Escolher semestral"
                  : "Assinar semestral",
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
                  {isLaunch
                    ? `${monthly.accessMonths} meses no primeiro pagamento`
                    : "Ideal para pagar mês a mês com flexibilidade."}
                </p>
                {isLaunch ? (
                  <>
                    <p className={styles.saving}>
                      <BadgeCheckIcon aria-hidden="true" />
                      {monthly.bonusMonths} mês de bônus incluído
                    </p>
                    <p className={styles.comparisonPrice}>
                      Depois da oferta: {formatBRL(4990)}/mês
                    </p>
                  </>
                ) : null}
              </div>

              <ul className={styles.benefits}>
                {paidBenefits.map((benefit) => (
                  <Benefit key={benefit}>{benefit}</Benefit>
                ))}
                {isLaunch ? (
                  <Benefit>
                    {monthly.accessMonths} meses de acesso inicial
                  </Benefit>
                ) : null}
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
