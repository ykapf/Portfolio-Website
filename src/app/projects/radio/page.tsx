"use client";
import Footer from "@/app/components/Footer";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";
import RadioWheel from "@/app/components/radio/RadioWheel";

export default function Radio() {
  return (
    // bg-[rgb(235,229,210)] dark:bg-[#0000FE]
    <div className="h-full w-full  flex flex-col  justify-center items-center  bg-white dark:bg-black        overflow-y-auto   ">
      {/* <Navbar /> */}
      <RadioWheel />
      <Footer />
    </div>
  );
}
