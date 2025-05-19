"use client"

import Background from "@/components/Background";
import Link from "next/link";
import Carousel from "@/components/Carousel";

export default function Home() {
  return (
    <>
    <Background />
    <div className="relative flex min-h-screen items-center justify-between px-10 lg:px-24 bg-transparent">

      <div className="z-10 max-w-xl space-y-10">
        <div className="text-4xl md:text-5xl font-primary text-left text-white leading-snug">
          <p>
            No names. No <em className="text-purple-400 italic">judgements</em>.
            <br />
            Just untold <em className="text-purple-300 italic">truths</em>.
          </p>
        </div>

        <div className="flex gap-6">
          <Link href="/submit">
            <button className="px-12 py-6 rounded-xl bg-[rgba(131,110,159,0.7)] hover:bg-purple-500 text-white text-2xl font-semibold transition-all -transform hover:scale-110">
              Submit
            </button>
          </Link>
          <Link href="/browse">
            <button className="px-12 py-6 rounded-xl bg-[rgba(131,110,159)] hover:bg-purple-300 text-white text-2xl font-semibold transition-all -transform hover:scale-110">
              Browse
            </button>
          </Link>
        </div>
      </div>

      <div className="hidden lg:block absolute right-10 top-1/2 transform -translate-y-1/2">
        <Carousel />
      </div>    

    </div>
    </>
  );
} 

