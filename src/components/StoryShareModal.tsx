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
  LoaderCircle,
  MessageCircle,
  QrCode,
  Share2,
  X,
} from "lucide-react";
import {
  generateStoryTemplate,
  STORY_TEMPLATE_HEIGHT,
  STORY_TEMPLATE_WIDTH,
  type StoryTemplateResult,
} from "@/lib/storyTemplate";

type StoryPlatform = "instagram" | "facebook" | "messenger";
type ShareView = "options" | "preview" | "qr";
type AsyncState = "idle" | "loading" | "error";

type StoryShareModalProps = {
  open: boolean;
  onClose: () => void;
  storyId: number;
  recipient: string;
  message: string;
  sender?: string | null;
  track?: string | null;
};

type ShareDataWithFiles = {
  files: File[];
  title?: string;
  text?: string;
  url?: string;
};

type ShareNavigator = Navigator & {
  canShare?: (data: ShareDataWithFiles) => boolean;
  share?: (data: ShareDataWithFiles) => Promise<void>;
};

const PLATFORM_OPTIONS = [
  {
    id: "instagram",
    label: "Instagram Story",
    hint: "A 9:16 image for your Story",
    icon: Instagram,
  },
  {
    id: "facebook",
    label: "Facebook Story",
    hint: "A 9:16 image for your Story",
    icon: Facebook,
  },
  {
    id: "messenger",
    label: "Messenger Story",
    hint: "Send the image in a chat",
    icon: MessageCircle,
  },
] as const;

const HANDOFF_GUIDANCE: Record<StoryPlatform, string> = {
  instagram:
    "If Instagram opens, choose Stories. Otherwise download the image and upload it to Instagram Stories.",
  facebook:
    "If Facebook opens, choose Story. Otherwise download the image and upload it to Facebook Stories.",
  messenger:
    "Messenger doesn’t offer a website-to-Story handoff. Send the image in a chat, or add it to your Messenger Story from the app.",
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
  const [canShareImage, setCanShareImage] = useState(false);
  const [storyUrl, setStoryUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrState, setQrState] = useState<AsyncState>("idle");
  const [qrError, setQrError] = useState("");
  const [feedback, setFeedback] = useState("");

  const templatePromiseRef = useRef<Promise<StoryTemplateResult> | null>(null);
  const requestRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const activePlatform = PLATFORM_OPTIONS.find((option) => option.id === platform);
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
        ? "Your Story image is ready."
        : "Choose where you’d like to share this note.";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStoryUrl(`${window.location.origin}/view?id=${storyId}`);
  }, [storyId]);

  useEffect(() => {
    requestRef.current += 1;
    templatePromiseRef.current = null;
    setView("options");
    setPlatform(null);
    setTemplate(null);
    setGeneration("idle");
    setDownloadUrl("");
    setCanShareImage(false);
    setQrDataUrl("");
    setQrState("idle");
    setQrError("");
    setFeedback("");
  }, [storyId, recipient, message, sender, track]);

  useEffect(() => {
    if (!open) {
      requestRef.current += 1;
      setView("options");
      setPlatform(null);
      setGeneration("idle");
      setFeedback("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

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
    if (!template || typeof navigator === "undefined") {
      setCanShareImage(false);
      return;
    }

    const shareNavigator = navigator as ShareNavigator;
    if (
      typeof shareNavigator.canShare !== "function" ||
      typeof shareNavigator.share !== "function"
    ) {
      setCanShareImage(false);
      return;
    }

    try {
      const file = new File([template.blob], template.filename, {
        type: "image/png",
      });
      setCanShareImage(shareNavigator.canShare({ files: [file] }));
    } catch {
      setCanShareImage(false);
    }
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

  const showFeedback = useCallback((value: string) => {
    setFeedback(value);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(""), 3500);
  }, []);

  const getTemplate = useCallback(async () => {
    if (templatePromiseRef.current) return templatePromiseRef.current;

    const promise = generateStoryTemplate({
      storyId,
      recipient,
      message,
      sender,
      track,
    })
      .then((result) => {
        templatePromiseRef.current = null;
        return result;
      })
      .catch((error: unknown) => {
        templatePromiseRef.current = null;
        throw error;
      });

    templatePromiseRef.current = promise;
    return promise;
  }, [message, recipient, sender, storyId, track]);

  const selectPlatform = useCallback(
    async (id: StoryPlatform) => {
      const request = requestRef.current + 1;
      requestRef.current = request;
      setPlatform(id);
      setView("preview");
      setFeedback("");

      if (template) {
        setGeneration("idle");
        return;
      }

      setGeneration("loading");
      try {
        const result = await getTemplate();
        if (request !== requestRef.current) return;
        setTemplate(result);
        setGeneration("idle");
      } catch {
        if (request !== requestRef.current) return;
        setGeneration("error");
      }
    },
    [getTemplate, template]
  );

  const retryGeneration = useCallback(() => {
    templatePromiseRef.current = null;
    if (platform) void selectPlatform(platform);
  }, [platform, selectPlatform]);

  const buildQrCode = useCallback(async () => {
    if (qrDataUrl) return;
    if (!storyUrl) {
      setQrState("error");
      setQrError("The story link isn’t ready yet. Close and reopen sharing.");
      return;
    }

    setQrState("loading");
    setQrError("");

    const hostname =
      typeof window === "undefined" ? "" : window.location.hostname;
    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(
      hostname
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
      const url = await QRCode.toDataURL(storyUrl, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#11131B", light: "#FFFFFF" },
      });
      setQrDataUrl(url);
      setQrState("idle");
    } catch {
      setQrState("error");
      setQrError("We couldn’t create the QR code. Copy the link instead.");
    }
  }, [qrDataUrl, storyUrl]);

  const selectQr = useCallback(() => {
    requestRef.current += 1;
    setPlatform(null);
    setView("qr");
    setFeedback("");
    void buildQrCode();
  }, [buildQrCode]);

  const backToOptions = useCallback(() => {
    requestRef.current += 1;
    setView("options");
    setPlatform(null);
    setFeedback("");
  }, []);

  const copyStoryLink = useCallback(async () => {
    if (!storyUrl) return;

    try {
      await navigator.clipboard.writeText(storyUrl);
    } catch {
      const input = document.createElement("input");
      input.value = storyUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    showFeedback("Link copied");
  }, [showFeedback, storyUrl]);

  const shareImage = useCallback(async () => {
    if (!template) return;

    const shareNavigator = navigator as ShareNavigator;
    if (!shareNavigator.share || !shareNavigator.canShare) {
      showFeedback("Download the image to share it here.");
      return;
    }

    try {
      const file = new File([template.blob], template.filename, {
        type: "image/png",
      });
      const data: ShareDataWithFiles = {
        files: [file],
        title: "An Untold Diaries note",
        text: `A note for ${recipient?.trim() || "someone"}`,
      };

      if (!shareNavigator.canShare(data)) {
        showFeedback("This device can’t share images. Download the image instead.");
        return;
      }

      await shareNavigator.share(data);
      showFeedback("Image shared. Choose Stories in the app that opens.");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        showFeedback("Sharing failed. Download the image and upload it instead.");
      }
    }
  }, [recipient, showFeedback, template]);

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
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-white">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/55">
                          {hint}
                        </span>
                      </span>
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
                  Websites can’t prefill these Story editors. We’ll make the image;
                  your device handles the final handoff.
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
                      {STORY_TEMPLATE_HEIGHT}
                    </p>

                    <div className="mt-5 space-y-2">
                      {canShareImage ? (
                        <button
                          type="button"
                          onClick={() => void shareImage()}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#12151F] transition-colors hover:bg-white/90 active:scale-[0.99] motion-reduce:transform-none"
                        >
                          <Share2 size={17} aria-hidden="true" />
                          Share Image
                        </button>
                      ) : downloadUrl ? (
                        <a
                          href={downloadUrl}
                          download={template.filename}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#12151F] transition-colors hover:bg-white/90 active:scale-[0.99] motion-reduce:transform-none"
                        >
                          <Download size={17} aria-hidden="true" />
                          Download Story Image
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="min-h-12 w-full rounded-xl bg-white/40 text-sm font-semibold text-[#12151F]"
                        >
                          Preparing image…
                        </button>
                      )}

                      {canShareImage && downloadUrl && (
                        <a
                          href={downloadUrl}
                          download={template.filename}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                        >
                          <Download size={16} aria-hidden="true" />
                          Download Image
                        </a>
                      )}
                    </div>

                    <p className="mt-4 text-xs leading-5 text-white/55">
                      {activePlatform ? HANDOFF_GUIDANCE[activePlatform.id] : ""}
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
                    Works from another device on the live site.
                  </p>

                  <button
                    type="button"
                    onClick={() => void copyStoryLink()}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
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
                className="mt-4 text-center text-xs font-medium text-white/75"
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
