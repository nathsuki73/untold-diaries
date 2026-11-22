import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "capacitor", "www");
const bridgeEntry = path.join(projectRoot, "capacitor", "bridge", "bridge.ts");

// Shell/process variables always win; .env files are only a convenience for
// local builds. No values are logged.
async function loadEnvFiles() {
  const shellKeys = new Set(Object.keys(process.env));
  const values = new Map();

  for (const file of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    let content;
    try {
      content = await readFile(path.join(projectRoot, file), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(
        /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
      );
      if (!match) continue;

      let value = match[2].trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      values.set(match[1], value);
    }
  }

  for (const [key, value] of values) {
    if (!shellKeys.has(key)) process.env[key] = value;
  }
}

await loadEnvFiles();

function resolveAppUrl() {
  const raw =
    process.env.CAPACITOR_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (!raw) return "";

  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("CAPACITOR_APP_URL must be an http(s) URL");
  }
  if (url.protocol === "http:" && url.hostname !== "localhost") {
    throw new Error("Use HTTPS for Capacitor app URLs except localhost");
  }
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveMetaAppId() {
  const raw = (
    process.env.NEXT_PUBLIC_META_APP_ID ||
    process.env.META_APP_ID ||
    ""
  ).trim();
  if (!raw) return "YOUR_APP_ID";
  if (!/^\d+$/.test(raw)) {
    throw new Error("NEXT_PUBLIC_META_APP_ID must contain only digits");
  }
  return raw;
}

const appUrl = resolveAppUrl();
const metaAppId = resolveMetaAppId();

await mkdir(outputDir, { recursive: true });

await mkdir(
  path.join(projectRoot, "android", "app", "src", "main", "res", "values"),
  { recursive: true }
);
await writeFile(
  path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "res",
    "values",
    "facebook_app_id.xml"
  ),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="facebook_app_id">${escapeHtml(metaAppId)}</string>\n</resources>\n`,
  "utf8"
);

await mkdir(path.join(projectRoot, "ios", "App", "App"), { recursive: true });
await writeFile(
  path.join(projectRoot, "ios", "App", "App", "FacebookConfig.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>FacebookAppID</key>\n  <string>${escapeHtml(metaAppId)}</string>\n</dict>\n</plist>\n`,
  "utf8"
);

await build({
  entryPoints: [bridgeEntry],
  outfile: path.join(outputDir, "bridge.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

await writeFile(
  path.join(outputDir, "config.js"),
  `window.__UNTOLD_CAPACITOR_CONFIG__ = ${JSON.stringify({ appUrl })};\n`,
  "utf8"
);

await writeFile(
  path.join(outputDir, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0d14" />
    <title>Untold Diaries</title>
    <style>
      html, body { height: 100%; margin: 0; background: #0b0d14; color: #f5f4f8; font-family: system-ui, sans-serif; }
      #app-frame { display: block; width: 100%; height: 100%; border: 0; }
      #setup-notice { position: fixed; inset: auto 1rem 1rem; z-index: 2; padding: 1rem; border: 1px solid #414a60; border-radius: 0.75rem; background: #12151f; font-size: 0.875rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <iframe
      id="app-frame"
      title="Untold Diaries"
      src="${escapeHtml(appUrl)}"
      allow="autoplay; clipboard-write; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
    <p id="setup-notice" hidden>
      Set <code>CAPACITOR_APP_URL</code> before running <code>npm run cap:sync</code>.
    </p>
    <script src="config.js"></script>
    <script src="bridge.js"></script>
  </body>
</html>
`,
  "utf8"
);

console.log(
  appUrl
    ? `Generated Capacitor shell for ${appUrl}`
    : "Generated Capacitor shell without an app URL; set CAPACITOR_APP_URL before sync."
);
console.log(
  metaAppId === "YOUR_APP_ID"
    ? "Generated native config with no Meta App ID; set NEXT_PUBLIC_META_APP_ID before native Story sharing works."
    : "Generated native config with the configured Meta App ID."
);
