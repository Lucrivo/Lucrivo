import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { checkGeneratedSeed, generateDemoSeed } from "./generate";
import {
  STAGING_PROJECT_REF,
  assertStagingDatabaseUrl,
  assertStagingSeedAllowed,
} from "./staging-target";

const linkedProjectRef = readFileSync("supabase/.temp/project-ref", "utf8");
assertStagingSeedAllowed({
  allow: process.env.ALLOW_STAGING_SEED,
  linkedProjectRef,
});
const databaseUrl = assertStagingDatabaseUrl(process.env.STAGING_DATABASE_URL);
checkGeneratedSeed(generateDemoSeed());

console.log(
  `Applying demo seed to lucrivo-staging (${STAGING_PROJECT_REF})...`,
);
const apply = spawnSync(
  "psql",
  ["-X", "-v", "ON_ERROR_STOP=1", "-f", "supabase/seed.sql"],
  {
    env: { ...process.env, PGDATABASE: databaseUrl },
    shell: false,
    stdio: ["ignore", "ignore", "inherit"],
  },
);
if (apply.error) throw apply.error;
if (apply.status !== 0) {
  throw new Error(`Staging seed failed with status ${apply.status}.`);
}

const counts = spawnSync(
  "psql",
  [
    "-X",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `select json_build_object(
      'users', (select count(*) from auth.users where id between
        'd1000000-0000-4000-8000-000000000000'::uuid and
        'd1000000-0000-4000-8000-000000000060'::uuid),
      'reports', (select count(*) from public.diagnoses where user_id between
        'd1000000-0000-4000-8000-000000000000'::uuid and
        'd1000000-0000-4000-8000-000000000060'::uuid)
    );`,
  ],
  {
    encoding: "utf8",
    env: { ...process.env, PGDATABASE: databaseUrl },
    shell: false,
    stdio: ["ignore", "pipe", "inherit"],
  },
);
if (counts.error) throw counts.error;
if (counts.status !== 0) {
  throw new Error(
    `Staging count verification failed with status ${counts.status}.`,
  );
}
console.log(`Staging demo seed applied: ${counts.stdout.trim()}`);
