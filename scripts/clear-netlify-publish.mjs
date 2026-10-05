import { spawnSync } from "node:child_process";

const data = JSON.stringify({
  site_id: "90df3866-2cb7-4fa4-a908-eb2ad8174cb9",
  build_settings: {
    cmd: "npm run build",
    dir: "",
  },
});

const result = spawnSync(
  "C:\\Program Files\\nodejs\\npx.cmd",
  ["--yes", "netlify-cli", "api", "updateSite", "--data", data],
  { encoding: "utf8", shell: false },
);
console.error("status", result.status, "error", result.error);

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
