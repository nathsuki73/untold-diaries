"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ArrowLeft,
  CircleAlert,
  Copy,
  Download,
  Facebook,
  Instagram,
  Link2,
  LoaderCircle,
  MessageCircle,
  QrCode,
  Share2,
  X,
} from "lucide-react";
import {
  getShareDestination,
  type ShareDestination,
} from "@/lib/shareDestination";
import { getHostname } from "@/lib/siteUrl";
import {
  generateStoryTemplate,
  STORY_TEMPLATE_HEIGHT,
  STORY_TEMPLATE_WIDTH,
  type StoryTemplateResult,
} from "@/lib/storyTemplate";
import {
  getWebShareSupport,
  shareImage as shareImageWithSheet,
  type WebShareSupport,
} from "@/lib/webShare";

type StoryPlatform = "instagram" | "facebook" | "messenger";
type ShareView = "options" | "preview" | "qr";
type AsyncState = "idle" | "loading" | "error";
type FeedbackTone = "info" | "success" | "error";

type StoryShareModalProps = {
  open: boolean;
  onClose: () => void;
  storyId: number;
  recipient: string;
  message: string;
  sender?: string | null;
  track?: string | null;
};

const PLATFORM_OPTIONS = [
  {
    id: "instagram",
    label: "Instagram Story",
    icon: Instagram,
  },
  {
    id: "facebook",
    label: "Facebook Story",
    icon: Facebook,
  },
  {
    id: "messenger",
    label: "Messenger",
    icon: MessageCircle,
  },
] as const;

export default function StoryShareModal({
  open,
  onClose,
  storyId,
  recipient,
  message,
  sender,
  track,
}: StoryShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ShareView>("options");
  const [platform, setPlatform] = useState<StoryPlatform | null>(null);
  const [template, setTemplate] = useState<StoryTemplateResult | null>(null);
  const [generation, setGeneration] = useState<AsyncState>("idle");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [destination, setDestination] = useState<ShareDestination | null>(null);
  const [shareSupport, setShareSupport] = useState<WebShareSupport>({
    api: false,
    files: false,
  });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrState, setQrState] = useState<AsyncState>("idle");
  const [qrError, setQrError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [sharingImage, setSharingImage] = useState(false);

  const templatePromiseRef = useRef<Promise<StoryTemplateResult> | null>(null);
  const prepareStartedRef = useRef(false);
  const requestRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const activePlatform = PLATFORM_OPTIONS.find((option) => option.id === platform);
  const PlatformIcon = activePlatform?.icon;
  const destinationUrl = destination?.url ?? "";
  const title =
    view === "qr"
      ? "QR Code"
      : view === "preview"
        ? activePlatform?.label ?? "Story"
        : "Share";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    requestRef.current += 1;
    prepareStartedRef.current = false;
    templatePromiseRef.current = null;
    setView("options");
    setPlatform(null);
    setTemplate(null);
    setGeneration("idle");
    setDownloadUrl("");
    setDestination(null);
    setQrDataUrl("");
    setQrState("idle");
    setQrError("");
    setFeedback("");
    setFeedbackTone("info");
    setSharingImage(false);
  }, [storyId, recipient, message, sender, track]);

  useEffect(() => {
    if (open) return;
    setView("options");
    setPlatform(null);
    setFeedback("");
    setFeedbackTone("info");
    setSharingImage(false);
  }, [open]);

  useEffect(() => {
    setShareSupport(getWebShareSupport());
  }, [open]);

  useEffect(() => {
    if (!template) return;

    try {
      const file = new File([template.blob], template.filename, {
        type: "image/png",
      });
      setShareSupport(getWebShareSupport(file));
    } catch {
      setShareSupport(getWebShareSupport());
    }
  }, [template]);

  useEffect(() => {
    if (!template) {
      setDownloadUrl("");
      return;
    }

    const url = URL.createObjectURL(template.blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [template]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [onClose, open]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showFeedback = useCallback(
    (value: string, tone: FeedbackTone = "info") => {
      setFeedback(value);
      setFeedbackTone(tone);
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback("");
        setFeedbackTone("info");
      }, 4200);
    },
    []
  );

  const copyDestination = useCallback(
    async (url: string, announce = true): Promise<boolean> => {
      if (!url) return false;

      let didCopy = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          didCopy = true;
        }
      } catch {
        // Try the legacy selection fallback below.
      }

      if (!didCopy) {
        try {
          const input = document.createElement("input");
          input.value = url;
          input.setAttribute("readonly", "");
          input.style.position = "fixed";
          input.style.opacity = "0";
          document.body.appendChild(input);
          input.select();
          didCopy = document.execCommand("copy");
          input.remove();
        } catch {
          didCopy = false;
        }
      }

      if (announce) {
        showFeedback(
          didCopy ? "Link copied" : "Copy the link below",
          didCopy ? "success" : "error"
        );
      }
      return didCopy;
    },
    [showFeedback]
  );

  const getTemplate = useCallback(() => {
    if (templatePromiseRef.current) return templatePromiseRef.current;

    const request = requestRef.current;
    const promise = (async () => {
      const resolvedDestination = await getShareDestination(storyId);
      if (request === requestRef.current) {
        setDestination(resolvedDestination);
      }

      return generateStoryTemplate({
        storyId,
        recipient,
        message,
        sender,
        track,
        destinationUrl: resolvedDestination.url,
      });
    })();

    templatePromiseRef.current = promise;
    const clearPromise = () => {
      if (templatePromiseRef.current === promise) {
        templatePromiseRef.current = null;
      }
    };
    promise.then(clearPromise, clearPromise);
    return promise;
  }, [message, recipient, sender, storyId, track]);

  const runGeneration = useCallback(() => {
    prepareStartedRef.current = true;
    setGeneration("loading");

    const request = requestRef.current;
    void getTemplate()
      .then((result) => {
        if (request !== requestRef.current) return;
        setTemplate(result);
        setGeneration("idle");
      })
      .catch(() => {
        if (request !== requestRef.current) return;
        setGeneration("error");
      });
  }, [getTemplate]);

  useEffect(() => {
    if (!open || template || prepareStartedRef.current) return;
    runGeneration();
  }, [open, runGeneration, template]);

  const retryGeneration = useCallback(() => {
    requestRef.current += 1;
    templatePromiseRef.current = null;
    runGeneration();
  }, [runGeneration]);

  const selectPlatform = useCallback(
    async (id: StoryPlatform) => {
      setPlatform(id);
      setView("preview");
      setFeedback("");
      setFeedbackTone("info");

      let url = destinationUrl;
      if (!url) {
        const resolved = await getShareDestination(storyId);
        url = resolved.url;
        setDestination(resolved);
      }
      if (url) await copyDestination(url, false);
    },
    [copyDestination, destinationUrl, storyId]
  );

  const shareSelectedImage = useCallback(async () => {
    if (!template) return;

    setSharingImage(true);
    let url = destinationUrl;
    if (!url) {
      const resolved = await getShareDestination(storyId);
      url = resolved.url;
      setDestination(resolved);
    }
    if (url) await copyDestination(url, false);

    const outcome = await shareImageWithSheet({
      blob: template.blob,
      filename: template.filename,
      title: "An Untold Diaries note",
      text: `A note for ${recipient.trim() || "someone"}`,
      ...(url ? { url } : {}),
    });
    setSharingImage(false);

    if (outcome === "shared") {
      showFeedback("Sent to share sheet");
      return;
    }
    if (outcome === "cancelled") {
      showFeedback("Share cancelled");
      return;
    }
    if (outcome === "unsupported") {
      showFeedback("Sharing unavailable", "error");
      return;
    }
    showFeedback("Share sheet unavailable", "error");
  }, [
    copyDestination,
    destinationUrl,
    recipient,
    showFeedback,
    storyId,
    template,
  ]);

  const buildQrCode = useCallback(async () => {
    if (qrDataUrl) return;
    setQrState("loading");
    setQrError("");

    let url = destinationUrl;
    if (!url) {
      const resolved = await getShareDestination(storyId);
      url = resolved.url;
      setDestination(resolved);
    }
    if (!url) {
      setQrState("error");
      setQrError("Link isn’t ready yet.");
      return;
    }

    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(
      getHostname(url)
    );
    if (isLocalHost && process.env.NODE_ENV === "production") {
      setQrState("error");
      setQrError("QR codes need the live site.");
      return;
    }

    try {
      const QRCode = (await import("qrcode")).default;
      const data = await QRCode.toDataURL(url, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#11131B", light: "#FFFFFF" },
      });
      setQrDataUrl(data);
      setQrState("idle");
    } catch {
      setQrState("error");
      setQrError("Couldn’t create QR code.");
    }
  }, [destinationUrl, qrDataUrl, storyId]);

  const selectQr = useCallback(() => {
    requestRef.current += 1;
    setPlatform(null);
    setView("qr");
    setFeedback("");
    setFeedbackTone("info");
    void buildQrCode();
  }, [buildQrCode]);

  const backToOptions = useCallback(() => {
    requestRef.current += 1;
    setView("options");
    setPlatform(null);
    setFeedback("");
    setFeedbackTone("info");
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="share-overlay fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.button === 0 &&
          !dialogRef.current?.contains(event.target as Node)
        ) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#12151F] text-[#F5F4F8] shadow-2xl [overscroll-behavior:contain]"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close sharing"
            className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 pb-7">
            <div className="flex items-center gap-2 pr-10">
              {view !== "options" && (
                <button
                  type="button"
                  onClick={backToOptions}
                  aria-label="Back to sharing options"
                  className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
              )}
              {view === "preview" && PlatformIcon && (
                <PlatformIcon
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-accent"
                />
              )}
              <h2
                id={titleId}
                className="font-serif text-2xl tracking-[-0.02em] text-white"
              >
                {title}
              </h2>
            </div>

            {view === "options" && (
              <div className="mt-6 space-y-2">
                {PLATFORM_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void selectPlatform(id)}
                    className="group flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors group-hover:bg-white/[0.12]">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-[15px] font-semibold text-white">
                      {label}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={selectQr}
                  className="group flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors group-hover:bg-white/[0.12]">
                    <QrCode size={20} aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-semibold text-white">
                    QR Code
                  </span>
                </button>
              </div>
            )}

            {view === "preview" && (
              <>
                {generation === "loading" && (
                  <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <LoaderCircle
                      size={26}
                      aria-hidden="true"
                      className="animate-spin text-white/80"
                    />
                    <p className="text-sm text-white/70">Preparing image…</p>
                  </div>
                )}

                {generation === "error" && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <CircleAlert
                      size={24}
                      aria-hidden="true"
                      className="mx-auto text-white/70"
                    />
                    <p className="mt-3 text-sm text-white/80">
                      Couldn’t create the image.
                    </p>
                    <button
                      type="button"
                      onClick={retryGeneration}
                      className="mt-4 min-h-10 rounded-lg bg-white px-4 text-xs font-semibold text-[#12151F] transition-colors hover:bg-white/90"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {template && generation === "idle" && (
                  <div className="mt-5">
                    <div className="mx-auto w-full max-w-[232px]">
                      <Image
                        src={template.dataUrl}
                        alt={`${activePlatform?.label ?? "Story"} image for ${recipient?.trim() || "this note"}`}
                        width={STORY_TEMPLATE_WIDTH}
                        height={STORY_TEMPLATE_HEIGHT}
                        unoptimized
                        className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-black object-cover shadow-2xl"
                      />
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        <Link2 size={12} aria-hidden="true" />
                        Destination link
                      </p>
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
                        <code className="min-w-0 flex-1 break-all text-xs leading-5 text-white/75">
                          {destinationUrl || "Preparing your link…"}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyDestination(destinationUrl)}
                          disabled={!destinationUrl}
                          title="Paste into the app’s Link sticker"
                          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[#12151F] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Copy size={13} aria-hidden="true" />
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {shareSupport.files && (
                        <button
                          type="button"
                          onClick={() => void shareSelectedImage()}
                          disabled={sharingImage}
                          aria-label="Share image"
                          title="Share image"
                          className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sharingImage ? (
                            <LoaderCircle
                              size={17}
                              aria-hidden="true"
                              className="animate-spin"
                            />
                          ) : (
                            <Share2 size={17} aria-hidden="true" />
                          )}
                        </button>
                      )}
                      <a
                        href={downloadUrl || undefined}
                        download={template.filename}
                        aria-disabled={!downloadUrl}
                        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                      >
                        <Download size={16} aria-hidden="true" />
                        Download Image
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === "qr" && (
              <div className="mt-5">
                {(qrState === "loading" ||
                  (qrState === "idle" && !qrDataUrl)) && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <LoaderCircle
                      size={26}
                      aria-hidden="true"
                      className="animate-spin text-white/80"
                    />
                    <p className="text-sm text-white/70">Creating QR code…</p>
                  </div>
                )}

                {qrState === "error" && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <CircleAlert
                      size={24}
                      aria-hidden="true"
                      className="mx-auto text-white/70"
                    />
                    <p className="mt-3 text-sm text-white/80">{qrError}</p>
                  </div>
                )}

                {qrDataUrl && (
                  <>
                    <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-xl">
                      <Image
                        src={qrDataUrl}
                        alt="QR code linking to this story"
                        width={220}
                        height={220}
                        unoptimized
                        className="size-[220px]"
                      />
                    </div>

                    <a
                      href={qrDataUrl}
                      download="untold-diaries-qr.png"
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                    >
                      <Download size={16} aria-hidden="true" />
                      Download QR Code
                    </a>

                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        <Link2 size={12} aria-hidden="true" />
                        Destination link
                      </p>
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
                        <code className="min-w-0 flex-1 break-all text-xs leading-5 text-white/75">
                          {destinationUrl || "Preparing your link…"}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyDestination(destinationUrl)}
                          disabled={!destinationUrl}
                          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[#12151F] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Copy size={13} aria-hidden="true" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {feedback && (
              <p
                aria-live="polite"
                className={`mt-4 text-center text-xs font-medium ${
                  feedbackTone === "success"
                    ? "text-emerald-200"
                    : feedbackTone === "error"
                      ? "text-amber-200"
                      : "text-white/75"
                }`}
              >
                {feedback}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
