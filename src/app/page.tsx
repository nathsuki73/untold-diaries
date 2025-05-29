"use client";

import Background from "@/components/background/Background";
import Link from "next/link";
import { LinearGradient } from "react-text-gradients";
import Carousel from "@/components/carousel/Carousel"

export default function Home() {
  return (
    <>
      <Background />
      <div className="relative flex min-h-screen items-center justify-between px-10 lg:px-24 bg-transparent overflow-hidden">
        <div className="z-10 max-w-3xl space-y-10 -mt-25">
          <div className="text-4xl md:text-6xl font-primary justify-center text-center text-white leading-snug">
            <LinearGradient gradient={["to right", "#FFFFFF, #4F24B4"]}>
              No names. No judgements.
              <br />
            </LinearGradient>
            <LinearGradient gradient={["to right", "#FFFFFF, #4F24B4"]}>
              Just untold truths.
            </LinearGradient>
          </div>

          <div className="flex gap-10">
            <div className="relative inline-flex group">
              <div className="absolute transitiona-all duration-1000 opacity-0 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-40 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
              <Link
                href="/submit"
                title="Share your story"
                className="w-80 h-20 font-lugrasimo relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-500 rounded-xl backdrop-blur-md bg-[#4F24B4] hover:bg-[#0A0D17] border border-[#4F24B4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF44EC]"
                role="button"
              >
                Share Your Story!
              </Link>
            </div>
            <div className="relative inline-flex group">
              <div className="absolute transitiona-all duration-1000 opacity-0 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-40 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
              <Link
                href="/browse"
                title="Share your story"
                className="w-80 h-20 font-lugrasimo relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-500 rounded-xl backdrop-blur-md bg-[#0A0D17] hover:bg-[#4F24B4] border border-[#4F24B4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF44EC]"
                role="button"
              >
                Browse Stories!
              </Link>
            </div>
          </div>

          
          
          </div>
            <div className="relative z-10 -mt-12 flex justify-end items-center min-h-[300px]">
                <div className="relative p-6 pr-0 rounded-xl bg-[#0A0D17]/10 backdrop-blur-md w-full max-w-4xl">
            <Carousel />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0A0D17]">
</div>
<div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#0A0D17]">
</div>

          </div>
        </div>    



      </div>
    </>
  );
}
