import { InstagramLogoIcon, YoutubeLogoIcon } from "@phosphor-icons/react";

import {
  GUARANTEE_DAYS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  type SocialLinkId,
} from "@/components/landing/landing-offer";

import "./landing-footer.css";

const socialIcons: Record<SocialLinkId, typeof InstagramLogoIcon> = {
  instagram: InstagramLogoIcon,
  youtube: YoutubeLogoIcon,
};

const footerColumns = [
  {
    title: "Navegar",
    links: [
      { href: "#caminhos", label: "Seu negócio" },
      { href: "#previa", label: "Prévia do diagnóstico" },
      { href: "#planos", label: "Planos" },
      { href: "#garantia", label: "Garantia" },
      { href: "#duvidas", label: "Dúvidas" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/register", label: "Criar conta" },
      { href: "/login", label: "Entrar" },
    ],
  },
] as const;

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-shell">
        <div className="footer-top">
          <div className="footer-brand-block">
            <a className="brand footer-brand" href="#top">
              lucrivo<span>.</span>
            </a>
            <p className="footer-tagline">
              Diagnóstico de preço e rentabilidade para pequenos negócios. Você
              informa os números, a Lucrivo faz a conta e explica o resultado.
            </p>

            <ul className="footer-social" aria-label="Redes sociais">
              {SOCIAL_LINKS.map(({ id, label, href }) => {
                const Icon = socialIcons[id];

                return (
                  <li key={id}>
                    <a
                      href={href}
                      aria-label={label}
                      title={label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon aria-hidden="true" size={20} weight="fill" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav className="footer-columns" aria-label="Links do rodapé">
            {footerColumns.map(({ title, links }) => (
              <div key={title} className="footer-column">
                <h3>{title}</h3>
                <ul>
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <a href={href}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="footer-column">
              <h3>Contato</h3>
              <ul>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                </li>
                <li className="footer-column-note">
                  Respondemos em até 2 dias úteis.
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} Lucrivo. Todos os direitos reservados.
          </small>
          <p>
            Cartão ou Pix · Garantia de {GUARANTEE_DAYS} dias · Sem fidelidade
          </p>
        </div>
      </div>
    </footer>
  );
}

export { LandingFooter };
