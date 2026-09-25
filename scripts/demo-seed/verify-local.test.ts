import { describe, expect, it } from "vitest";

import {
  LOCAL_DATABASE_URL,
  buildLocalVerificationCommands,
} from "./verify-local";

describe("buildLocalVerificationCommands", () => {
  it("uses psql without a shell and scopes the sentinel explicitly", () => {
    const commands = buildLocalVerificationCommands();

    expect(commands).toHaveLength(4);
    expect(commands.map((command) => command.executable)).toEqual([
      "psql",
      "psql",
      "psql",
      "psql",
    ]);
    expect(commands[1]?.args).toEqual([
      LOCAL_DATABASE_URL,
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "supabase/seed.sql",
    ]);
    expect(commands[0]?.args.join(" ")).toContain(
      "e0000000-0000-4000-8000-000000000001",
    );
    expect(commands[2]?.args.join(" ")).toContain("json_build_object");
    expect(commands[3]?.args.join(" ")).toContain(
      "delete from auth.users where id = 'e0000000-0000-4000-8000-000000000001'",
    );
    commands.forEach((command) => expect(command.shell).toBe(false));
  });
});
