"use client";
import { ReactNode, useEffect, useState } from "react";

interface DeviceWarningProps {
  children: ReactNode;
}

export default function DeviceWarning({ children }: DeviceWarningProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768); // mobile breakpoint
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  if (isMobile) {
    return (
      <div className="text-purple-400 fixed font-serif inset-0 z-50 flex flex-col justify-center items-center bg-[#0A0D17] bg-opacity-90 px-6 text-center select-none">
        <h2 className="text-4xl mb-4 font-tertiary">
          Please use a computer for a better experience.
        </h2>
        <p className="text-lg font-light max-w-md opacity-75">
          We recommend visiting
          on a desktop or laptop for full functionality. 
          <span role="img" aria-label="love">❤️</span>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
