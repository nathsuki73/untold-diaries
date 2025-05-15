import React from "react";
import Link from 'next/link'

const Background = () => 
{
    return (
        <div className="w-max absolute top-left-0">
            <span className="blur-3xl">
                <svg className="absolute top-60 left-43"width="100" height="100">
                    <circle cx="50" cy="50" r="40" fill="magenta" />
                </svg>
            </span>
            <span className="blur-3xl">
                <svg className="absolute top-80 left-360"width="100" height="100">
                    <circle cx="50" cy="50" r="40" fill="#763AF5" />
                </svg>
            </span>
            <span className="blur-3xl"> 
                <svg className="absolute top-140 left-200"width="100" height="100">
                    <circle cx="50" cy="50" r="40" fill="#763AF5" />
                </svg>
            </span>
        </div>
    )
}

export default Background;