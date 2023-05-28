import Head from "next/head";
import YouTubePlayer from "./YouTubePlayer";

const videoId = "videoseries?list=PLRH7Kv1Vr04TF6cUlx6f-_Vgn3UIVyZFh";

export default function Home() {
  const videoSrc = `https://www.youtube.com/embed/${videoId}&loop=1&iv_load_policy=3&color=white&controls=1&modestbranding=1&playsinline=1`;

  return (
    <>
      <div className="flex flex-col w-screen h-screen justify-center items-center overflow-y-auto overflow-x-hidden ">
        <div className="px-4 py-8 fixed w-full z-20 top-0 left-0 ">
          <div className="container flex flex-wrap items-center justify-between mx-auto">
            <a href="/" className="flex group rounded-lg px-5 ">
              <h2 className="mb-3 text-xl font-semibold">
                <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
                Back
              </h2>
            </a>
            <h1 className="mb-2 text-3xl font-bold hover:scale-[97%] transition ease-in-out delay-75 duration-300 cursor-default">Media Viewer</h1>
            <div className="flex group rounded-lg px-5 ">
              <h2 className="mb-3 text-xl font-semibold opacity-0 cursor-default">
                <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
                Back
              </h2>
            </div>
          </div>
        </div>
        <div className="my-28 w-full h-2/3 md:h-full">
          <div className="flex flex-col justify-center items-center w-full h-full p-4 ">
            <div className="w-full h-full flex justify-center items-center ">
              <YouTubePlayer />
            </div>
            <div className="w-full h-fit flex justify-center items-center p-4 "></div>
          </div>
        </div>
      </div>
    </>
  );
}
