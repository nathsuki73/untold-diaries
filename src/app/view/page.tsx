import React, { Suspense } from "react";
import type { Metadata } from "next";
import ViewClient from "@/app/view/viewClient";
import { getSubmission } from "@/lib/submissions";

type ViewPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export async function generateMetadata({
  searchParams,
}: ViewPageProps): Promise<Metadata> {
  const { id } = await searchParams;
  const storyId = Number(id);
  if (!Number.isInteger(storyId) || storyId < 1) return {};

  try {
    const story = await getSubmission(storyId);
    if (!story) return {};

    const recipient = story.name?.trim();
    const title = recipient
      ? `A note for ${recipient}`
      : "An Untold Diaries note";
    const description =
      story.message.length > 155
        ? `${story.message.slice(0, 152)}…`
        : story.message;
    const url = `/view?id=${storyId}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        siteName: "Untold Diaries",
      },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return {};
  }
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ViewClient />
    </Suspense>
  );
}
