import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";
import css from "styled-jsx/css";

gsap.registerPlugin(ScrollTrigger);

interface ShowcaseProps {
  scrollYProgress: any;
  variant: "default" | "delayed";
  pSrc: string;
}

interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

const Showcase: React.FC<ShowcaseProps> = ({ scrollYProgress, variant, pSrc }) => {
  // Define both scale transforms
  const scaleDefault = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]);
  const scaleDelayed = useTransform(scrollYProgress, [0, 0.17, 0.45, 1], [0.6, 0.6, 1, 1]);

  // Choose the scale based on the variant
  const scale = variant === "default" ? scaleDefault : scaleDelayed;

  // State to keep track of the window size
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : undefined,
    height: typeof window !== "undefined" ? window.innerHeight : undefined,
  });

  // Handler to call on window resize
  const handleResize = () => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  useEffect(() => {
    // Set size at the first client-side load
    handleResize();

    window.addEventListener("resize", handleResize);
    // Create the timeline for the animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".showcase", // Class of the element to trigger the animation
        start: "center center", // When the top of the trigger hits the center of the viewport
        end: `bottom center`, // When the bottom of the trigger hits the center of the viewport
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

  // Calculate the aspect ratios
  const screenAspectRatio = windowSize.width && windowSize.height ? windowSize.width / windowSize.height : undefined;
  const targetAspectRatio = 488 / 276;

  // Decide image style based on aspect ratio comparison
  const isWider = screenAspectRatio && screenAspectRatio > targetAspectRatio;
  const imageStyle = isWider
    ? { width: "100vw", height: "100vh" } // Screen is wider
    : { width: "100vw", height: "100vh" };

  // Define a className for overflow handling
  const overflowClassName = css`
    ${isWider ? "overflow-x-hidden" : "overflow-y-hidden"};
  `;

  return (
    <motion.div className={`showcase w-full h-full flex items-start justify-center  overflow-hidden grayscale  ${overflowClassName} `}>
      <motion.div
        className={` transform flex items-center justify-center uppercase text-[25px] text-black dark:text-white ${
          screenAspectRatio && screenAspectRatio > targetAspectRatio ? "overflowX-hidden" : "overflowY-hidden"
        }`}
        style={{ ...imageStyle, scale: scale }}
      >
        <Image src={pSrc} alt="SHOWCASE" style={{ objectFit: "cover" }} width={100} height={100} className="w-full h-full " />
      </motion.div>
    </motion.div>
  );
};

export default Showcase;
