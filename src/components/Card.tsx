/* eslint-disable @next/next/no-img-element */
// components/Card.tsx
import React from "react";

interface CardProps {
  id: string;
  name?: string;
  message?: string;
  trackName?: string;
  trackArtists?: string;
  trackImage?: string;
}

const Card: React.FC<CardProps> = ({
  id,
  name = "Unknown",
  message = "-",
  trackName = "Unknown Track",
  trackArtists = "Unknown Artist",
  trackImage,
}) => {
  return (
    <a
      href={`/view?id=${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex p-4 border-2 w-100 border-[#7f64a0] bg-[#ffffff11] rounded-3xl shadow hover:bg-[#0a090911] transition-all"
    >
      {trackImage && (
        <img
          src={trackImage}
          alt={trackName}
          className="w-20 h-20 object-cover rounded"
        />
      )}

      <div className="flex flex-col justify-between ml-4 font-tertiary">
        <div className="mb-2">
          <div className="text-[#7f64a0] font-bold">
            To: <span className="font-semibold">{name}</span>
          </div>
          <div className="text-white opacity-80 italic">
            Message: <span className="font-normal">{message}</span>
          </div>
        </div>

        <div>
          <div className="text-gray-500 font-bold">Track:</div>
          <div className="text-[#7f64a0] font-normal">{trackName}</div>
          <div className="text-gray-600 text-sm">{trackArtists}</div>
        </div>
      </div>
    </a>
  );
};

export default Card;
