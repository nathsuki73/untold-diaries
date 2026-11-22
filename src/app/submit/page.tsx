"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import Turnstile from "react-turnstile";
import SearchBar from "@/components/SearchBar";
import TagPicker from "@/components/TagPicker";
import CatYapper from "@/components/CatYapper";
import { useTheme } from "@/lib/theme";
import { normalizeTag } from "@/lib/tagUtils";

type Artist = {
  name: string;
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
  image: string;
};

type OptionType = {
  value: string;
  label: string;
  track: Track;
};

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-line bg-surface-raised px-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function Submit() {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<OptionType | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (name.trim() || message.trim() || from.trim() || tag) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [name, message, from, tag]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setSubmitError("Add who this note is for.");
      document.getElementById("to")?.focus();
      return;
    }
    if (!message.trim()) {
      setSubmitError("Write a message before sharing.");
      document.getElementById("message")?.focus();
      return;
    }
    const cleanTag = normalizeTag(tag);
    if (!cleanTag) {
      setSubmitError("Choose one group or tag for this story.");
      document.getElementById("group-tag")?.focus();
      return;
    }
    if (!captcha) {
      setSubmitError("Complete the verification check to continue.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          from,
          tag: cleanTag,
          captcha,
          track: selectedTrack ? selectedTrack.track.id : null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.id) {
        setSubmitError(
          data.error || "Couldn’t share your story. Please try again."
        );
        setSubmitting(false);
        return;
      }

      window.location.href = `/view?id=${data.id}`;
    } catch {
      setSubmitError("Couldn’t reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14"
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back home
      </Link>

      <h1 className="mt-6 font-serif text-3xl tracking-[-0.02em] text-ink sm:text-4xl">
        Share a story
      </h1>
      <p className="mt-3 max-w-prose text-base leading-7 text-muted">
        Leave an anonymous note and pair it with a song. Only what you write
        here is shared.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-8"
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="to" className="block text-sm font-medium text-ink">
              Recipient
            </label>
            <p id="to-hint" className="mt-1 text-xs leading-5 text-muted">
              Who is this note for?
            </p>
            <input
              id="to"
              name="to"
              type="text"
              autoComplete="off"
              maxLength={100}
              required
              placeholder="Their name or nickname…"
              aria-describedby="to-hint"
              spellCheck={false}
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-ink"
            >
              Message
            </label>
            <p id="message-hint" className="mt-1 text-xs leading-5 text-muted">
              Say what you never got to say.
            </p>
            <textarea
              id="message"
              name="message"
              rows={7}
              maxLength={5000}
              required
              placeholder="Write your message…"
              aria-describedby="message-hint"
              className="mt-2 w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-3 text-sm leading-6 text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <CatYapper text={message} />
          </div>

          <div>
            <label
              htmlFor="from"
              className="block text-sm font-medium text-ink"
            >
              From{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="from"
              name="from"
              type="text"
              autoComplete="off"
              maxLength={100}
              placeholder="A name, or leave it blank…"
              spellCheck={false}
              className={fieldClass}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="group-tag"
              className="block text-sm font-medium text-ink"
            >
              Group / Tag
            </label>
            <p id="group-tag-hint" className="mt-1 text-xs leading-5 text-muted">
              Add one tag to identify the school, organization, or group this
              story belongs to. One tag, up to 60 characters.
            </p>
            <TagPicker value={tag} onChange={setTag} />
          </div>

          <div>
            <label
              htmlFor="song"
              className="block text-sm font-medium text-ink"
            >
              Song <span className="font-normal text-muted">(optional)</span>
            </label>
            <p id="song-hint" className="mt-1 text-xs leading-5 text-muted">
              Search for a track, paste a Spotify link, or choose from the top
              songs in the Philippines.
            </p>
            <SearchBar setSelected={setSelectedTrack} />
          </div>

          <div>
            <span className="block text-sm font-medium text-ink">
              Verification
            </span>
            <div className="mt-2">
              <Turnstile
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                theme={theme}
                size="flexible"
                onVerify={(token) => setCaptcha(token)}
              />
            </div>
          </div>
        </div>

        {submitError && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Sharing…" : "Share story"}
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
