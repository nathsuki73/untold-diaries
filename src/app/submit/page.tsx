"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import Turnstile from "react-turnstile";
import Form from "next/form";
import { toast, Toaster } from "react-hot-toast";
import { debounce } from "lodash";
import Background from "@/components/Background";
import { LinearGradient } from "react-text-gradients";
import "@fortawesome/fontawesome-free/css/all.min.css";
import CatYapper from "@/components/CatYapper";
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

    const emotionMap: Record<string, number> = {
      Sadness: 0,
      Joy: 1,
      Love: 2,
      Anger: 3,
      Fear: 4,
      Surprise: 5,
    };

    const formData = {
      name,
      message,
      captcha,
      track: selectedTrack ? selectedTrack.track.id : null,
      from: from,
      emotion:
        emotion && emotionMap[emotion] !== undefined ? emotionMap[emotion] : 0,
    };

    console.log(JSON.stringify(formData));

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

  const debouncedDetectEmotion = debounce(detectEmotion, 1000);

  useEffect(() => {
    debouncedDetectEmotion(message); // Call the debounced function
  }, [message]);

  return (
    <>
      <Background />
      <div className="grid grid-cols-2 items-center justify-center min-h-full bg-transparent">
        <Toaster position="top-center" />
        <div className="-mt-35 ml-50">
          <Form
            action="/submit"
            className="p-6 bg-[#ffffff08] w-180 h-200 rounded-3xl shadow text-white"
          >
            <h1 className="mt-15 mb-8 flex items-center justify-center text-4xl font-regular font-primary">
              Let's Connect!
            </h1>
            <div className="-mt-7 mb-15 text-center opacity-65">
              Let's align our constellations! Reach out and let the magic of
              sounds found their
              <br />
              way home!
            </div>
            <input
              id="to"
              name="to"
              placeholder="Enter recipient"
              className="block w-full mb-10 p-2 border rounded bg-[#ffffff11] border-[#ffffff50]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              id="message"
              name="message"
              placeholder="Enter message"
              className="block w-full mb-10 p-2 border rounded bg-[#ffffff11] border-[#ffffff50] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {emotion && (
              <div className="mt-2 text-lg text-gray-700">
                Detected Emotion: <strong>{emotion}</strong>
              </div>
            )}
            <input
              id="from"
              name="from"
              placeholder="Enter from"
              className="block w-full mb-4 p-2 border rounded bg-[#ffffff11] border-[#ffffff50]"
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
              className="w-full p-3 rounded bg-gradient-to-r from-[#763AF5] to-[#A604F2] "
            >
              Share Your Story
              <i className="ml-3 fa-solid fa-shuttle-space"></i>
            </button>
          </Form>
        </div>

        <div>
          <div className="flex items-center justify-center text-white">
            <div className="-mt-200 font-black font-secondary text-7xl">
              <LinearGradient gradient={["to right", "#4F24B4, #999999"]}>
                Untold Diaries
              </LinearGradient>
            </div>
          </div>
          <div className="-mt-89 flex items-center justify-center text-center text-white font-secondary text-lg font-light">
            Stay anonymous - No names. No judgements.
            <br />
            Just untold truths and stories.
          </div>
          <CatYapper text={message} />
        </div>
      </div>
    </>
  );
}
