# Product

## What it is

Untold Diaries is an anonymous note-sharing site. A visitor writes a message to
someone, optionally pairs it with a Spotify track, and shares it through a link.
Anyone can browse public notes, search them by recipient, or open a single note
to read the message and play its song.

## Audience and scene

People who want to say something they could not say directly: a thank-you, an
apology, a confession, a goodbye. They are usually alone, often late at night,
on a phone or a laptop. The note should feel private, calm, and finished, not
like a social feed.

## Jobs

1. Write and share an anonymous note with an optional song.
2. Browse recent notes and search by the person a note was written for.
3. Open a shared note and play its song.

## Product truth

- No accounts and no names required. The recipient and sender names are
  optional free text; the sender field is optional.
- Notes are public once submitted and can be opened by link.
- Submissions are protected by a Cloudflare Turnstile check.
- Songs are resolved through Spotify search or a pasted Spotify link.
- Stories live in Turso/libSQL. Schema, API behaviour, authentication, and
  environment configuration are out of scope for interface work.

## Platform

web
