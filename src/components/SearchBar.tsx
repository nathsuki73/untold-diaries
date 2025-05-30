"use client";

import { useState, useEffect, useRef } from "react";
import AsyncSelect from "react-select/async"; // Import AsyncSelect instead of Select
import debounce from "lodash.debounce";

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

interface SearchBarProps {
  setSelected: (option: OptionType | null) => void;
}

export default function SearchBar({ setSelected }: SearchBarProps) {
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchResults = debounce(async (q: string) => {
    if (!q || typeof q !== "string") return [];

    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    const data: Track[] = await res.json();

    const opts = data.map((track) => ({
      value: track.id,
      label: `${track.name} - ${track.artists.map((a) => a.name).join(", ")}`,
      track,
    }));

    return opts;
  }, 300);

  const handleChange = (option: OptionType | null) => {
    setSelected(option);
  };

  const customSingleValue = ({ data }: any) => (
    <div className="flex items-center">
      <img src={data.track.image} className="w-6 h-6 rounded mr-2" alt="" />
      {data.label}
    </div>
  );


  const customOption = (props: any) => {
    const { data, innerRef, innerProps } = props;
    const { track } = data;

    return (
      <div
        ref={innerRef}
        {...innerProps}
        className="flex items-center p-3 cursor-pointer"
      >
        <img src={track.image} className="w-10 h-10 rounded mr-3" alt="" />
        <div>
          <div className="font-medium">{track.name}</div>
          <div className="text-sm text-gray-500">
            {track.artists.map((a: Artist) => a.name).join(", ")}
          </div>
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="pt-5 pb-6">
      <AsyncSelect
        cacheOptions
        loadOptions={fetchResults}
        onChange={handleChange}
        components={{ SingleValue: customSingleValue, Option: customOption }}
        className="w-2xl"
        placeholder="Search Spotify tracks..."
        noOptionsMessage={() => "No tracks found" }
        styles={{
    control: (baseStyles, state) => ({
      ...baseStyles,
      borderColor: state.isFocused ? '[#ffffff50]' : '[#ffffff50]',
      backgroundColor: '[#ffffff100]',
    }),
    input: (base) => ({
    ...base,
    color: '#fff',
    }),
    menu: (base) => ({
    ...base,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
    backdropFilter: 'blur(10px)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    color: '#fff', 
    }),
  }}
      />
    </div>

  );
}
