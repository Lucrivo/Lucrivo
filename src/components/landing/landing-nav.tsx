"use client";

import { useState } from "react";
import { ArrowUpRightIcon, ListIcon, XIcon } from "@phosphor-icons/react";

const navLinks = [
  { href: "#caminhos", label: "Seu negócio" },
  { href: "#planos", label: "Planos" },
  { href: "#garantia", label: "Garantia" },
  { href: "#duvidas", label: "Dúvidas" },
] as const;

function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav-wrap" aria-label="Navegação principal">
      <a className="brand" href="#top" aria-label="Lucrivo, início">
        lucrivo<span>.</span>
      </a>

      <div className="desktop-nav">
        {navLinks.map(({ href, label }) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>

      <div className="nav-actions">
        <a className="nav-login" href="/login">
          Entrar
        </a>
        <a className="nav-cta" href="/register">
          Assinar agora{" "}
          <ArrowUpRightIcon aria-hidden="true" size={16} weight="bold" />
        </a>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
      </button>

      {menuOpen && (
        <div className="mobile-nav">
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a href="/login" onClick={() => setMenuOpen(false)}>
            Entrar
          </a>
          <a
            className="mobile-nav-cta"
            href="/register"
            onClick={() => setMenuOpen(false)}
          >
            Assinar agora
          </a>
        </div>
      )}
    </nav>
  );
}

export { LandingNav };
