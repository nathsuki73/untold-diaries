"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useSearchParams } from "next/navigation";

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
    <main className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Submission Details</h1>
      <p>
        <strong>Name:</strong> {submission.name}
      </p>
      <p>
        <strong>Message:</strong> {submission.message}
      </p>
      <p>
        <strong>From:</strong> {submission.from}
      </p>
      <p>
        <strong>Track ID:</strong> {submission.track}
      </p>

      {submission.track && (
        <div className="mt-6">
          <iframe
            style={{ borderRadius: "12px" }}
            src={`https://open.spotify.com/embed/track/${submission.track}?utm_source=generator`}
            width="50%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>
      )}
    </main>
  );
};

export default ViewPage;
