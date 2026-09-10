import Link from "next/link";
import {
  BadgeCheckIcon,
  ChartNoAxesColumnIncreasingIcon,
  CheckIcon,
  CreditCardIcon,
  CrownIcon,
  GiftIcon,
  LockKeyholeIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  SparklesIcon,
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

function formatBRL(cents: number): string {
  return currencyFormatter.format(cents / 100).replace(/\u00a0/g, " ");
}

function Benefit({
  icon: Icon = CheckIcon,
  children,
  accent = "success",
}: {
  icon?: typeof CheckIcon;
  children: React.ReactNode;
  accent?: "success" | "brand";
}) {
  return (
    <li>
      <span className={styles.benefitIcon} data-accent={accent}>
        <Icon aria-hidden="true" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function PlanHeader({
  icon: Icon,
  name,
  tagline,
  tone,
  Heading,
}: {
  icon: typeof GiftIcon;
  name: string;
  tagline: string;
  tone: "neutral" | "brand" | "warm";
  Heading: "h2" | "h3";
}) {
  return (
    <div className={styles.planHeader}>
      <span className={styles.planIcon} data-tone={tone}>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <Heading className={styles.planName}>{name}</Heading>
        <p className={styles.planTagline}>{tagline}</p>
      </div>
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
          <strong>Checkout protegido pelo Asaas</strong>
          <small>Seus dados de pagamento não ficam no Lucrivo</small>
        </span>
      </div>
      <div>
        <ReceiptTextIcon aria-hidden="true" />
        <span>
          <strong>Cobrança explicada antes de pagar</strong>
          <small>Período e renovação sem letras miúdas</small>
        </span>
      </div>
      <div>
        <BadgeCheckIcon aria-hidden="true" />
        <span>
          <strong>Acesso liberado após confirmação</strong>
          <small>Seu plano acompanha o pagamento confirmado</small>
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
      ? "Fazer diagnóstico grátis"
      : overview?.canCreateDiagnosis
        ? "Fazer diagnóstico"
        : "Ver meu relatório";

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
            <CreditCardIcon aria-hidden="true" />
            {cardLabel}
            <span aria-hidden="true" className={styles.actionArrow}>
              →
            </span>
          </Link>
          <Link href="/register" className={styles.secondaryAction}>
            <QrCodeIcon aria-hidden="true" />
            Pagar com Pix
          </Link>
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
            icon={GiftIcon}
            name="Grátis"
            tagline="Comece sem custo"
            tone="neutral"
            Heading={Heading}
          />
          <div className={styles.priceBlock}>
            <p className={styles.planPrice}>R$ 0</p>
            <p className={styles.planDescription}>
              Uma resposta objetiva para começar com clareza.
            </p>
          </div>
          <ul className={styles.benefits}>
            <Benefit>1 diagnóstico rápido</Benefit>
            <Benefit>1 relatório disponível para consulta</Benefit>
          </ul>
          <div className={styles.freeAction}>
            <Link href={freeHref} className={styles.outlineAction}>
              {freeAction}
              <span aria-hidden="true" className={styles.actionArrow}>
                →
              </span>
            </Link>
            <small>Sem cartão de crédito. Sem compromisso.</small>
          </div>
        </article>

        {catalogReady ? (
          <>
            <article
              className={`${styles.card} ${styles.featuredCard}`}
              aria-label="Plano Mensal"
            >
              <div className={styles.popularBadge}>
                <SparklesIcon aria-hidden="true" />
                Mais popular
              </div>
              <PlanHeader
                icon={ChartNoAxesColumnIncreasingIcon}
                name="Mensal"
                tagline="Flexibilidade para crescer"
                tone="brand"
                Heading={Heading}
              />
              <div className={styles.priceBlock}>
                <p className={styles.planPrice}>
                  {formatBRL(monthly.amountCents)}/mês
                </p>
                <p className={styles.planDescription}>
                  Para usar o Lucrivo continuamente nas decisões do negócio.
                </p>
              </div>
              <ul className={styles.benefits}>
                <Benefit>Diagnósticos ilimitados</Benefit>
                <Benefit>Todos os relatórios disponíveis</Benefit>
                <Benefit icon={CreditCardIcon} accent="brand">
                  Renovação automática no cartão. Cancele quando quiser.
                </Benefit>
                <Benefit icon={QrCodeIcon} accent="brand">
                  No Pix, você recebe 1 mês de acesso sem renovação automática.
                </Benefit>
              </ul>
              {checkoutActions(monthly, "Assinar no cartão", true)}
            </article>

            <article className={styles.card} aria-label="Plano Anual">
              <PlanHeader
                icon={CrownIcon}
                name="Anual"
                tagline="Mais economia no ano"
                tone="warm"
                Heading={Heading}
              />
              <div className={styles.priceBlock}>
                <p className={styles.planPrice}>
                  {formatBRL(annual.amountCents)}/ano
                </p>
                <p className={styles.planDescription}>
                  {formatBRL(annual.amountCents)} no Pix à vista ou em até{" "}
                  {annual.installmentLimit ?? 1}x sem juros no cartão —{" "}
                  {annual.installmentLimit ?? 1}x de{" "}
                  {formatBRL(
                    annual.amountCents / (annual.installmentLimit ?? 1),
                  )}
                  . Sem renovação automática.
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
                <Benefit>Diagnósticos ilimitados por 12 meses</Benefit>
                <Benefit>Todos os relatórios disponíveis</Benefit>
                <Benefit>Uma compra, sem renovação automática</Benefit>
              </ul>
              {checkoutActions(annual, "Pagar no cartão")}
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
