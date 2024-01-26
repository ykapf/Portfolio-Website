"use client";
import Footer from "./components/Footer";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";
import Button from "./components/Button";

export default function Home() {
  const links = [
    {
      href: "/media",
      title: "Media",
      description: "Check out my embedded media viewer page using YouTube's embed API.",
    },
    {
      href: "/repos",
      title: "Repos",
      description: "View any GitHub user's repositories and account details using GitHub's API.",
    },
    {
      href: "https://gtav-radio.vercel.app/",
      title: "GTA V Radio",
      description: "Web app developed to listen to GTA V radio stations online.",
    },
    {
      href: "/",
      title: "Templates",
      description: "This is a placeholder for future, featured projects.",
    },
  ];

  return (
    // bg-[rgb(235,229,210)] dark:bg-[#0000FE]
    <div className="flex min-h-screen  flex-col    bg-white dark:bg-black       -z-50     overflow-y-auto    grayscale">
      {/* <Navbar /> */}

      <div className="w-full h-full  flex flex-col items-center justify-center gap-[50px]     px-[75px] pt-[75px]  " style={{ minHeight: `100svh` }}>
        <div
          // text-[#ffffff]/50 dark:text-[#3e3eff]
          className={`kaftanFont   absolute top-50  origin-center flex items-center justify-center     -translate-y-[25%]    text-[#F0F0F0] dark:text-[#0F0F0F]          -z-[10] transform scale-y-125 blur-[6px]`}
          style={{ fontSize: "23.75vw" }}
        >
          portfolio
        </div>

        <div
          // text-[#0000FE] dark:text-[#FFFFFF]
          className={`custom-cursor-clickable kaftanFont   flex items-center justify-center  text-[150px]   text-[#000000] dark:text-[#FFFFFF]   lowercase   `}
          style={{ fontSize: "8.95vw" }}
        >
          Yusuf Kaplan.
        </div>
        <div className="relative  flex items-center justify-end pt-[50px] ">
          <Button href="/about" buttonText="ABOUT" />
        </div>
      </div>

      <div className=" md:px-[125px] lg:px-[175px]   mb-32 grid items-start justify-center md:gap-x-[100px] xl:gap-x-0 text-center md:grid-cols-2 xl:grid-cols-4 md:text-left">
        {links.map(({ href, title, description }, index) => (
          <a
            key={index}
            href={href}
            className={`custom-cursor-clickable    group rounded-md border border-transparent px-5 py-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-300/20 delay-50 `}
          >
            <h2 className="custom-cursor-clickable  mb-[6px] text-2xl font-base  text-[#0000FE] dark:text-[rgb(235,229,210)] uppercase   transform scale-y-[1.1]">
              {title}
              <span className="custom-cursor-clickable  inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none duration-500 transform scale-y-[0.7]">
                -&gt;
              </span>
            </h2>
            <p className="custom-cursor-clickable  m-0 max-w-[30ch] text-sm opacity-50 ">{description}</p>
          </a>
        ))}
      </div>

      <Footer />
    </div>
  );
}
