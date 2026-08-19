import Link from "next/link";

import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>Entrar</h1>

      <form action={login}>
        <div>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error === "invalid_credentials" && (
          <p role="alert">E-mail ou senha inválidos.</p>
        )}

        <button type="submit">Entrar</button>
      </form>

      <p>
        Ainda não tem uma conta? <Link href="/register">Cadastre-se</Link>
      </p>
    </main>
  );
}
