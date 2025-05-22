/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import Background from "@/components/background/Background";

export default function Browse() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      // For each item, fetch full track details from your API route
      const enhancedResults = await Promise.all(
        data.map(async (item: any) => {
          if (!item.track) return item;

          const trackRes = await fetch(`/api/spotify/get?id=${item.track}`);
          if (!trackRes.ok) return item;

          const trackData = await trackRes.json();

          return {
            ...item,
            trackName: trackData.name,
            trackArtists: trackData.artists.map((a: any) => a.name).join(", "),
            trackImage: trackData.image,
          };
        })
      );

      setResults(enhancedResults);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  return (
    <>
      <Background />
      <div className="flex-2 items-center justify-center gap-3.5 ml-140">
        <form onSubmit={handleSearch} className="flex gap-2 w-200 font-tertiary">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search something..."
            className="flex-1 border border-[#7f64a0] rounded-4xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-[#c296f8]"
          />
          <button
            type="submit"
            className="bg-[#3E166E] text-white px-4 py-2 rounded-4xl hover:bg-[#7f64a0] transition"
          >
            Find
          </button>
        </form>

        <ul className="grid grid-cols-3 mt-7 -ml-80 w-355 justify-center items-center gap-x-25 gap-y-10">
          {results.map((item: any, index: number) => (
            <li key={index}>
              <a
                href={`/view?id=${item.id}`}
                target="_blank" // Open in new tab
                rel="noopener noreferrer" // Security best practice
                className=" flex p-4 border-2 w-100 border-[#7f64a0] bg-[#ffffff11] rounded-3xl shadow hover:bg-[#0a090911] transition-all"
              >
                {item.trackImage && (
                  <img
                    src={item.trackImage}
                    alt={item.trackName}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}

                <div className="flex flex-col justify-between ml-4 font-tertiary">
                  <div className="mb-2">
                    <div className="text-[#7f64a0] font-bold">
                      From:{" "}
                      <span className="font-semibold">
                        {item.name || "Unknown"}
                      </span>
                    </div>
                    <div className="text-white opacity-80 italic">
                      Message:{" "}
                      <span className="font-normal">{item.message || "-"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 font-bold">Track:</div>
                    <div className="text-[#7f64a0] font-normal">
                      {item.trackName || "Unknown Track"}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {item.trackArtists || "Unknown Artist"}
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>    
    </>
  );
}
