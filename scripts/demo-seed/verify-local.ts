import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SENTINEL_ID = "e0000000-0000-4000-8000-000000000001";

type VerificationCommand = {
  executable: "psql";
  args: string[];
  shell: false;
};

function psqlCommand(...args: string[]): VerificationCommand {
  return {
    executable: "psql",
    args: [LOCAL_DATABASE_URL, "-X", "-v", "ON_ERROR_STOP=1", ...args],
    shell: false,
  };
}

function buildLocalVerificationCommands(): VerificationCommand[] {
  const insertSentinel = `insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '${SENTINEL_ID}'::uuid,
  'authenticated', 'authenticated', 'sentinel@outside-seed.test',
  extensions.crypt('LucrivoSeed2026AA', extensions.gen_salt('bf')),
  statement_timestamp(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email_verified":true}'::jsonb, statement_timestamp(),
  statement_timestamp(), false, false
) on conflict (id) do update set updated_at = statement_timestamp();`;
  const countQuery = `select json_build_object(
  'users', (select count(*) from auth.users where id between
    'd1000000-0000-4000-8000-000000000000'::uuid and
    'd1000000-0000-4000-8000-000000000060'::uuid),
  'reports', (select count(*) from public.diagnoses where user_id between
    'd1000000-0000-4000-8000-000000000000'::uuid and
    'd1000000-0000-4000-8000-000000000060'::uuid),
  'sentinel', (select count(*) from auth.users where id = '${SENTINEL_ID}'::uuid)
);`;
  const cleanupSentinel = `delete from auth.users where id = '${SENTINEL_ID}'::uuid;`;

  return [
    psqlCommand("-c", insertSentinel),
    psqlCommand("-f", "supabase/seed.sql"),
    psqlCommand("-A", "-t", "-c", countQuery),
    psqlCommand("-c", cleanupSentinel),
  ];
}

function run(command: VerificationCommand, capture = false): string {
  const result = spawnSync(command.executable, command.args, {
    encoding: "utf8",
    shell: command.shell,
    stdio: capture
      ? ["ignore", "pipe", "inherit"]
      : ["ignore", "ignore", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Local verification command failed with status ${result.status}.`,
    );
  }
  return result.stdout?.trim() ?? "";
}

function verifyLocalSeed(): void {
  const [insert, seed, counts, cleanup] = buildLocalVerificationCommands();
  try {
    run(insert!);
    run(seed!);
    const result = JSON.parse(run(counts!, true)) as {
      users: number;
      reports: number;
      sentinel: number;
    };
    if (
      result.users !== 97 ||
      result.reports !== 295 ||
      result.sentinel !== 1
    ) {
      throw new Error(
        `Unexpected local seed counts: ${JSON.stringify(result)}`,
      );
    }
    console.log(
      "Local demo seed verified: 97 users, 295 reports, sentinel preserved.",
    );
  } finally {
    run(cleanup!);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) verifyLocalSeed();

export {
  LOCAL_DATABASE_URL,
  SENTINEL_ID,
  buildLocalVerificationCommands,
  verifyLocalSeed,
};
