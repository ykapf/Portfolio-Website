import Head from "next/head";
import YouTubePlayer from "./YouTubePlayer";
import Footer from "@/app/components/Footer";
import Link from "next/link";

const videoId = "videoseries?list=PLRH7Kv1Vr04TF6cUlx6f-_Vgn3UIVyZFh";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen  text-[#f5f0e6]">
      {/* Vertical Grid Background */}
      <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 h-full w-full border-l border-r border-gray-300 opacity-30 z-0">
        {/* Adding borders to create vertical grid outlines */}
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
        <div className="border-r border-gray-300" />
        {/* Last column doesn't need a right border */}
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Footer */}
        <nav
          className={` w-full flex flex-row justify-between items-center py-[50px] font-light text-xl md:text-3xl  cursor-none     h-auto 
        `}
        >
          {/* Footer content */}
          <Link className="custom-cursor-clickable    text-[#f5f0e6] cursor-none  w-1/2 md:w-1/4  text-center" href="/">
            &lt;-BACK
          </Link>
          {/* Middle */}
          <div className="   text-[#f5f0e6] cursor-none  w-1/2 md:w-1/4  text-center">[MEDIA VIEWER]</div>
        </nav>
        {/* Footer */}
        <div className="flex flex-col w-screen h-[85vh]   justify-center items-center overflow-y-auto overflow-x-hidden ">
          <div className=" w-full h-1/2 md:h-full ">
            <div className="flex flex-col justify-center items-center w-full h-full p-4 ">
              <div className="w-full h-full flex justify-center items-center ">
                <YouTubePlayer />
              </div>
              <div className="w-full h-fit flex justify-center items-center p-4 "></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
