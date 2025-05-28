/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Color from "color-thief-react";
import ColorConvert from "color";
import { motion, AnimatePresence } from "framer-motion";

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
    <Color src={trackImage || ""} format="hex" crossOrigin="anonymous">
      {({ data }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [hovered, setHovered] = useState(false);

        const borderColor = data || "#7f64a0"; // fallback if no color is found
        const overlayColor = ColorConvert(borderColor).alpha(0.8).rgb().string();
        const isDark = ColorConvert(overlayColor).isDark();

        const textColor = isDark ? "#FFFFFF" : "#000000";

        return (
          <div
            className="flex flex-col border-2 w-[322px] h-[364px] bg-[#ffffff11] rounded-3xl shadow hover:bg-[#0a090911] transition-all overflow-hidden"
            style={{ borderColor }}
          >
            <div
              className="w-full bg-center bg-cover bg-no-repeat flex flex-col"
              style={{
                backgroundImage: hovered
                  ? `url(${trackImage})` // no overlay on hover
                  : `linear-gradient(${overlayColor}, ${overlayColor}), url(${trackImage})`,
                height: "80%",
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <AnimatePresence mode="wait">
                {!hovered ? (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col h-full"
                  >
                    <div
                      className="p-2 font-semibold text-lg break-all"
                      style={{ color: textColor }}
                    >
                      <p>
                        <strong>To:</strong> {name}
                      </p>
                    </div>
                    <div
                      className="flex-grow flex justify-center items-center p-2 text-center font-semibold text-lg break-all"
                      style={{ color: textColor }}
                    >
                      <p>{message.length > 200 ? message.slice(0, 200) + "..." : message}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-grow flex justify-center items-center"
                  >
                    <a
                      href={`/view?id=${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-56 h-12 rounded-full font-semibold shadow-lg transition flex justify-center items-center"
                      style={{
                        textDecoration: "none",
                        color: borderColor,
                        backgroundColor: isDark ? "#FFFFFF" : "#1a1a1a",
                      }}
                    >
                      Read Story
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Track section */}
            <div
              className="w-full flex flex-row justify-center px-4 py-3"
              style={{
                height: "20%",
                backgroundColor: borderColor,
              }}
            >
              <img
                src={trackImage}
                alt={trackName}
                className="w-12 h-12 object-cover rounded-lg"
              />
              <div className="flex flex-col justify-center mx-4 flex-grow overflow-hidden">
                <h2
                  className="text-white text-lg font-semibold truncate"
                  style={{ color: textColor }}
                >
                  {trackName}
                </h2>
                <p className="text-gray-300 text-sm truncate" style={{ color: textColor }}>
                  {trackArtists}
                </p>
              </div>

              <img
                src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Black.png" // replace with your logo path or URL
                alt="Spotify Logo"
                className="w-10 h-10"
              />
            </div>
          </div>
        );
      }}
    </Color>
  );
};

export default Card;
