import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react";

import { GuaranteeNote } from "@/components/landing/guarantee-note";
import {
  GUARANTEE_DAYS,
  SUPPORT_EMAIL,
} from "@/components/landing/landing-offer";

import "./faq-section.css";

const INITIALLY_OPEN_COUNT = 4;

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

type FaqGroup = {
  title: string;
  description: string;
  items: FaqItem[];
};

function SupportEmailLink() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

function buildFaqGroups(monthlyPriceLabel: string): FaqGroup[] {
  return [
    {
      title: "Sobre a assinatura",
      description:
        "O que muda em relação ao diagnóstico grátis e para quem a Lucrivo funciona.",
      items: [
        {
          question: "Já fiz o diagnóstico grátis. Por que assinar?",
          answer:
            "O grátis mostrou um produto, uma vez. Assinando, você confere todos os seus produtos, quantas vezes quiser, e refaz a conta sempre que um custo mudar.",
        },
        {
          question: `${monthlyPriceLabel} não é caro?`,
          answer: `Pense assim: se você vende 50 unidades por mês e descobre que pode cobrar R$ 1 a mais em cada uma, a assinatura já se pagou. E você ainda tem ${GUARANTEE_DAYS} dias para testar.`,
        },
        {
          question: "Funciona para o meu tipo de negócio?",
          answer:
            "Funciona para quem revende, para quem produz e para quem presta serviço. Se você cobra um preço, a Lucrivo te ajuda a saber se ele dá lucro.",
        },
        {
          question: "Preciso entender de conta ou de imposto?",
          answer:
            "Não. Você responde perguntas simples, uma de cada vez, e a Lucrivo faz a conta e explica o resultado com palavras do dia a dia.",
        },
        {
          question: "E se eu não souber algum número?",
          answer:
            "Coloque uma estimativa. Depois você volta e ajusta quando tiver o valor certo.",
        },
        {
          question: "Não tenho muito tempo. Vou conseguir usar?",
          answer:
            "Cada produto leva poucos minutos. Você pode fazer um por dia, no seu ritmo.",
        },
      ],
    },
    {
      title: "Sobre pagamento e garantia",
      description:
        "Como você paga, como cancela e como pede o dinheiro de volta.",
      items: [
        {
          question: "Como funciona a garantia?",
          answer: (
            <>
              Você tem {GUARANTEE_DAYS} dias a partir da compra. Se não gostar,
              manda um email para <SupportEmailLink /> e devolvemos todo o
              valor, sem precisar explicar o motivo.
            </>
          ),
        },
        {
          question: "Tem fidelidade?",
          answer:
            "Não. Você cancela quando quiser e o acesso continua até o fim do mês que já pagou.",
        },
        {
          question: "O que acontece depois dos 30 dias?",
          answer: `A assinatura renova todo mês por ${monthlyPriceLabel}. Se não quiser continuar, é só cancelar antes da próxima cobrança.`,
        },
        {
          question: "Posso pagar com Pix?",
          answer: "Pode. Cartão ou Pix.",
        },
        {
          question: "Quando consigo usar?",
          answer:
            "Na hora. Assim que o pagamento é confirmado, o acesso libera.",
        },
      ],
    },
    {
      title: "Sobre seus dados e suporte",
      description: "Onde ficam os seus números e como falar com a gente.",
      items: [
        {
          question: "Meus dados do diagnóstico grátis continuam lá?",
          answer: "Continuam. É só entrar com o mesmo email.",
        },
        {
          question: "Meus números ficam seguros?",
          answer:
            "Ficam. Eles são usados só para fazer as suas contas e nunca são vendidos.",
        },
        {
          question: "Funciona no celular?",
          answer: "Funciona no celular e no computador.",
        },
        {
          question: "E se eu tiver dúvida usando?",
          answer: (
            <>
              Fale com a gente pelo email <SupportEmailLink />. Respondemos em
              até 2 dias úteis.
            </>
          ),
        },
      ],
    },
  ];
}

function FaqSection({ monthlyPriceLabel }: { monthlyPriceLabel: string }) {
  const groups = buildFaqGroups(monthlyPriceLabel);

  // Position of each group's first question in the flattened list, so the
  // "first N open" rule spans group boundaries.
  const groupOffsets = groups.map((_, index) =>
    groups
      .slice(0, index)
      .reduce((total, group) => total + group.items.length, 0),
  );

  return (
    <section
      id="duvidas"
      className="faq-section chapter"
      aria-labelledby="faq-title"
    >
      <div className="faq-shell">
        <header className="faq-header">
          <div>
            <p className="eyebrow">Perguntas frequentes</p>
            <h2 id="faq-title">Ficou alguma dúvida?</h2>
          </div>
          <p className="faq-header-lead">
            Respostas diretas sobre a assinatura, o pagamento, a garantia e os
            seus dados. Se faltar alguma, é só escrever para a gente.
          </p>
        </header>

        <div className="faq-groups">
          {groups.map(({ title, description, items }, groupIndex) => {
            const headingId = `faq-group-${groupIndex + 1}`;

            return (
              <section
                key={title}
                className="faq-group"
                aria-labelledby={headingId}
              >
                <div className="faq-group-intro">
                  <span className="faq-group-index" aria-hidden="true">
                    {String(groupIndex + 1).padStart(2, "0")}
                  </span>
                  <h3 id={headingId}>{title}</h3>
                  <p>{description}</p>
                </div>

                <div className="faq-list">
                  {items.map(({ question, answer }, itemIndex) => (
                    <details
                      key={question}
                      className="faq-item"
                      open={
                        groupOffsets[groupIndex] + itemIndex <
                        INITIALLY_OPEN_COUNT
                      }
                    >
                      <summary>
                        <span className="faq-question">{question}</span>
                        <span className="faq-toggle" aria-hidden="true">
                          <PlusIcon size={16} weight="bold" />
                        </span>
                      </summary>
                      <div className="faq-answer">
                        <p>{answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="faq-closing" aria-label="Fale com a gente">
          <div className="faq-closing-copy">
            <p className="faq-closing-kicker">Não achou sua dúvida?</p>
            <p className="faq-closing-contact">
              Escreva para <SupportEmailLink />
            </p>
            <p className="faq-closing-meta">Respondemos em até 2 dias úteis.</p>
          </div>

          <div className="faq-closing-action">
            <a className="button button-primary button-large" href="/register">
              Quero assinar por {monthlyPriceLabel}/mês
              <ArrowRightIcon aria-hidden="true" size={20} weight="bold" />
            </a>
            <GuaranteeNote>
              <strong>Garantia de {GUARANTEE_DAYS} dias.</strong> Pediu
              reembolso, devolvemos. Sem perguntas.
            </GuaranteeNote>
          </div>
        </aside>
      </div>
    </section>
  );
}

export { FaqSection };
