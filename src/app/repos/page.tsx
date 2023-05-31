import Image from "next/image";
import UserRepos from "./userRepos";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center  p-24">
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
