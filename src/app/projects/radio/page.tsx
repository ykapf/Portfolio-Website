"use client";
import Footer from "@/app/components/Footer";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";
import RadioWheel from "@/app/components/radio/RadioWheel";

export default function Radio() {
  return (
    // bg-[rgb(235,229,210)] dark:bg-[#0000FE]

    <div className="relative flex flex-col min-h-screen  text-[#f5f0e6]">
      {/* Vertical Grid Background */}
      <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 h-full w-full border-l border-r border-gray-300 opacity-30 z-0">
        {/* Adding borders to create vertical grid outlines */}
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
        {/* Last column doesn't need a right border */}
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Footer */}
        <nav
          className={` w-full flex flex-row justify-between items-center py-[50px] font-light text-xl md:text-3xl  cursor-none     h-auto 
      `}
        >
          {/* Footer content */}
          <Link className="custom-cursor-clickable    text-[#f5f0e6] cursor-none  w-1/2 md:w-1/4  text-center" href="/">
            &lt;-BACK
          </Link>
          {/* Middle */}
          <div className="   text-[#f5f0e6] cursor-none  w-1/2 md:w-1/4  text-center">[GTA V RADIO]</div>
        </nav>
        <div className="flex justify-center w-full ">
          {/* <Navbar /> */}
          <RadioWheel />
        </div>
      </div>
    </div>
  );
}
