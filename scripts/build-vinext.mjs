import { spawnSync } from "node:child_process";

const requiredPublicVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const missing = requiredPublicVariables.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Missing public authentication configuration for the Sites build: ${missing.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["./node_modules/vinext/dist/cli.js", "build"], {
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
