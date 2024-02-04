"use client";
import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [cursorSize, setCursorSize] = useState(32);
  const controls = useAnimation();

  useEffect(() => {
    const mouseMove = (e: any) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
      setIsVisible(true);

      if (e.target.classList.contains("custom-cursor-clickable")) {
        controls.start("hovered");
      } else {
        controls.start("default");
      }
    };

    const mouseOut = () => {
      setIsVisible(false);
      controls.start("default");
    };

    const handleClick = () => {
      controls.start({ scale: 0.6 }).then(() => {
        controls.start("default");
      });
    };

    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseout", mouseOut);
    document.addEventListener("click", handleClick);

    const handleScroll = () => {
      setMousePosition((prevPosition) => ({
        ...prevPosition,
      }));
      setIsVisible(true);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseout", mouseOut);
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [controls]);

  const cursorVariants = {
    default: { scale: 1, height: 32, width: 32 },
    hovered: { scale: 1.5 },
    clicked: { scale: 0.75 },
  };

  return (
    <motion.div
      className="cursor-none "
      style={{
        left: `${mousePosition.x - cursorSize / 2}px`,
        top: `${mousePosition.y - cursorSize / 2}px`,
        height: `${cursorSize}px`,
        width: `${cursorSize}px`,
        borderRadius: "50%",
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        visibility: isVisible ? "visible" : "hidden",
        WebkitBackdropFilter: "invert(1)",
        backdropFilter: "invert(1)",
        boxSizing: "border-box",
        transition: "opacity 0.15s ease-in-out",
        opacity: isVisible ? 1 : 0,
        // filter: "blur(6px)",
        cursor: "none",
        transform: "translate(-50%, -50%)",
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
        when: "afterchildren",
      }}
      initial="default"
      animate={controls}
      variants={cursorVariants}
    >
      <div className="w-full h-full cursor-none" />
      {/* <img src="/cursors/toup.png" alt="Custom Cursor" style={{ maxWidth: "100%", maxHeight: "100%" }} className="hidden md:block" />          left: `${mousePosition.x - 12}px`, top: `${mousePosition.y - 4}px`, */}
    </motion.div>
  );
}
