"use client";
import Footer from "@/app/components/Footer";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";

export default function Projects() {
  return (
    // bg-[rgb(235,229,210)] dark:bg-[#0000FE]
    <main className="flex min-h-screen  flex-col    bg-white dark:bg-black       -z-50     overflow-y-auto    grayscale">
      {/* <Navbar /> */}

      <Footer />
    </main>
  );
}
