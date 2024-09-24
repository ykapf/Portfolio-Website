"use client";
import Footer from "./components/Footer";
import Button from "./components/Button";

export default function Home() {
  const links = [
    {
      href: "/projects/media",
      title: "Media",
      description: "Watch Youtube videos without ads.",
    },
    {
      href: "/projects/radio",
      title: "GTA V Radio",
      description: "Listen to GTA V radio stations online.",
    },
  ];

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
        <Footer />
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center headlineFont capitalize ">
          <div className="text-[15vw] -rotate-90 md:text-[8vw] md:rotate-0  mb-4 ">Portfolio</div>
        </div>

        {/* Projects Section */}
        <div
          className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 px-24 lg:px-32 py-24     
        custom-cursor-clickable    col-span-4 lg:col-span-2 lg:col-start-2    text-center items-stretch justify-center uppercase text-[25px]   text-[#f5f0e6]      
        "
        >
          {links.map(({ href, title, description }, index) => (
            <div
              key={index}
              className="group p-6 border border-[#f5f0e6]   custom-cursor-clickable outline pb-[10px] hover:bg-[#f5f0e6]  hover:text-black font-medium  transition ease-in-out duration-200 delay-50"
            >
              <a href={href} className={`custom-cursor-clickable     `}>
                <h2 className="custom-cursor-clickable ">
                  {title}
                  <span className="custom-cursor-clickable  ">-&gt;</span>
                </h2>
                <p className="custom-cursor-clickable  ">{description}</p>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
