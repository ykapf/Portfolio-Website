import Image from "next/image";
import UserRepos from "./userRepos";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center  p-24  bg-black">
      <div className="px-4 py-8 fixed w-full z-20 top-0 left-0 ">
        <div className="container flex flex-wrap items-center justify-between mx-auto">
          <a href="/" className="flex group rounded-lg px-5 ">
            <h2 className="mb-3 text-xl font-semibold">
              <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
              Back
            </h2>
          </a>
          <h1 className="mb-2 text-3xl font-bold hover:scale-[97%] transition ease-in-out delay-75 duration-300 cursor-default">Repo Viewer</h1>
          <div className="flex group rounded-lg px-5 ">
            <h2 className="mb-3 text-xl font-semibold opacity-0 cursor-default">
              <span className="inline-block transition-transform group-hover:-translate-x-1 motion-reduce:transform-none mr-1">&lt;-</span>
              Back
            </h2>
          </div>
        </div>
      </div>
      <div className="my-28 w-full h-1/2 md:h-full">
        <div className="flex flex-col  w-full h-full p-4 items-center justify-between">
          <div className="w-full h-full flex  items-center justify-between pl-20 py-4 text-xl">Enter a github username:</div>

          <div className="w-full h-full flex  items-center justify-between pl-20">
            <UserRepos />
          </div>
          <div className="w-full h-fit flex justify-center items-center p-4 "></div>
        </div>
      </div>
    </main>
  );
}
