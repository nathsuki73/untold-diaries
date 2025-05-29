import { useEffect, useState } from "react";
import React from "react";
import { debounce } from "lodash";

type CatYapperProps = {
  text: string;
};

const CatYapper = ({ text }: CatYapperProps) => {
  const [CatTalks, setCatTalks] = useState("");
  const [displayText, setDisplayText] = useState("");

  const getYap = async (text: string) => {
    const res = await fetch("http://127.0.0.1:8000/let-cat-yap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

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
      }, 5000);
    } else {
      debouncedYap(text);
    }

    return () => {
      if (interval) clearInterval(interval);
      debouncedYap.cancel();
    };
  }, [debouncedYap, text]);

  useEffect(() => {
    let index = 0;
    let interval: NodeJS.Timeout;

    const deleteThenType = () => {
      interval = setInterval(() => {
        setDisplayText((prev) => {
          if (prev.length === 0) {
            clearInterval(interval);
            typeNewText();
            return "";
          }
          return prev.slice(0, -1);
        });
      }, 30);
    };

    const typeNewText = () => {
      index = 0;
      interval = setInterval(() => {
        setDisplayText((prev) => prev + CatTalks.charAt(index));
        index++;
        if (index >= CatTalks.length) clearInterval(interval);
      }, 50);
    };

    deleteThenType();

    return () => clearInterval(interval);
  }, [CatTalks]);

  return (
    <div className="text-lg text-purple-500 italic font-bold tracking-wide mt-4 transition-all duration-300 font-tertiary max-w-xl mx-auto px-4 text-center whitespace-pre-wrap">
      " {displayText}<span className="animate-pulse">|</span> "
    </div>
  );
};

export default CatYapper;