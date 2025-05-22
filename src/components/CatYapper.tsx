import { useEffect, useState } from "react";
import React from "react";
import { debounce } from "lodash";

type CatYapperProps = {
  text: string;
};

const CatYapper = ({ text }: CatYapperProps) => {
  const [CatTalks, setCatTalks] = useState("");

  const getYap = async (text: string) => {
    const res = await fetch("http://127.0.0.1:8000/let-cat-yap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    console.log("here");

    const data = await res.json();
    setCatTalks(data.catYap);
  };

  const debouncedYap = debounce((t: string) => {
    getYap(t);
  }, 1000);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (text.trim() === "") {
      interval = setInterval(() => {
        getYap("");
      }, 10000);
    } else {
      debouncedYap(text);
    }

    return () => {
      if (interval) clearInterval(interval);
      debouncedYap.cancel();
    };
  }, [debouncedYap, text]);

  return (
    <div className="text-lg text-yellow-600 italic font-light tracking-wide mt-4 transition-all duration-300">
      &quot;{CatTalks}&quot;
    </div>
  );
};

export default CatYapper;
