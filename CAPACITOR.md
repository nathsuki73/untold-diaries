# Capacitor + Meta Story sharing

This project keeps the existing hosted Next.js server as the source of truth. Capacitor
packages a small **local web shell** whose iframe loads the deployed HTTPS site. The
native plugin runs in the shell, and the hosted app talks to it over `postMessage`.

Static export is intentionally **not** enabled: the app has API routes, libSQL/Turso,
Turnstile, Spotify credentials and OpenRouter secrets that must stay server-side.

## 1. Required configuration

Set these in `.env` / `.env.local` or in the environment that runs `npm run cap:sync`.
Shell/process variables take precedence over `.env` files:

| Variable | Purpose | Example |
| --- | --- | --- |
| `CAPACITOR_APP_URL` | Deployed HTTPS URL loaded by the shell | `https://untolddiaries.example` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for share links, QR codes and Open Graph | `https://untolddiaries.example` |
| `NEXT_PUBLIC_META_APP_ID` | **Public** Facebook App ID used by both Story flows | `123456789012345` |
| `NEXT_PUBLIC_CAPACITOR_SHELL_ORIGINS` | Optional `postMessage` allowlist | `capacitor://localhost,https://localhost` |

`NEXT_PUBLIC_META_APP_ID` is a public identifier, not a secret. **Never add an App Secret, access
token, Spotify secret or database token to the app bundle or client-side env.**

The generator writes these ignored native files from the variables above:

- `android/app/src/main/res/values/facebook_app_id.xml`
- `ios/App/App/FacebookConfig.plist`

`capacitor/www/` is generated and ignored. Re-run `npm run cap:sync` whenever any of
the variables change.

The hosted site must allow the local shell to embed it. If your host sets
`X-Frame-Options: SAMEORIGIN` or a restrictive `Content-Security-Policy`, add a header
that permits framing from `capacitor://localhost`, `https://localhost`, and
`http://localhost` (and your own HTTPS origin). Without that, the shell iframe stays
blank on device.

## 2. Meta app setup

1. Create an app in the [Meta App Dashboard](https://developers.facebook.com/apps/).
2. Copy the **App ID** only. Do not copy the App Secret.
3. Configure the Android app:
   - Package: `com.untolddiaries.app`
   - Activity: `com.untolddiaries.app.MainActivity`
   - Add your release key hash if your Meta app configuration requires one.
4. Configure the iOS bundle ID: `com.untolddiaries.app`.
5. Enable the sharing-to-Stories products you plan to use (Facebook and/or Instagram).
   Instagram Sharing to Stories has required a Facebook App ID since January 2023.
6. Review Meta's Platform Terms and Developer Policies before release.

The iOS `Info.plist` still contains the placeholder URL scheme `fbYOUR_APP_ID`. If you
need return-to-app deep links, replace it manually with `fb<NEXT_PUBLIC_META_APP_ID>`
before archiving. The Story handoff itself does not depend on that callback.

## 3. Build and sync

```bash
npm install
CAPACITOR_APP_URL=https://your-host \
NEXT_PUBLIC_SITE_URL=https://your-host \
NEXT_PUBLIC_META_APP_ID=your-public-app-id \
npm run cap:sync
```

Then open a native project:

```bash
npm run cap:android
npm run cap:ios
```

Capacitor 8 needs Node 22+, Android Studio 2025.2.1+ / API 24+, and Xcode 26+ /
iOS 15+. Android and iOS binaries must be produced on machines with those SDKs.

## 4. What the feature does

- Background: the existing 1080×1920 generated Story image.
- Sticker: a transparent 640×480 PNG with the note label and, when selected, the
  suggested song title/artist.
- Link: copied to the native clipboard before handoff. In the Story composer, add a
  **Link sticker** and paste it manually.
- Music: the modal can analyze the note's Spotify ID/link and suggest a search query.
  Open the app's **Music sticker** and search for it manually.

## 5. Limitations

- No automatic Link sticker. Meta's official Sharing to Stories APIs do not expose it.
- No automatic or licensed music selection. The app only prepares a recommendation.
- No `contentURL`, `attributionURL`, or undocumented URL-scheme keys are used.
- A successful handoff means only that Instagram/Facebook was launched. It does **not**
  confirm that a Story was published. Cancellation and publish callbacks are not
  available from these APIs.
- If the app is not installed, the app ID is missing, or the OS cannot open the intent,
  the modal explains the condition and keeps the browser share/download fallback.
- WebView behavior for Spotify embeds, Turnstile and third-party cookies must be
  validated on real devices. If an embed misbehaves, open the Spotify link externally.

## 6. Testing checklist

1. `npm run lint && npm run build` on the hosted app.
2. `npm run cap:sync` with all four variables set.
3. Android: run `./gradlew assembleDebug` in `android/`, install on a device with both
   apps, and test installed/not-installed/cancelled paths.
4. iOS: open `ios/App/App.xcworkspace` in Xcode, run on a device, and verify
   `canOpenURL`, pasteboard expiry and return-to-app behavior.
5. Confirm browser users still see the original four options and image fallback.
