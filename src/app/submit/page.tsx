/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import Turnstile from "react-turnstile";
import Form from "next/form";
import { debounce } from "lodash";
import Background from "@/components/background/Background";
import { LinearGradient } from "react-text-gradients";
import "@fortawesome/fontawesome-free/css/all.min.css";
import CatYapper from "@/components/CatYapper";
import gif from "@/components/gif_1.gif";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    window.location.href = `/view?id=${data.id}`;

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
  }, [debouncedDetectEmotion, message]);

  return (
    <>
      <Background />
      <div className="grid grid-cols-2 items-center justify-center min-h-full bg-transparent mt-10">
        <div className="-mt-15 ml-50">
          <Form
            action="/submit"
            className="p-6 bg-[#ffffff08] w-180 h-200 rounded-3xl shadow text-white"
          >
            <h1 className="mt-15 mb-10 flex items-center justify-center text-4xl font-extrabold font-secondary">
              Let&apos;s Connect!
            </h1>
            <div className="-mt-7 mb-15 text-center opacity-65">
              Let&apos;s align our constellations! Reach out and let the magic of
              sounds found their
              <br />
              way home!
            </div>
            <input
              id="to"
              name="to"
              placeholder="Enter recipient"
              className="block w-full mb-10 p-2 border rounded bg-[#ffffff11] border-[#ffffff50] font-tertiary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              id="message"
              name="message"
              placeholder="Enter message"
              className="block w-full mb-10 p-2 border rounded bg-[#ffffff11] border-[#ffffff50] resize-none font-tertiary"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {emotion && (
              <div className="mb-6 text-xl text-center font-semibold font-tertiary transition-all duration-500 ease-out">
                <div className="inline-flex items-center justify-center gap-2 animate-pulse">
                  <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                    Detected Emotion: <span className="capitalize">{emotion}</span>
                  </span>
                </div>
              </div>
            )}
            <input
              id="from"
              name="from"
              placeholder="Enter from (optional)"
              className="block w-full mb-4 p-2 border rounded bg-[#ffffff11] border-[#ffffff50] font-tertiary"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <SearchBar setSelected={setSelectedTrack} />

            <Turnstile
              sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onVerify={(token) => setCaptcha(token)}
              className="pb-5"
            />

            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full p-3 font-tertiary rounded bg-gradient-to-r from-[#763AF5] to-[#A604F2] hover:from-[#a888f5] hover:to-[#b238f8] transition-colors duration-300"
            >
              Share Your Story
              <i className="ml-3 fa-solid fa-shuttle-space"></i>
            </button>
          </Form>
        </div>

        <div className="">
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
          <div className="text-center mt-15">
            <CatYapper text={message} />
          </div>
          <div className="mt-5">
            <img src={gif.src} alt="Animated GIF" className="ml-57 -mb-80 w-120 h-120" />
          </div>
        </div>
      </div>
    </>
  );
}