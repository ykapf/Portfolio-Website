"use client";
import Footer from "./components/Footer";
import { useScroll, useTransform, motion, useAnimation, MotionValue } from "framer-motion";
import Link from "next/link";
import Button from "./components/Button";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useState } from "react";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedLetterProps {
  letter: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}

function useLetterAnimation(scrollYProgress: MotionValue<number>, index: number) {
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]);
  const rotation = useTransform(scrollYProgress, [0, 0.35, 0.5, 0.65, 1], [index * 45, index * 25, 0, -index * 25, -index * 45]);
  return { scale, rotation };
}

const AnimatedLetter: React.FC<AnimatedLetterProps> = ({ letter, index, scrollYProgress }) => {
  const { scale, rotation } = useLetterAnimation(scrollYProgress, index);
  return (
    <motion.div
      className="inline-block"
      style={{
        scale: scale,
        rotate: rotation,
      }}
    >
      {letter}
    </motion.div>
  );
};

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

  useEffect(() => {
    // Create the timeline for the animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".showcase", // Class of the element to trigger the animation
        start: "center center", // When the top of the trigger hits the center of the viewport
        end: "bottom center", // When the bottom of the trigger hits the center of the viewport
        scrub: true, // Smooth scrubbing, true for 1 second of scrubbing (change this value for more "stickiness")
        pin: true, // Pin the element in place while the animation is active
        pinSpacing: false, // No spacing while pinned
        markers: false, // Shows start and end markers, useful for debugging
      },
    });

    // Cleanup function
    return () => {
      // Kill the timeline on component unmount
      tl.kill();
    };
  }, []);

  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]);
  const word = "EXPERIENCE.".split("");

  // const rotations = word.map((_, index) => {
  //   // Adjust the rotation to slow down between 25% and 75% of the scroll progress
  //   return useTransform(
  //     scrollYProgress,
  //     // Input Range: Define points of scroll progress
  //     [0, 0.35, 0.5, 0.65, 1],
  //     // Output Range: Define rotation degree at each point
  //     [index * 45, index * 25, 0, -index * 25, -index * 45]
  //   );
  // });

  return (
    // bg-[rgb(235,229,210)] dark:bg-[#0000FE]
    <div className="flex min-h-screen  flex-col    bg-white dark:bg-black       -z-50     overflow-y-auto    ">
      {/* HERO  */}
      <div className="w-full h-full  flex flex-col items-center justify-center gap-[50px]     px-[75px] py-[75px]  " style={{ minHeight: `100svh` }}>
        <div
          // text-[#ffffff]/50 dark:text-[#3e3eff]
          className={`kaftanFont   absolute top-50  origin-center flex items-center justify-center     -translate-y-[25%]    text-[#F0F0F0] dark:text-[#0F0F0F]          -z-[10] transform scale-y-125 blur-[6px]`}
          style={{ fontSize: "23.75vw" }}
        >
          portfolio
        </div>

        <div
          // text-[#0000FE] dark:text-[#FFFFFF]
          className={`custom-cursor-clickable kaftanFont   flex items-center justify-center  text-[150px]   text-black dark:text-white   lowercase   `}
          style={{ fontSize: "8.95vw" }}
        >
          Yusuf Kaplan.
        </div>
        <div className="relative  flex items-center justify-end pt-[100px] ">
          <Button href="/about" buttonText="ABOUT" />
        </div>
      </div>
      {/* ABOUT  */}
      <div className="w-full h-full grid grid-cols-4 items-center justify-center  px-[75px] py-[75px] " style={{ minHeight: `100svh` }}>
        <div
          className={`custom-cursor-clickable    col-span-4 lg:col-span-2 lg:col-start-2    text-center items-center justify-center uppercase text-[18px] sm:text-[25px]   text-black dark:text-white      `}
        >
          {/* Welcome to my portfolio -  */}
          I&apos;m a Computer Science and AI student at Loughborough University with a strong interest in merging design and functionality. I have experience
          working with businesses and startups, helping to design and develop their online presence from concept to implementation. My expertise lies in using
          modern technologies like Next.js, React, and TypeScript, but I&apos;m also proficient in a variety of other programming languages.
        </div>
      </div>

      {/* SHOWCASE DIVIDER  */}
      <motion.div
        className="showcase w-full h-full flex items-start justify-center  px-[75px] py-[75px] overflow-hidden grayscale   relative     "
        style={{ minHeight: `100svh` }}
      >
        <motion.div
          className=" relative  top-0 transform  flex items-center justify-center uppercase text-[25px] text-black dark:text-white"
          style={{ minHeight: `100vh`, minWidth: `100vw`, scale }}
        >
          <img src="/PRIZE_REVEAL.gif" alt="SHOWCASE" style={{ objectFit: "cover" }} className=" w-full h-full sticky" />
          <div
            className="custom-cursor-clickable kaftanFont absolute top-0 left-0 w-full h-full flex flex-row items-center justify-center lowercase text-[150px] text-black dark:text-white"
            style={{ fontSize: "12.5vw" }}
          >
            {word.map((letter, index) => (
              <AnimatedLetter key={index} letter={letter} index={index} scrollYProgress={scrollYProgress} />
            ))}
          </div>
        </motion.div>
      </motion.div>
      <div className=" w-full h-full hidden lg:flex    " style={{ minHeight: `80svh` }}></div>
      <div className=" w-full h-full flex lg:hidden    " style={{ minHeight: `40svh` }}></div>

      {/* PROJECTS  */}
      <div className=" w-full h-full grid grid-cols-4 items-center justify-center gap-[50px] px-[75px] py-[75px] " style={{ minHeight: `100svh` }}>
        <div className="col-span-4 lg:col-span-2 lg:col-start-2      relative  flex items-center justify-center pb-[100px] ">
          <Button href="/projects" buttonText="PROJECTS" />
        </div>
        <div
          className={`custom-cursor-clickable    col-span-4 lg:col-span-2 lg:col-start-2    text-center items-center justify-center uppercase text-[25px]   text-black dark:text-white      flex flex-col gap-[25px]`}
        >
          {links.map(({ href, title, description }, index) => (
            <div key={index} className=" custom-cursor-clickable outline pb-[10px] ">
              <a href={href} className={`custom-cursor-clickable     `}>
                <h2 className="custom-cursor-clickable ">
                  {title}
                  <span className="custom-cursor-clickable  ">-&gt;</span>
                </h2>
                <p className="custom-cursor-clickable  ">{description}</p>
              </a>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
