"use client";
import Footer from "./components/Footer";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";
import Button from "./components/Button";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Showcase from "./components/Showcase";

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
      href: "/projects/media",
      title: "Media",
      description: "Check out my embedded media viewer page using YouTube's embed API.",
    },
    {
      href: "/repos",
      title: "Repos",
      description: "View any GitHub user's repositories and account details using GitHub's API.",
    },
    {
      // href: "https://gtav-radio.vercel.app/",
      href: "/projects/radio",
      title: "GTA V Radio",
      description: "Web app developed to listen to GTA V radio stations online.",
    },
  ];

  const { scrollYProgress } = useScroll();
  // const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 1]);
  const word = "EXPERIENCE.".split("");

  return (
    <div className="flex min-h-screen  flex-col    bg-white dark:bg-black       -z-50     overflow-y-auto    ">
      {/* HERO  */}
      <div className="w-full h-full  flex flex-col items-center justify-center gap-[50px]     px-[75px] py-[75px]   " style={{ minHeight: `100svh` }}>
        {/* <div
          className={`kaftanFont   absolute top-50  origin-center flex items-center justify-center     -translate-y-[25%]    text-[#F0F0F0] dark:text-[#0F0F0F]          -z-[10] transform scale-y-125 blur-[6px]`}
          style={{ fontSize: "23.75vw" }}
        >
          portfolio
        </div> */}

        <div
          className={`custom-cursor-clickable kaftanFont   flex items-center justify-center  text-[150px]   text-black dark:text-white   lowercase   `}
          style={{ fontSize: "9.5vw" }}
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
          <div className="custom-cursor-clickable   text-[22px] sm:text-[35px] pb-[15px]">
            {" "}
            I&apos;m a Computer Science and AI student at Loughborough University.
          </div>
          <span className="custom-cursor-clickable  ">
            {" "}
            I have experience working with businesses and startups, helping to design and develop their online presence from concept to implementation.
          </span>
          {/* with a strong interest in merging design and functionality.  */}
          {/* My expertise lies in using modern technologies like Next.js, React, and TypeScript, but */}
          {/* I&apos;m also proficient in a variety of other programming languages. */}
        </div>
      </div>

      {/* SHOWCASE TILE  */}
      <motion.div
        className="showcase w-full h-full flex items-start justify-center  px-[75px] py-[75px] overflow-hidden grayscale   relative     "
        style={{ minHeight: `100svh` }}
      >
        <motion.div
          className=" relative  top-0 transform  flex items-center justify-center uppercase text-[25px] text-black dark:text-white"
          style={{ minHeight: `100vh`, minWidth: `100vw` }}
        >
          <Showcase scrollYProgress={scrollYProgress} variant="default" pSrc="/PRIZE_REVEAL.gif" />
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
      {/* SHOWCASE DIVIDER  */}
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
            <div
              key={index}
              className=" custom-cursor-clickable outline pb-[10px] hover:bg-black dark:hover:bg-white hover:text-white hover:dark:text-black font-medium  transition ease-in-out duration-200 delay-50"
            >
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
