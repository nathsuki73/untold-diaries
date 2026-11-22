# Website Story sharing

The website generates Story content client-side. No companion app, native
shell, native project, or Meta Developer configuration is required.

## Flow

1. **Share** opens the modal and starts generating a 1080 × 1920 PNG in the
   background.
2. The browser asks `/api/shares` for an opaque `/s/[token]` destination that
   resolves only to the current public note. If that request fails, the canonical
   `/view?id=…` URL is used instead.
3. The destination URL is copied to the clipboard where permitted. The modal
   always shows the exact URL and provides a Copy button.
4. Selecting Instagram, Facebook, or Messenger opens a compact view with the
   platform name, the generated image preview, the destination link with a Copy
   button, and a Download Image button. Selecting QR Code shows the QR preview,
   a Download QR Code button, and the same Copy control.
5. On supported devices, the icon-only share action uses the Web Share API with
   a PNG file. The browser/OS chooses the destination; the site cannot preselect
   it. Every device can download the PNG instead.

No instruction lists, numbered steps, or long disclaimers are shown in the
modal. The only technical note is a title tooltip on the Copy button: paste the
link into the app's own Link sticker.

## Generated image

The 1080 × 1920 PNG keeps the note and song card, then ends with a minimal
footer containing only the cropped logo, the words “Untold Diaries”, and the
**exact full destination URL**. There is no “Discover More”, “Link in Story”, or
shortened/branded URL on the image. The URL is still not a clickable sticker; the
app's own Link sticker must be filled in manually.

The logo asset is `public/untold-diaries-logo.webp` (cropped from the supplied
image and exported as optimized WebP). The same asset is used in the site header
and footer, with a light backing so the dark-purple mark stays legible in both
themes.

## Platform capabilities

| Platform | Browser can open Story composer? | Can prefill image/sticker? | Can insert a real link sticker? | What this site does |
| --- | --- | --- | --- | --- |
| Instagram Story | No supported web handoff | No | No | Shows the PNG preview, offers it to the OS share sheet, and copies the link. |
| Facebook Story | No supported web handoff | No | No | Same as Instagram. Facebook web dialogs create feed posts or messages, not Stories. |
| Messenger | No supported Story handoff | No | No | Shows the image preview, offers it to the share sheet for a chat, and copies the link. |

Meta documents background/sticker handoff only for native Android/iOS apps using
implicit intents, custom URL schemes, and pasteboard payloads. Undocumented web
schemes are intentionally not used. A URL printed on an image or encoded in a QR
code is **not** a native clickable link sticker.

Official references:

- <https://developers.facebook.com/docs/instagram/sharing-to-stories/>
- <https://developers.facebook.com/docs/sharing/sharing-to-stories/>
- <https://developers.facebook.com/documentation/sharing/messenger.md>
- <https://www.w3.org/TR/web-share/>
- <https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API>

## Browser support and fallbacks

- Android Chrome and iOS Safari support sharing image files through the Web
  Share API. Desktop Chrome/Edge support it on supported platforms. Firefox
  generally does not support file sharing.
- The site uses `navigator.canShare({ files })` rather than user-agent sniffing.
- If file sharing is unavailable, the modal shows only the download and copy
  options. It never claims a specific app opened.
- A successful `navigator.share()` promise means the OS accepted the payload.
  It does not confirm that a Story was created or published.
- Clipboard writes are best-effort because browsers require permission or a user
  gesture. The URL is always visible for manual copying.

## Tracked destination links

- `POST /api/shares` validates the story ID against the existing submissions
  table, creates a random 22-character token, and returns
  `https://<site>/s/<token>`.
- `GET /s/[token]` validates the token, resolves it strictly to a local story
  ID, records a best-effort click, and redirects to `/view?id=<id>`.
- Tokens never contain a URL, so the route cannot be used as an open redirect.
- Invalid, unknown, and deleted-content links return friendly error pages.
- The `story_shares` table is created on demand; applying
  `migrations/002_story_shares.sql` is recommended for production so the index
  is present immediately.

## Configuration

- `NEXT_PUBLIC_SITE_URL`: canonical public origin used in generated links.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: existing hosted database.
- No Meta App ID, App Secret, access token, or client-side secret is needed for
  this website-first flow.

## Manual testing

1. Open a story and choose Share; confirm a 1080 × 1920 preview and tracked URL.
2. On Android Chrome and iOS Safari, use the icon-only share action and confirm
   the OS share sheet appears with the PNG; cancel once and retry.
3. On desktop Chrome/Edge, confirm the preview, Download Image, and Copy controls.
4. Paste the copied `/s/<token>` URL in a new tab and confirm it redirects to
   the correct note and increments the stored click count.
5. Try an invalid token and confirm the friendly error page.
