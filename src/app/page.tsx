import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Carousel from "@/components/carousel/Carousel";
import { randomSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stories = await randomSubmissions(30);

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"
    >
      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl leading-[1.08] tracking-[-0.02em] text-balance text-ink sm:text-5xl xl:text-6xl">
            No names. No judgements.{" "}
            <br className="hidden sm:block" />
            Just <em className="italic text-accent">untold truths</em>.
          </h1>

          <p className="mt-6 max-w-prose text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Share an anonymous note and pair it with a song, or read the
            letters other people have left behind.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/submit"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent-strong px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Share your story
            </Link>
            <Link
              href="/browse"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
            >
              Browse stories
            </Link>
          </div>
        </div>
      </section>

      {/* Card carousel */}
      <section className="border-t border-line py-12 lg:py-16" aria-label="Story carousel">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-serif text-2xl tracking-[-0.01em] text-ink sm:text-3xl">
            From the diaries
          </h2>
          <Link
            href="/browse"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-ink"
          >
            Browse all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <Carousel initialItems={stories} />
      </section>
    </main>
  );
}
