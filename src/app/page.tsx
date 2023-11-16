import Image from "next/image";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function Home() {
  const links = [
    {
      href: "/media",
      title: "Media",
      description: "Check out my embedded media viewer page using YouTube's embed API.",
    },
    {
      href: "/repos",
      title: "Repos",
      description: "View any GitHub user's repositories and account details using GitHub's API.",
    },
    {
      href: "https://gtav-radio.vercel.app/",
      title: "GTA V Radio",
      description: "Web app developed to listen to GTA V radio stations online.",
    },
    {
      href: "/",
      title: "Templates",
      description: "This is a placeholder for future, featured projects.",
    },
  ];

  return (
    <main className="flex min-h-screen  flex-col    bg-[#EBE5D2] dark:bg-[#492201] -z-50">
      {/* <Navbar /> */}
      <div className="w-full h-full  flex flex-col items-center justify-center      px-[75px] pt-[75px] min-h-screen ">
        <div className="kaftanFont   absolute top-[50px] left-50 flex items-center justify-center  text-[400px] text-[#ffffff] dark:text-[#633200] transform scale-y-125 blur-[6px]">
          portfolio
        </div>
        <div className="kaftanFont   flex items-center justify-center  text-[150px]  lowercase text-[#0000FE] z-10 ">Yusuf Kaplan.</div>

        {/* <div className=" mb-2 text-2xl opacity-50 font-bold  text-center">
          Welcome to my Portfolio
        </div> */}
      </div>
      <div className=" px-[175px] pb-[100px] grid text-center lg:mb-0 lg:grid-cols-4 lg:text-left">
        {links.map(({ href, title, description }, index) => (
          <a
            key={index}
            href={href}
            className={`group rounded-md border border-transparent px-5 py-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-300/20 delay-50 `}
          >
            <h2 className="mb-[6px] text-2xl font-base  text-[#fe8f50] uppercase   transform scale-y-[1.1]">
              {title}{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none duration-500 transform scale-y-[0.7]">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50 ">{description}</p>
          </a>
        ))}
      </div>
      <Footer />
    </main>
  );
}
