function LandingFooter() {
  return (
    <footer className="landing-footer">
      <a className="brand footer-brand" href="#top">
        lucrivo<span>.</span>
      </a>
      <p>Diagnóstico de preço e rentabilidade para pequenos negócios.</p>
      <div>
        <a href="#como-funciona">Como funciona</a>
        <a href="#planos">Planos</a>
      </div>
      <small>© {new Date().getFullYear()} Lucrivo.</small>
    </footer>
  );
}

export { LandingFooter };
