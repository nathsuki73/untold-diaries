/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import Background from "@/components/background/Background";
import Card from "@/components/Card"
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
              <Card
                id={item.id}
                name={item.name}
                message={item.message}
                trackName={item.trackName}
                trackArtists={item.trackArtists}
                trackImage={item.trackImage}
              />
            </li>
          ))}
        </ul>
      </div>    
    </>
  );
}
