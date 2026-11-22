"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Facebook,
  Link2,
  MessageCircle,
  Share2,
  Twitter,
  X,
} from "lucide-react";

type StoryShareButtonProps = {
  storyId: number;
  recipient: string;
  message: string;
  track?: string | null;
};

type ShareNavigator = Navigator & {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
};

export default function StoryShareButton({
  storyId,
  recipient,
  message,
  track,
}: StoryShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<number | null>(null);

  const previewName = recipient || "Someone";
  const previewMessage = message.trim() || "A quiet message waiting to be read.";

  const shareText = useMemo(() => {
    const excerpt = message.trim().replace(/\s+/g, " ").slice(0, 110);
    const base = `A note for ${previewName} on Untold Diaries`;
    return excerpt ? `${base}: ${excerpt}` : base;
  }, [message, previewName]);

  const socialLinks = useMemo(() => {
    if (!shareUrl) return [];
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    return [
      {
        label: "X",
        icon: Twitter,
        href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      },
      {
        label: "Facebook",
        icon: Facebook,
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        label: "WhatsApp",
        icon: MessageCircle,
        href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      },
    ];
  }, [shareText, shareUrl]);

  useEffect(() => {
    setMounted(true);
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof (navigator as ShareNavigator).share === "function"
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}/view?id=${storyId}`);
  }, [storyId]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (
        previouslyFocused?.isConnected &&
        typeof previouslyFocused.focus === "function"
      ) {
        previouslyFocused.focus();
      }
    };
  }, [close, open]);

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();
      document.execCommand("copy");
      window.getSelection()?.removeAllRanges();
    }
    markCopied();
  }, [markCopied, shareUrl]);

  const nativeShare = useCallback(async () => {
    const share = (navigator as ShareNavigator).share;
    if (!share || !shareUrl) return;

    try {
      await share.call(navigator, {
        title: `A note for ${previewName}`,
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // A cancelled share sheet needs no feedback; the other options stay available.
    }
  }, [previewName, shareText, shareUrl]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl [overscroll-behavior:contain]"
            >
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close share dialog"
                className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>

              <h2
                id={titleId}
                className="pr-10 font-serif text-2xl tracking-[-0.02em] text-ink"
              >
                Share this story
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
                Send the link, or share it straight to someone you know.
              </p>

              <div className="mt-5 rounded-xl border border-line bg-surface-raised p-4">
                <p className="text-xs text-muted">A note for</p>
                <p className="mt-1 truncate font-serif text-lg text-ink">
                  {previewName}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {previewMessage}
                </p>
                {track && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
                    <Link2 size={13} aria-hidden="true" />
                    Includes a Spotify track
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label htmlFor={`${titleId}-link`} className="sr-only">
                  Story link
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-bg p-1 pl-3">
                  <input
                    ref={linkRef}
                    id={`${titleId}-link`}
                    name="storyLink"
                    type="url"
                    readOnly
                    autoComplete="off"
                    spellCheck={false}
                    value={shareUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-medium text-surface transition-opacity hover:opacity-90"
                  >
                    {copied ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Copy size={15} aria-hidden="true" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p aria-live="polite" className="sr-only">
                  {copied ? "Story link copied to clipboard" : ""}
                </p>
              </div>

              {canNativeShare && (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Share2 size={16} aria-hidden="true" />
                  Share…
                </button>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                {socialLinks.map(({ label, icon: Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Share on ${label}`}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-sm text-ink transition-colors hover:bg-surface-raised"
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
