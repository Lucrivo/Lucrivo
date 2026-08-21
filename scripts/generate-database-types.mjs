import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

const targetPath = path.resolve(
  "src/infrastructure/database/supabase/database.types.ts",
);
const temporaryPath = targetPath + ".tmp";
const executable = process.platform === "win32" ? "supabase.cmd" : "supabase";

function generateTypes() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["gen", "types", "typescript", "--local", "--schema", "public"],
      {
        shell: false,
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    let output = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error("Supabase type generation failed with exit code " + code),
        );
        return;
      }

      resolve(output.endsWith("\n") ? output : output + "\n");
    });
  });
}

async function currentTypes() {
  try {
    return await readFile(targetPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return null;
    throw error;
  }
}

const rawTypes = await generateTypes();
if (!rawTypes.includes("export type Json")) {
  throw new Error("Supabase returned an unexpected type definition");
}
const generatedTypes = await format(rawTypes, { parser: "typescript" });

if ((await currentTypes()) === generatedTypes) {
  console.log("Database types are already up to date.");
} else {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(temporaryPath, generatedTypes, "utf8");
  await rename(temporaryPath, targetPath);
  console.log("Database types generated successfully.");
}
