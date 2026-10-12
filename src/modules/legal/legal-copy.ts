const LEGAL_COPY_VERSION = "terms-privacy-v1" as const;

type LegalSupplier = {
  fullName: string;
  cpf: string;
  address: string;
  email: "atendimento@lucrivo.com.br";
};

type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

function legalTermsSections(supplier: LegalSupplier): LegalSection[] {
  return [
    {
      id: "supplier",
      heading: "Quem oferece o Lucrivo",
      paragraphs: [
        `O Lucrivo é oferecido por ${supplier.fullName}, CPF ${supplier.cpf}, com endereço em ${supplier.address}. O contato é ${supplier.email}.`,
      ],
    },
    {
      id: "service",
      heading: "O que o serviço faz",
      paragraphs: [
        "Você informa os números do seu negócio. O Lucrivo calcula e explica esse resultado. O resultado não substitui contador, advogado nem consultor, e a decisão de preço continua sendo sua.",
        "A conversa com a inteligência artificial segue a mesma regra: ela explica os fatos do relatório, pode errar e não é orientação profissional.",
      ],
    },
    {
      id: "subscription",
      heading: "Conta e assinatura",
      paragraphs: [
        "A assinatura é mensal ou semestral, paga no cartão ou no Pix. A cobrança é processada pelo Asaas.",
      ],
    },
    {
      id: "guarantee",
      heading: "Garantia e cancelamento",
      paragraphs: [
        "Você tem 7 dias, contados da compra, para pedir a devolução do valor pelo mesmo meio de pagamento.",
        "O cancelamento mantém o acesso até o fim do período já pago. Não há fidelidade.",
      ],
    },
    {
      id: "version",
      heading: "Aceite desta versão",
      paragraphs: [
        `Estes termos e a política de privacidade formam a versão ${LEGAL_COPY_VERSION}. Quando o texto mudar, o Lucrivo pede um novo aceite.`,
      ],
    },
  ];
}

function legalPrivacySections(supplier: LegalSupplier): LegalSection[] {
  return [
    {
      id: "controller",
      heading: "Quem trata os dados",
      paragraphs: [
        `${supplier.fullName}, CPF ${supplier.cpf}, com endereço em ${supplier.address}, é quem trata os dados da sua conta. O contato é ${supplier.email}.`,
      ],
    },
    {
      id: "data",
      heading: "Quais dados entram",
      paragraphs: [
        "A conta guarda e-mail e a senha sob o serviço de autenticação. O perfil guarda nome, WhatsApp e segmento do negócio. O diagnóstico guarda os números que você informa. A cobrança guarda os dados do pagamento.",
      ],
    },
    {
      id: "basis",
      heading: "Por que os dados são usados",
      paragraphs: [
        "Os dados necessários para criar a conta, calcular o diagnóstico e cobrar a assinatura são tratados para executar o contrato. O WhatsApp de marketing é o único consentimento opcional: você liga e desliga essa escolha em Minha conta.",
      ],
    },
    {
      id: "processors",
      heading: "Quem recebe dados",
      paragraphs: [
        "O Supabase guarda a conta, o banco e envia os e-mails de autenticação. O Asaas processa a cobrança. A OpenAI recebe os fatos do relatório e a pergunta, sem o cadastro inteiro. A Cloudflare faz a verificação de segurança do cadastro, do login e da recuperação de senha.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      paragraphs: [
        "O Lucrivo usa cookies de sessão, o cookie do filtro do dashboard e o cookie do estado da sidebar. Eles mantêm o acesso e as preferências da interface. Não há cookie de publicidade.",
      ],
    },
    {
      id: "rights",
      heading: "Seus pedidos",
      paragraphs: [
        `Você corrige o perfil do negócio em Minha conta. O e-mail de acesso não é editado ali. Pedidos de acesso, portabilidade ou exclusão vão para ${supplier.email}.`,
      ],
    },
    {
      id: "deletion",
      heading: "Exclusão",
      paragraphs: [
        "A exclusão lógica tira o seu acesso e mantém diagnóstico, contrato e pagamento. Dados de cobrança permanecem pelo tempo da garantia e da obrigação fiscal. O apagamento do restante da conta ainda não existe no produto.",
      ],
    },
  ];
}

export {
  LEGAL_COPY_VERSION,
  legalPrivacySections,
  legalTermsSections,
  type LegalSection,
  type LegalSupplier,
};
