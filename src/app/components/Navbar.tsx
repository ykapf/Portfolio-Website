"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  return (
    <>
      <nav
        className={`w-full flex flex-row justify-between items-center py-[28px] font-medium text-3xl  cursor-default    bg-black h-[300px]
        `}
      >
        {/* Navbar content */}

        {/* Middle */}
        <Link className=" cursor-pointer  text-white md:px-[200px]" href="/">
          Yusuf Kaplan
        </Link>
      </nav>
    </>
  );
}
