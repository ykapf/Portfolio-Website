"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  return (
    <>
      <div className="w-fit flex flex-col px-[28px]">
        <nav
          className={`w-fit flex flex-row justify-start items-center  p-[28px] pb-[14px] font-medium text-3xl  z-50 gap-7 text-[#0000FE] dark:text-[#ffdb9c]
        `}
        >
          <Link className="    " href="/">
            about
          </Link>
          <Link className="    " href="/">
            skills
          </Link>
          <Link className="    " href="/">
            projects
          </Link>
          <Link className="    " href="/">
            contact
          </Link>
        </nav>
        <div className="w-full h-[2px] bg-[#0000FE] dark:bg-[#ffdb9c] mx-[14px]"></div>
      </div>
    </>
  );
}
