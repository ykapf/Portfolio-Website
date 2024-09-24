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
        className={` w-full flex flex-row justify-between items-center py-[50px] font-light text-xl md:text-3xl  cursor-none     h-auto 
        `}
      >
        {/* Footer content */}
        <div id="gmtTime" className=" text-[#f5f0e6] uppercase w-1/2 md:w-1/4    text-center ">
          Loading time...
        </div>
        {/* Middle */}
        <Link className="custom-cursor-clickable    text-[#f5f0e6] cursor-none hover:underline w-1/2 md:w-1/4  text-center" href="/">
          @YKAPF
        </Link>
      </nav>
    </>
  );
}
