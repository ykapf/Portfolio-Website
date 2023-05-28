import Head from "next/head";

const videoId = "videoseries?list=PLRH7Kv1Vr04TF6cUlx6f-_Vgn3UIVyZFh";

export default function Home() {
  const videoSrc = `https://www.youtube.com/embed/${videoId}&loop=1&iv_load_policy=3&color=white&controls=1&modestbranding=1&playsinline=1`;

  return (
    <>
      <div className="flex flex-col w-screen h-screen justify-center items-center overflow-y-auto overflow-x-hidden ">
        <nav className="px-4 py-8 fixed w-full z-20 top-0 left-0 ">
          <div className="container flex flex-wrap items-center justify-between mx-auto">
            <a href="/" className="flex group rounded-lg px-5 ">
              <h2 className="mb-3 text-xl font-semibold">
                <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
                Back
              </h2>
            </a>
            <div className="mb-2 text-3xl font-bold hover:scale-[97%] transition ease-in-out delay-75 duration-300 cursor-default">Embeded Media Viewer</div>
            <div className="flex group rounded-lg px-5 ">
              <h2 className="mb-3 text-xl font-semibold opacity-0 cursor-default">
                <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
                Back
              </h2>
            </div>
          </div>
        </nav>
        <div className="my-28 w-full h-full">
          <div className="flex flex-col justify-center items-center w-full h-full p-4 ">
            <div className="w-full h-full flex justify-center items-center ">
              <iframe
                className=" w-full h-fit md:w-fit md:h-full border-0 aspect-video"
                src={videoSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="w-full h-fit flex justify-center items-center p-8 ">enter search box or whatever</div>
          </div>
        </div>
      </div>
    </>
  );
}
