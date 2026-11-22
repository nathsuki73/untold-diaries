"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";
import StoryShareModal from "./StoryShareModal";

type StoryShareButtonProps = {
  storyId: number;
  recipient: string;
  message: string;
  sender?: string | null;
  track?: string | null;
};

export default function StoryShareButton({
  storyId,
  recipient,
  message,
  sender,
  track,
}: StoryShareButtonProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>

      <StoryShareModal
        open={open}
        onClose={close}
        storyId={storyId}
        recipient={recipient}
        message={message}
        sender={sender}
        track={track}
      />
    </>
  );
}
