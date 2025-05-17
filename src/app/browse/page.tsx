"use client";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";

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
    <div className="flex-2 items-center justify-center gap-3.5">
      <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search something..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      <ul className="w-full max-w-md mt-4 space-y-4">
        {results.map((item: any, index: number) => (
          <li key={index}>
            <a
              href={`/view?id=${item.id}`}
              target="_blank" // Open in new tab
              rel="noopener noreferrer" // Security best practice
              className="block p-4 border border-gray-300 bg-white rounded shadow hover:bg-gray-50 transition-all flex gap-4"
            >
              {item.trackImage && (
                <img
                  src={item.trackImage}
                  alt={item.trackName}
                  className="w-20 h-20 object-cover rounded"
                />
              )}

              <div className="flex flex-col justify-between">
                <div className="mb-2">
                  <div className="text-gray-700 font-semibold">
                    From:{" "}
                    <span className="font-normal">
                      {item.name || "Unknown"}
                    </span>
                  </div>
                  <div className="text-gray-600 italic">
                    Message:{" "}
                    <span className="font-normal">{item.message || "-"}</span>
                  </div>
                </div>

                <div>
                  <div className="text-black font-bold">Song:</div>
                  <div className="text-gray-800 font-semibold">
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
  );
}
