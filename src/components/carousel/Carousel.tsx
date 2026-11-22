"use client";

import { useEffect, useState } from "react";
import BrowseStoryCard from "@/components/BrowseStoryCard";
import {
  withTrackInfo,
  type Submission,
  type SubmissionWithTrack,
} from "@/lib/tracks";

interface CarouselProps {
  initialItems?: Submission[];
}

function splitRows(items: SubmissionWithTrack[] = []): SubmissionWithTrack[][] {
  const row1: SubmissionWithTrack[] = [];
  const row2: SubmissionWithTrack[] = [];

  items.forEach((item, idx) => {
    (idx % 2 === 0 ? row1 : row2).push(item);
  });

  return [
    [...row1, ...row1, ...row1],
    [...row2, ...row2, ...row2],
  ];
}

const Carousel = ({ initialItems = [] }: CarouselProps) => {
  const [rows, setRows] = useState<SubmissionWithTrack[][]>(() =>
    splitRows(initialItems)
  );

  useEffect(() => {
    let cancelled = false;

    const enrich = async () => {
      const enriched = await withTrackInfo(initialItems);
      if (!cancelled) setRows(splitRows(enriched));
    };

    if (initialItems.some((item) => item.track)) enrich();

    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  return (
    <div
      className="w-full overflow-hidden"
      aria-label="Story carousel"
      role="region"
    >
      <div className="story-carousel-viewport space-y-4 overflow-hidden w-full px-4">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`flex w-max will-change-transform ${
              rowIdx % 2 === 0 ? "animate-scroll-left" : "animate-scroll-right"
            }`}
          >
            {row.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="mr-4 h-[364px] w-[322px] shrink-0"
              >
                <BrowseStoryCard story={item} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
