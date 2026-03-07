"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const getSuggestedFilename = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathname[pathname.length - 1];
    if (!lastSegment) return "download";
    return decodeURIComponent(lastSegment);
  } catch {
    return "download";
  }
};

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string>("");
  const [downloadPhase, setDownloadPhase] = useState<"idle" | "loading" | "done">("idle");
  const [buttonProgress, setButtonProgress] = useState(0);
  const [hasDownloadedOnce, setHasDownloadedOnce] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestedName = useMemo(() => getSuggestedFilename(url), [url]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const clearUiTimers = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  const startLoadingUi = () => {
    clearUiTimers();
    setDownloadPhase("loading");
    setButtonProgress(8);
    progressIntervalRef.current = setInterval(() => {
      setButtonProgress((prev) => {
        if (prev >= 85) return prev;
        const increment = Math.max(1.5, (90 - prev) * 0.08);
        return Math.min(85, prev + increment);
      });
    }, 220);
  };

  const finishLoadingUi = () => {
    clearUiTimers();
    setButtonProgress(100);
    setDownloadPhase("done");
    setHasDownloadedOnce(true);
    resetTimeoutRef.current = setTimeout(() => {
      setDownloadPhase("idle");
      setButtonProgress(0);
    }, 5000);
  };

  const resetUiAfterError = () => {
    clearUiTimers();
    setDownloadPhase("idle");
    setButtonProgress(0);
  };

  const handleDownload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        setError("Only http and https URLs are supported.");
        return;
      }
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    startLoadingUi();

    try {
      const response = await fetch(parsedUrl.toString(), { method: "GET" });
      if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status}).`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = customName.trim() || suggestedName;

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      finishLoadingUi();
    } catch (downloadError) {
      resetUiAfterError();
      if (downloadError instanceof Error) {
        setError(downloadError.message);
      } else {
        setError("Could not download this URL. The source may block cross-origin requests.");
      }
    } finally {
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen text-[#f5f0e6]">
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 md:grid-cols-4 h-full w-full border-l border-r border-gray-300 opacity-30 z-0">
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
      </div>

      <div className="relative z-10">
        <nav className="w-full flex flex-row justify-between items-center py-[50px] font-light text-xl md:text-3xl cursor-none h-auto">
          <Link className="custom-cursor-clickable text-[#f5f0e6] cursor-none w-1/2 md:w-1/4 text-center" href="/">
            &lt;-BACK
          </Link>
          <div className="text-[#f5f0e6] cursor-none w-1/2 md:w-1/4 text-center">[DOWNLOADER]</div>
        </nav>

        <div className="flex flex-col w-full min-h-[72vh] justify-center items-center px-6">
          <div className="w-full max-w-2xl p-6 md:p-8 bg-black/20">
            <h1 className="uppercase text-3xl md:text-5xl font-light text-center">Downloader</h1>
            <p className="pt-4 text-base md:text-lg text-center">Paste a direct file URL and download it to your device.</p>

            <form onSubmit={handleDownload} className="pt-8 flex flex-col gap-4">
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste direct file URL"
                className="items-center text-center border border-[#f5f0e6] custom-cursor-clickable outline pb-[10px]
                hover:bg-[#f5f0e6] focus:bg-[#f5f0e6] text-[#f5f0e6] hover:text-black focus:text-black font-medium text-sm md:text-xl transition ease-in-out duration-200 delay-50
                placeholder:text-[#f5f0e6] hover:placeholder:text-black focus:placeholder:text-black placeholder:uppercase placeholder:font-medium placeholder:text-sm md:placeholder:text-xl placeholder:transition placeholder:ease-in-out placeholder:duration-200 placeholder:delay-50
                my-1 p-2 bg-black w-full rounded-none outline-none"
                onClick={(e) => e.currentTarget.select()}
              />

              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="RENAME (OPTIONAL)"
                className="w-full p-3 bg-transparent border border-[#f5f0e6] text-[#f5f0e6] outline-none font-medium text-sm md:text-xl
                  placeholder:font-medium placeholder:text-sm md:placeholder:text-xl"
              />

              <button
                type="submit"
                disabled={downloadPhase !== "idle"}
                className={`custom-cursor-clickable relative overflow-hidden border p-3 uppercase font-bold text-sm md:text-xl transition ease-in-out duration-200 ${
                  downloadPhase === "idle"
                    ? "border-[#f5f0e6] bg-[#f5f0e6] text-black hover:bg-black hover:text-[#f5f0e6]"
                    : downloadPhase === "loading"
                      ? "border-[#f5f0e6] bg-black text-white cursor-not-allowed"
                      : "border-[#f5f0e6] bg-[#f5f0e6] text-black cursor-not-allowed"
                }`}
              >
                {downloadPhase === "loading" ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-white transition-all duration-200 ease-out"
                      style={{ width: `${buttonProgress}%` }}
                    />
                    <span className="relative z-10 text-white mix-blend-difference">Downloading...</span>
                  </>
                ) : downloadPhase === "done" ? (
                  "Downloaded"
                ) : hasDownloadedOnce ? (
                  "Download again"
                ) : (
                  "Download"
                )}
              </button>
            </form>

            {error ? <p className="pt-4 text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
