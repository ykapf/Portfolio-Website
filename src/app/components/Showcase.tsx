import React, { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

interface ShowcaseProps {
  scrollYProgress: any;
  variant: "default" | "delayed";
}

const Showcase: React.FC<ShowcaseProps> = ({ scrollYProgress, variant }) => {
  const scale =
    variant === "default" ? useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]) : useTransform(scrollYProgress, [0, 0.17, 0.45, 1], [0.6, 0.6, 1, 1]);

  useEffect(() => {
    // Create the timeline for the animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".showcase", // Class of the element to trigger the animation
        start: "center center", // When the top of the trigger hits the center of the viewport
        end: `bottom center`, // When the bottom of the trigger hits the center of the viewport
        scrub: true, // Smooth scrubbing, true for 1 second of scrubbing (change this value for more "stickiness")
        pin: true, // Pin the element in place while the animation is active
        pinSpacing: false, // No spacing while pinned
        markers: true, // Shows start and end markers, useful for debugging
      },
    });

    // Cleanup function
    return () => {
      // Kill the timeline on component unmount
      tl.kill();
    };
  }, []);

  return (
    <motion.div className="showcase w-full h-full flex items-start justify-center px-[75px]  overflow-hidden grayscale relative   ">
      <motion.div
        className="relative top-0 transform flex items-center justify-center uppercase text-[25px] text-black dark:text-white"
        style={{ minWidth: `100vw`, scale }}
      >
        <img src="/PRIZE_REVEAL.gif" alt="SHOWCASE" style={{ objectFit: "cover" }} className="w-full h-full " />
      </motion.div>
    </motion.div>
  );
};

export default Showcase;
