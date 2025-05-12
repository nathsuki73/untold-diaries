"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import Turnstile from "react-turnstile";
import Form from "next/form";
import { toast, Toaster } from "react-hot-toast";
import { debounce } from "lodash";

type Artist = {
  name: string;
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
  image: string;
};

type OptionType = {
  value: string;
  label: string;
  track: Track;
};

export default function Submit() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<OptionType | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const formData = {
      name,
      message,
      captcha,
      selectedTrack,
      ...(from && { from }),
    };

    const res = await fetch("http://127.0.0.1:8000/submit-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    toast.success(data.message);
  };

  const detectEmotion = async (text: string) => {
    console.log("Detecting emotion for text:", text);
    if (!text) {
      setEmotion(null);
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/predict-emotion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }), // Sending the current text for prediction
    });

    const data = await res.json();
    setEmotion(data.predicted_emotion); // Set the detected emotion
  };

  const debouncedDetectEmotion = debounce(detectEmotion, 2000);

  useEffect(() => {
    debouncedDetectEmotion(message); // Call the debounced function
  }, [message]);

  return (
    <div className="flex items-center justify-center min-h-full bg-gray-100">
      <Toaster position="top-center" />

      <Form action="/submit" className="p-4 bg-white rounded shadow">
        <label htmlFor="to" className="block mb-2">
          To:
        </label>
        <input
          id="to"
          name="to"
          placeholder="Enter recipient"
          className="block w-full mb-4 p-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="message" className="block mb-2">
          Message:
        </label>
        <textarea
          id="message"
          name="message"
          placeholder="Enter message"
          className="block w-full mb-4 p-2 border rounded"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {emotion && (
          <div className="mt-2 text-lg text-gray-700">
            Detected Emotion: <strong>{emotion}</strong>
          </div>
        )}
        <label htmlFor="from" className="block mb-2">
          from:
        </label>
        <input
          id="from"
          name="from"
          placeholder="Enter from"
          className="block w-full mb-4 p-2 border rounded"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <SearchBar setSelected={setSelectedTrack} />

        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onVerify={(token) => setCaptcha(token)}
        />

        <button
          type="submit"
          onClick={handleSubmit}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        ></button>
      </Form>
    </div>
  );
}
