"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useSearchParams } from "next/navigation";
import Background from "@/components/background/Background";

type Submission = {
  id: number;
  name: string;
  message: string;
  from: string;
  track: string;
};

const ViewPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetch(`http://127.0.0.1:8000/view-details?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Submission not found");
        return res.json();
      })
      .then((data) => {
        setSubmission(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setSubmission(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <p>No ID provided in URL</p>;

  if (loading) return <p>Loading...</p>;

  if (error) return <p className="text-red-600">{error}</p>;

  if (!submission) return <p>No submission found.</p>;

  return (
    <>
    <Background />
      <main className="p-4 text-white pb-20">
        <p className="font-tertiary text-xl mt-15 ml-10">
          <strong>How are you, </strong> {submission.name} <strong className="font-light">?</strong>
        </p>
        <p className="font-tertiary ml-10 text-gray-400">
          Here&apos;s a song someone thought you might appreciate :)
        </p>
        <div className="mt-10 ml-10 w-240 h-120 flex justify-center items-center p-4 text-lg">
          <p className="text-center font-tertiary w-full leading-7 font-medium">
            {submission.message}
          </p>
        </div>
        <p className="mt-2 ml-226 font-tertiary">
          <strong>It&apos;s me, </strong> {submission.from} <strong>.</strong>
        </p>

        {submission.track && (
          <div className="-mt-118 ml-270">
            <iframe
              style={{ borderRadius: "12px" }}
              src={`https://open.spotify.com/embed/track/${submission.track}?utm_source=generator`}
              width="90%"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            ></iframe>
          </div>
        )}
      </main>
    </>
  );
};

export default ViewPage;
