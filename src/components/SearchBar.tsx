'use client';

import { useState, useEffect } from 'react';
import debounce from 'lodash.debounce';

type Artist = {
  name: string;
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const fetchResults = debounce(async (q: string) => {
    if (!q) return setResults([]);
    const res = await fetch(`/api/spotify/search?q=${q}`);
    const data = await res.json();
    setResults(data);
  }, 300);

  useEffect(() => {
    fetchResults(query);
    return () => fetchResults.cancel();
  }, [query]);

  return (
    <div className="p-4">
      <input
        className="w-full border p-2 rounded"
        placeholder="Search Spotify tracks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="mt-2">
        {results.map((track: Track) => (
          <li key={track.id} className="p-2 border-b">
            <div>{track.name} - {track.artists.map((a: Artist) => a.name).join(', ')}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
