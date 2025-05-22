"use client";

import { useEffect, useRef } from "react";

const messages = [
  {
    title: "To: Nathaniel",
    body: "Suspendisse potenti. Aenean aliquet libero ut efficitur pharetra...",
    song: "Pink Skies - LANY",
  },
  {
    title: "To: You",
    body: "This is the second message. A truth unspoken until now...",
    song: "Malibu Nights - LANY",
  },
  {
    title: "To: A Stranger",
    body: "You never knew, but you saved me that night...",
    song: "Thru These Tears - LANY",
  },
];

export default function MessageCarousel() {
  const downRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    let frameId: number;

    const scroll = () => {
      if (downRef.current && upRef.current) {
        downRef.current.scrollTop += 0.7;
        upRef.current.scrollTop -= 0.7;

        if (downRef.current.scrollTop >= downRef.current.scrollHeight - downRef.current.clientHeight) {
          downRef.current.scrollTop = 0;
        }

        if (upRef.current.scrollTop <= 0) {
          upRef.current.scrollTop = upRef.current.scrollHeight;
        }
      }

      frameId = requestAnimationFrame(scroll);
    };

    frameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(frameId);
  }, []);

  const doubledMessages = [...messages, ...messages];

  return (
    <div className="flex gap-6">
      <div
        ref={downRef}
        className="w-80 h-[500px] overflow-y-scroll no-scrollbar scroll-smooth space-y-6"
      >
        {doubledMessages.map((msg, index) => (
          <div
            key={`down-${index}`}
            className="bg-[#ffffff11] backdrop-blur-md rounded-xl p-5 text-white shadow-md border border-[#7f64a0]"
          >
            <p className="text-sm text-gray-300 italic mb-1">{msg.song}</p>
            <h3 className="text-md font-semibold">{msg.title}</h3>
            <p className="text-sm mt-2 text-gray-200">{msg.body}</p>
          </div>
        ))}
      </div>

      <div
        ref={upRef}
        className="w-80 h-[500px] overflow-y-scroll no-scrollbar scroll-smooth space-y-6"
      >
        {doubledMessages.map((msg, index) => (
          <div
            key={`up-${index}`}
            className="bg-[#ffffff11] backdrop-blur-md rounded-xl p-5 text-white shadow-md border border-[#7f64a0]"
          >
            <p className="text-sm text-gray-300 italic mb-1">{msg.song}</p>
            <h3 className="text-md font-semibold">{msg.title}</h3>
            <p className="text-sm mt-2 text-gray-200">{msg.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}