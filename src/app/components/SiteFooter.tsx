"use client";

import Link from "next/link";

const GITHUB_URL = "https://github.com/ykapf";
const LINKEDIN_URL = "https://www.linkedin.com/in/yusuf-deniz-k-523a741b7/";

const SITEMAP: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: "Projects",
    links: [
      { label: "Media", href: "/projects/media" },
      { label: "GTA V Radio", href: "/projects/radio" },
    ],
  },
  {
    heading: "Elsewhere",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "LinkedIn", href: LINKEDIN_URL, external: true },
    ],
  },
];

const linkClass = "custom-cursor-clickable text-[#f5f0e6]/70 transition-colors duration-150 hover:text-[#f5f0e6] hover:underline";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 w-full bg-black text-[#f5f0e6]">
      <div className="border-t border-[#f5f0e6]/20 px-6 pt-16 md:px-12 lg:px-24">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          <div className="col-span-2">
            <p className="headlineFont text-6xl leading-none md:text-7xl">YKAPF</p>
            <p className="mt-4 max-w-[16rem] text-sm font-light uppercase tracking-[0.2em] text-[#f5f0e6]/50">
              Yusuf Kaplan — London, England
            </p>
          </div>
          {SITEMAP.map(({ heading, links }) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="mb-5 text-xs uppercase tracking-[0.3em] text-[#f5f0e6]/40">{heading}</h2>
              <ul className="space-y-3 text-lg font-light uppercase">
                {links.map(({ label, href, external }) => (
                  <li key={label}>
                    {external ? (
                      <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
                        {label} ↗
                      </a>
                    ) : (
                      <Link className={linkClass} href={href}>
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[#f5f0e6]/10 py-8 text-xs uppercase tracking-[0.2em] text-[#f5f0e6]/40 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Yusuf Kaplan</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="custom-cursor-clickable self-start uppercase tracking-[0.2em] transition-colors duration-150 hover:text-[#f5f0e6] md:self-auto"
          >
            Back to the start ↑
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="radio-clearance" />
    </footer>
  );
}
