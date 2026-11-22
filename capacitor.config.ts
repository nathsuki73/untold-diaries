import type { CapacitorConfig } from "@capacitor/cli";

// The app shell is local so Capacitor's JS bridge is injected normally. The
// hosted Next.js application is loaded inside the shell's iframe by
// scripts/generate-capacitor-web.mjs, preserving the existing server routes.
const config: CapacitorConfig = {
  appId: "com.untolddiaries.app",
  appName: "Untold Diaries",
  webDir: "capacitor/www",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
