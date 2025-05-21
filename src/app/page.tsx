"use client"

import Background from "@/components/Background";
import Link from "next/link";
import Carousel from "@/components/Carousel";
import { LinearGradient } from "react-text-gradients";

export default function Home() {
  return (
    <>
    <Background />
    <div className="relative flex min-h-screen items-center justify-between px-10 lg:px-24 bg-transparent">

      <div className="z-10 max-w-3xl space-y-10 -mt-25">
        <div className="text-4xl md:text-6xl font-primary justify-center text-center text-white leading-snug">
          <LinearGradient gradient={["to right", "#FFFFFF, #4F24B4"]}>
            No names. No judgements.<br />
          </LinearGradient>
          <LinearGradient gradient={["to right", "#FFFFFF, #4F24B4"]}>
            Just untold truths.
          </LinearGradient>
            
        </div>

        <div className="flex gap-10">
          <Link href="/submit">
            <button className="font-lugrasimo px-12 py-6 rounded-4xl bg-[rgba(131,110,159)] hover:bg-purple-300 text-white text-2xl font-semibold transition-all -transform hover:scale-110 w-90 h-30">
                Share Your Story!
            </button>
          </Link>
          <Link href="/browse">
            <button className="font-lugrasimo px-12 py-6 rounded-4xl bg-[rgba(131,110,159)] hover:bg-purple-300 text-white text-2xl font-semibold transition-all -transform hover:scale-110 w-90 h-30">
              Browse Stories
            </button>
          </Link>
        </div>
      </div>

      <div className="hidden lg:block absolute right-10 top-1/2 transform -translate-y-1/2 -mt-21 mr-10">
        <Carousel />
      </div>    

    </div>
    </>
  );
} 

