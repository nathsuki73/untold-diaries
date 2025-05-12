import React from "react";
import Link from 'next/link'

const NavBar = () => 
{
    return (
        <div className="flex justify-between p-11 bg-transparent text-white font-primary text-2xl">
            <Link href="/">Untold Diaries</Link>
            <ul className="flex gap-5">
                <Link href="/submit">Submit</Link>
                <Link className="px-11"href="/browse">Browse</Link>
            </ul>
        </div>
    )
}

export default NavBar;