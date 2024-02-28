"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function Footer() {
  useEffect(() => {
    function updateGMTTime() {
      // Ensure this code runs only in a browser environment
      if (typeof document !== "undefined") {
        const now = new Date();
        let hours = now.getUTCHours();
        const minutes = String(now.getUTCMinutes()).padStart(2, "0");
        const seconds = String(now.getUTCSeconds()).padStart(2, "0");

        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const gmtTimeString = `${hours}:${minutes}:${seconds} ${ampm}`;
        const gmtElement = document.getElementById("gmtTime");

        if (gmtElement) {
          gmtElement.innerHTML = "London, England<br>" + gmtTimeString;
        }
      }
    }

    // Update the time every second
    const interval = setInterval(updateGMTTime, 1000);

    // Initialize
    updateGMTTime();

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <nav
        className={` w-full flex flex-row justify-between items-center py-[28px] font-light text-3xl  cursor-none    bg-black h-[300px] px-[25px] md:px-[75px] 
        `}
      >
        {/* Footer content */}
        <div id="gmtTime" className=" text-[#f5f0e6] uppercase">
          Loading time...
        </div>
        {/* Middle */}
        <Link className="custom-cursor-clickable    text-[#f5f0e6] cursor-none hover:underline " href="/">
          @ykapf.
        </Link>
      </nav>
    </>
  );
}
