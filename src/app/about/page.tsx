// ABOUT PAGE

"use client";
import Footer from "@/app/components/Footer";
import { motion, useAnimation, useScroll } from "framer-motion";
import Link from "next/link";
import Showcase from "../components/Showcase";
import { use, useEffect } from "react";

export default function About() {
  const { scrollYProgress } = useScroll();
  return (
    <div className=" h-full flex flex-col  gap-[50px]  bg-white dark:bg-black overflow-y-auto  justify-start">
      {/* SHOWCASE TITLE  */}
      <div
        className="custom-cursor-clickable kaftanFont fixed top-0 left-0 w-full h-full flex flex-row items-start justify-center pt-[250px] sm:pt-[150px] md:pt-[50px] lg:pt-[0px] lowercase text-[150px] text-black dark:text-white     -z-5"
        style={{ fontSize: "17.5vw" }}
      >
        about me.
      </div>

      {/* SHOWCASE   */}
      <div className=" h-full min-h-screen  flex flex-col     overflow-y-auto   z-10 ">
        <motion.div className="showcase w-full h-full flex items-start justify-center   py-[0px]  overflow-hidden         ">
          <motion.div className="py-[350px]   top-0 transform  flex items-center justify-center uppercase text-[25px] text-black dark:text-white    ">
            <Showcase scrollYProgress={scrollYProgress} variant="delayed" pSrc="/ABOUT.gif" />
          </motion.div>
        </motion.div>

        {/* SHOWCASE DIVIDER  */}
        <div className=" w-full h-full hidden lg:flex  bg-white dark:bg-black   " style={{ minHeight: `75svh` }}></div>
        <div className=" w-full h-full flex lg:hidden  bg-white dark:bg-black   " style={{ minHeight: `35svh` }}></div>
        {/* ABOUT  */}
        <div className="w-full h-full grid grid-cols-4 items-center justify-center  px-[75px]  bg-white dark:bg-black  z-5 " style={{ minHeight: `100svh` }}>
          <div
            className={`custom-cursor-clickable   col-span-4 lg:col-span-2 lg:col-start-2    text-center items-center justify-center uppercase text-[18px] sm:text-[25px]   text-black dark:text-white      `}
          >
            I&apos;m a Computer Science and AI student at Loughborough University with a strong interest in merging design and functionality. I have experience
            working with businesses and startups, helping to design and develop their online presence from concept to implementation. My expertise lies in using
            modern technologies such as Next.js, React, and TypeScript, in addition to a variety of other programming languages.
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
