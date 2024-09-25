"use client";

import React, { useState, useEffect, useRef } from "react";

// helper function for debouncing
const debounce = (fn: (...args: any[]) => void, ms: number) => {
  let timer: NodeJS.Timeout | null;
  return (...args: any[]) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, ms);
  };
};

const YouTubePlayer: React.FC = () => {
  const defaultVideoId = "videoseries?list=PLRH7Kv1Vr04TF6cUlx6f-_Vgn3UIVyZFh";
  const [videoSrc, setVideoSrc] = useState(
    `https://www.youtube.com/embed/${defaultVideoId}&loop=1&iv_load_policy=3&controls=1&modestbranding=1&playsinline=1&color=white`
  );

  const [inputValue, setInputValue] = useState("");
  const debouncedChange = useRef(debounce(handleInputChange, 1250));

  useEffect(() => {
    debouncedChange.current(inputValue);
  }, [inputValue]);

  function handleInputChange(urlString: string) {
    // if urlString is empty, don't do anything
    if (!urlString.trim()) {
      return;
    }

    try {
      const url = new URL(urlString);
      let newVideoId: string | null = null;

      // Ensure that the URL is a YouTube URL
      if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "m.youtube.com") {
        const vParam = url.searchParams.get("v");
        const listParam = url.searchParams.get("list");

        if (vParam && listParam) {
          newVideoId = `${vParam}?list=${listParam}&loop=1&iv_load_policy=3&controls=1&modestbranding=1&playsinline=1&color=white&autoplay=1`;
        } else if (vParam) {
          newVideoId = `${vParam}?loop=1&iv_load_policy=3&controls=1&modestbranding=1&playsinline=1&color=white&autoplay=1`;
        } else if (listParam) {
          newVideoId = `videoseries?list=${listParam}&loop=1&iv_load_policy=3&controls=1&modestbranding=1&playsinline=1&color=white&autoplay=1`;
        } else {
          throw new Error("URL does not contain a video or playlist ID");
        }
      } else if (url.hostname === "youtu.be") {
        newVideoId = url.pathname.slice(1); // remove the leading "/"
        newVideoId = `${newVideoId}?loop=1&iv_load_policy=3&controls=1&modestbranding=1&playsinline=1&color=white&autoplay=1`;
      } else {
        throw new Error("URL is not a YouTube URL");
      }

      if (newVideoId) {
        const newVideoSrc = `https://www.youtube.com/embed/${newVideoId}`;
        setVideoSrc(newVideoSrc);
      } else {
        throw new Error("URL does not contain a video or playlist ID");
      }
    } catch (error) {
      if (error instanceof Error) {
        // Only alert the message if error is an instance of Error
        alert(`Error: ${error.message}`);
      } else {
        // Otherwise, it's an unknown error type and we should handle it accordingly
        alert("An unknown error occurred");
      }
    }
  }

  return (
    <div
      className=" h-full   
  
  w-full flex flex-col gap-12 px-24 lg:px-32 py-24     
           text-center items-center justify-center uppercase text-[25px]   text-[#f5f0e6]      
      
      "
    >
      <iframe
        className="w-full h-fit md:w-fit md:h-full border-0 aspect-video "
        src={videoSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />

      <input
        type="text"
        placeholder="Paste YouTube video or playlist URL"
        className=" items-center text-center  border border-[#f5f0e6]   custom-cursor-clickable outline pb-[10px] 
        
        hover:bg-[#f5f0e6] focus:bg-[#f5f0e6] text-[#f5f0e6] hover:text-black focus:text-black font-medium text-sm md:text-xl  transition ease-in-out duration-200 delay-50
              placeholder:text-[#f5f0e6] hover:placeholder:text-black focus:placeholder:text-black placeholder:uppercase placeholder:font-medium placeholder:text-sm md:placeholder:text-xl placeholder:transition placeholder:ease-in-out placeholder:duration-200 placeholder:delay-50
        my-7 mx-12 p-2  bg-black   w-full md:w-1/2 rounded-none outline-none   "
        onChange={(e) => setInputValue(e.target.value)}
        onClick={(e) => e.currentTarget.select()}
      />
    </div>
  );
};

export default YouTubePlayer;
