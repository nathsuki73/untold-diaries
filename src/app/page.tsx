"use client"

import SearchBar from "@/components/SearchBar"
import Link from 'next/link'
import Background from "@/components/background";

export default function Home() {
  return (
    <div  className="flex-2 items-center bg-transparent justify-center gap-3.5 z-0">
      <Background />
    <Link href="/submit">Submit</Link>
    <Link href="/browse">Browse</Link>
  </div>
  );
} 

