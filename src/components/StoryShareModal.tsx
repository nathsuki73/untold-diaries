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
    hint: "9:16 image + a manual Link sticker",
    icon: Instagram,
  },
  {
    id: "facebook",
    label: "Facebook Story",
    hint: "9:16 image + a manual Link sticker",
    icon: Facebook,
  },
  {
    id: "messenger",
    label: "Messenger",
    hint: "Send the image in a chat; no Story handoff",
    icon: MessageCircle,
  },
] as const;

const MANUAL_STEPS: Record<StoryPlatform, string[]> = {
  instagram: [
    "Share the image. If Instagram appears in your device’s share sheet, choose it and select Stories.",
    "In the editor, open Stickers → Link, paste the copied URL, and position it.",
    "Publish your Story manually. We can’t confirm it was posted.",
  ],
  facebook: [
    "Share the image. If Facebook appears in your device’s share sheet, choose it and select Story.",
    "In the Story editor, use the available link sticker/link option and paste the copied URL if supported.",
    "Publish your Story manually. We can’t confirm it was posted.",
  ],
  messenger: [
    "Messenger has no supported browser-to-Story handoff.",
    "If Messenger appears in the share sheet, use it to send the image in a chat.",
    "To make a Messenger Story, download the image, open Messenger, and add it there with a link if available.",
  ],
};

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
  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);

  const templatePromiseRef = useRef<Promise<StoryTemplateResult> | null>(null);
  const prepareStartedRef = useRef(false);
  const requestRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const activePlatform = PLATFORM_OPTIONS.find((option) => option.id === platform);
  const destinationUrl = destination?.url ?? "";
  const destinationHost = destinationUrl ? getHostname(destinationUrl) : "";
  const title =
    view === "qr"
      ? "QR Code"
      : view === "preview"
        ? activePlatform?.label ?? "Story preview"
        : "Share to…";
  const description =
    view === "qr"
      ? "Scan to read this story."
      : view === "preview"
        ? "Your Story image and destination link are ready."
        : "Choose where you’d like to share this note.";

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
    setCopied(false);
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

      setCopied(didCopy);
      if (announce) {
        showFeedback(
          didCopy
            ? "Link copied. Add it with a native Link sticker in the app."
            : "Select and copy the link shown below.",
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
      showFeedback(
        imageShareCopy(platform, true),
        "success"
      );
      return;
    }
    if (outcome === "cancelled") {
      showFeedback("Sharing cancelled. The link is still copied.", "info");
      return;
    }
    if (outcome === "unsupported") {
      showFeedback(
        "This browser can’t share images. Download the image and copy the link below.",
        "error"
      );
      return;
    }
    showFeedback(
      "Sharing didn’t complete. Download the image and upload it manually.",
      "error"
    );
  }, [
    copyDestination,
    destinationUrl,
    platform,
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
      setQrError("The story link isn’t ready yet. Close and reopen sharing.");
      return;
    }

    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(
      getHostname(url)
    );
    if (isLocalHost && process.env.NODE_ENV === "production") {
      setQrState("error");
      setQrError(
        "QR codes are only available from the live site. Open the deployed story URL to create one."
      );
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
      setQrError("We couldn’t create the QR code. Copy the link instead.");
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
          aria-describedby={descriptionId}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#12151F] text-[#F5F4F8] shadow-2xl [overscroll-behavior:contain]"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close sharing options"
            className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 pb-7">
            <h2
              id={titleId}
              className="pr-10 font-serif text-2xl tracking-[-0.02em] text-white"
            >
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-white/55">
              {description}
            </p>

            {view === "options" && (
              <>
                <div className="mt-6 space-y-2">
                  {PLATFORM_OPTIONS.map(({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => void selectPlatform(id)}
                      className="group flex min-h-[76px] w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors group-hover:bg-white/[0.12]">
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-white">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/55">
                          {hint}
                        </span>
                      </span>
                      {shareSupport.api && (
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
                          Share sheet
                        </span>
                      )}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={selectQr}
                    className="group flex min-h-[76px] w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors group-hover:bg-white/[0.12]">
                      <QrCode size={22} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-white">
                        QR Code
                      </span>
                      <span className="mt-0.5 block text-xs text-white/55">
                        Scan to read this story
                      </span>
                    </span>
                  </button>
                </div>

                <p className="mt-5 text-xs leading-5 text-white/45">
                  {generation === "loading"
                    ? "Your 9:16 Story image is being prepared in the background."
                    : shareSupport.api
                      ? "Websites can offer an image to your device’s share sheet, but can’t choose or detect the destination app."
                      : "Your device can’t offer this image to another app. You can always download it and copy the link."}
                </p>
              </>
            )}

            {view === "preview" && (
              <>
                <button
                  type="button"
                  onClick={backToOptions}
                  className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-medium text-white/60 transition-colors hover:text-white"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  All Options
                </button>

                {generation === "loading" && (
                  <div className="mt-4 flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <LoaderCircle
                      size={28}
                      aria-hidden="true"
                      className="animate-spin text-white/80"
                    />
                    <p className="text-sm font-medium text-white/80">
                      Designing your Story…
                    </p>
                    <p className="text-xs text-white/45">
                      Matching the colours of the song artwork.
                    </p>
                  </div>
                )}

                {generation === "error" && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <CircleAlert
                      size={28}
                      aria-hidden="true"
                      className="mx-auto text-white/70"
                    />
                    <p className="mt-3 text-sm font-medium text-white/85">
                      We couldn’t design your Story image.
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Your note is safe — try again.
                    </p>
                    <div className="mt-5 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={backToOptions}
                        className="min-h-10 rounded-lg border border-white/15 px-4 text-xs font-medium text-white/75 transition-colors hover:bg-white/10"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={retryGeneration}
                        className="min-h-10 rounded-lg bg-white px-4 text-xs font-semibold text-[#12151F] transition-colors hover:bg-white/90"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {template && generation === "idle" && (
                  <div className="mt-4">
                    <div className="mx-auto w-full max-w-[248px]">
                      <Image
                        src={template.dataUrl}
                        alt={`Generated ${activePlatform?.label ?? "Story"} image for ${recipient?.trim() || "this note"}`}
                        width={STORY_TEMPLATE_WIDTH}
                        height={STORY_TEMPLATE_HEIGHT}
                        unoptimized
                        className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-black object-cover shadow-2xl"
                      />
                    </div>
                    <p className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-white/40">
                      {STORY_TEMPLATE_WIDTH}
                      {"\u00a0×\u00a0"}
                      {STORY_TEMPLATE_HEIGHT} · {destinationHost || "link"}
                    </p>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
                          {copied ? "Copied" : "Copy Link"}
                        </button>
                      </div>
                      {destination?.tracked && (
                        <p className="mt-2 text-[11px] text-white/35">
                          Tracked link · visits are counted for this note.
                        </p>
                      )}
                      <p className="mt-2 text-[11px] leading-4 text-white/45">
                        Websites can’t insert a native Link sticker automatically.
                        Paste this URL into the app’s Link sticker; a printed URL
                        or QR code is not clickable.
                      </p>
                    </div>

                    {platform && (
                      <section
                        aria-label={`${activePlatform?.label ?? "Platform"} instructions`}
                        className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <p className="text-sm font-semibold text-white">
                          {platform === "messenger"
                            ? "How Messenger sharing works"
                            : "Add the real Link sticker"}
                        </p>
                        <ol className="mt-3 space-y-2">
                          {MANUAL_STEPS[platform].map((step, index) => (
                            <li
                              key={step}
                              className="flex gap-2.5 text-xs leading-5 text-white/60"
                            >
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/75">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    <div className="mt-5 space-y-2">
                      {shareSupport.files ? (
                        <button
                          type="button"
                          onClick={() => void shareSelectedImage()}
                          disabled={sharingImage}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#12151F] transition-colors hover:bg-white/90 active:scale-[0.99] motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-60"
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
                          {sharingImage
                            ? "Opening share sheet…"
                            : "Share Image"}
                        </button>
                      ) : (
                        <p className="rounded-lg border border-amber-200/15 bg-amber-200/[0.06] p-3 text-xs leading-5 text-amber-100/75">
                          This browser can’t hand the image to another app. Use
                          the download below, then upload it manually.
                        </p>
                      )}

                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          download={template.filename}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                        >
                          <Download size={16} aria-hidden="true" />
                          Download Story Image
                        </a>
                      )}
                    </div>

                    <p className="mt-4 text-xs leading-5 text-white/45">
                      A successful share-sheet handoff doesn’t mean a Story was
                      published. No automatic link sticker or music selection is
                      possible from a browser.
                    </p>
                  </div>
                )}
              </>
            )}

            {view === "qr" && (
              <>
                <button
                  type="button"
                  onClick={backToOptions}
                  className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-medium text-white/60 transition-colors hover:text-white"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  All Options
                </button>

                <div className="mt-5 flex flex-col items-center text-center">
                  {(qrState === "loading" ||
                    (qrState === "idle" && !qrDataUrl)) && (
                    <>
                      <LoaderCircle
                        size={28}
                        aria-hidden="true"
                        className="animate-spin text-white/80"
                      />
                      <p className="mt-3 text-sm text-white/70">
                        Creating your QR code…
                      </p>
                    </>
                  )}

                  {qrState === "error" && (
                    <>
                      <CircleAlert
                        size={28}
                        aria-hidden="true"
                        className="text-white/70"
                      />
                      <p className="mt-3 text-sm text-white/75">{qrError}</p>
                    </>
                  )}

                  {qrDataUrl && (
                    <div className="rounded-2xl bg-white p-4 shadow-xl">
                      <Image
                        src={qrDataUrl}
                        alt="QR code linking to this story"
                        width={220}
                        height={220}
                        unoptimized
                        className="size-[220px]"
                      />
                    </div>
                  )}

                  <p className="mt-4 text-sm font-medium text-white">
                    Scan to read this story.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/50">
                    A QR code is not a clickable Story link sticker.
                  </p>

                  <button
                    type="button"
                    onClick={() => void copyDestination(destinationUrl)}
                    disabled={!destinationUrl}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy size={16} aria-hidden="true" />
                    Copy Link
                  </button>
                </div>
              </>
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

function imageShareCopy(
  platform: StoryPlatform | null,
  handedOff: boolean
): string {
  if (!handedOff) return "";
  if (platform === "messenger") {
    return "Image handed to the share sheet. Choose Messenger there if you want to send it in a chat.";
  }
  return "Image handed to the share sheet. Choose Instagram or Facebook there if offered, then add the Link sticker manually.";
}
