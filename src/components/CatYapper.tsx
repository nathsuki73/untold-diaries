import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";

type CatYapperProps = {
  text: string;
};

// Wait this long after the last keystroke before asking the AI, and skip
// very short drafts, so the free OpenRouter quota isn't burned on every key.
const REPLY_DELAY_MS = 2000;
const MIN_LENGTH_FOR_REPLY = 8;

const CatYapper = ({ text }: CatYapperProps) => {
  const [catTalks, setCatTalks] = useState("");
  const lastAskedRef = useRef("");

  const askCat = useMemo(
    () =>
      debounce(async (draft: string) => {
        if (draft === lastAskedRef.current) return;
        lastAskedRef.current = draft;
        try {
          const res = await fetch("/api/cat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: draft }),
          });
          const data = await res.json();
          if (data.catYap) setCatTalks(data.catYap);
        } catch (err) {
          console.error("Cat request failed:", err);
        }
      }, REPLY_DELAY_MS),
    []
  );

  useEffect(() => () => askCat.cancel(), [askCat]);

  useEffect(() => {
    const draft = text.trim();

    if (draft === "") {
      askCat.cancel();
      lastAskedRef.current = "";
      setCatTalks("");
      return;
    }

    if (draft.length >= MIN_LENGTH_FOR_REPLY) askCat(draft);
  }, [askCat, text]);

  if (!catTalks) return null;

  return (
    <p
      aria-hidden="true"
      className="mt-3 min-h-6 text-sm italic leading-6 text-muted"
    >
      “{catTalks}”
    </p>
  );
};

export default CatYapper;
