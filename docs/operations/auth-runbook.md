# Runbook de Auth

## Turnstile local

O desenvolvimento local usa exclusivamente as chaves dummy oficiais do
Cloudflare Turnstile:

- site key: `1x00000000000000000000AA`;
- secret: `1x0000000000000000000000000000000AA`.

Esses valores são públicos e servem apenas para testes automatizados e para a
stack Supabase local. Depois de alterar `[auth.captcha]` em
`supabase/config.toml`, reinicie a stack preservando os volumes com
`supabase stop` e `supabase start`.

## Ambientes hospedados

Nunca configure as chaves dummy em staging ou produção. Cada ambiente deve usar
um widget real e isolado do Turnstile:

- a site key pode ser armazenada como `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
- o secret existe somente na configuração de CAPTCHA do Supabase hospedado;
- o secret não pertence à Vercel, ao navegador, ao GitHub ou ao repositório;
- `AUTH_CAPTCHA_ENABLED` deve permanecer `true` nos ambientes hospedados.

O build de produção rejeita a site key dummy oficial. A proteção no Next.js não
substitui a validação do token pelo Supabase Auth.
