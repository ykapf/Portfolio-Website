"use client";

import { FormEvent, useState } from "react";
import { TbGitFork } from "react-icons/tb";
import { VscIssues, VscRepo } from "react-icons/vsc";
import { BsStar } from "react-icons/bs";
import { BiGroup } from "react-icons/bi";

interface Repo {
  id: number;
  name: string;
  created_at: string;
  stargazers_count: number;
  description: string;
  language: string;
  forks_count: number;
  open_issues_count: number;
}

interface User {
  login: string;
  avatar_url: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  public_repos: number;
}

function UserRepos() {
  const [inputUsername, setInputUsername] = useState("koolskateguy89");
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const responseUser = await fetch(`https://api.github.com/users/${inputUsername}`);

    if (responseUser.ok) {
      const userDetails: User = await responseUser.json();
      setUser(userDetails);
      setUsername(inputUsername);

      const responseRepos = await fetch(`https://api.github.com/users/${inputUsername}/repos`);

      if (responseRepos.ok) {
        const repositories: Repo[] = await responseRepos.json();
        setRepos(repositories);
      } else {
        console.error("Response not okay for repos");
      }
    } else {
      console.error("Response not okay for user");
    }
  };

  return (
    <div className=" w-full flex flex-row ">
      <div className="w-full flex flex-col ">
        <form className="w-full items-center justify-between flex flex-row mb-10" onSubmit={handleSubmit}>
          <input
            type="text"
            className=" p-2 border border-gray-300 dark:bg-black opacity-75 hover:opacity-100 delay-75 duration-300 w-full rounded-md"
            placeholder="GitHub username..."
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />

          <button
            type="submit"
            className="ml-3 p-2 px-4 border border-blue-700 bg-blue-700 hover:border-blue-800 hover:bg-blue-800 delay-75 duration-300 w-fit rounded-md"
          >
            Search
          </button>
        </form>

        <div className="w-full flex flex-col items-end rounded-lg">
          {repos.length > 0 && (
            <ul className="w-full flex flex-col justify-between rounded-lg ">
              {repos.map((repo) => (
                <a
                  key={repo.id}
                  className="justify-between flex flex-row cursor-hover my-1 p-4 hover:bg-[#f1f1f1] hover:dark:bg-[#161B22] delay-75 duration-300 rounded-md"
                  href={`https://github.com/${username}/${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="flex flex-col ">
                    <a className="opacity-75 hover:opacity-100 hover:underline text-lg font-bold text-blue-500 delay-75 duration-300">{repo.name}</a>
                    <p className="opacity-50 text-sm pt-2">{repo.description}</p>
                    <div className="flex flex-row items-center pt-2">
                      {repo.language && (
                        <div className="flex flex-row items-center">
                          <div className="text-xs w-2 h-2 mr-1 rounded-full bg-red-500"> </div>
                          <span className="text-xs opacity-50 pr-4">{repo.language}</span>
                        </div>
                      )}
                      {repo.stargazers_count > 0 && (
                        <div className="flex flex-row items-center pr-4">
                          <span className="text-sm  px-1 opacity-50">
                            <BsStar />
                          </span>
                          <span className="text-xs opacity-50 ">{repo.stargazers_count}</span>
                        </div>
                      )}
                      <div className="flex flex-row items-center">
                        <span className="text-sm px-1 opacity-50">
                          <TbGitFork />
                        </span>
                        <span className="text-xs opacity-50 pr-4">{repo.forks_count}</span>
                      </div>

                      <div className="flex flex-row items-center">
                        <span className="text-sm px-1 opacity-50">
                          <VscIssues />
                        </span>
                        <span className="text-xs opacity-50 pr-4">{repo.open_issues_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs opacity-50 w-fit pl-10 ">{new Date(repo.created_at).toLocaleDateString()}</div>
                </a>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-1/2 h-fit flex justify-center items-center mx-10 sticky top-6">
        {user && (
          <div className="flex flex-col justify-center  w-fit p-8 rounded-xl  bg-[#f1f1f1] dark:bg-[#161B22]">
            <img src={user.avatar_url} alt={user.login} width={250} height={250} className="rounded-full mb-4" />

            <a
              href={`https://github.com/${username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-bold hover:underline delay-75 duration-300"
            >
              {user.name}
            </a>
            <h1 className="opacity-75">@{user.login}</h1>

            <p>{user.bio}</p>
            <div className="flex flex-row items-end">
              <span className="text-md px-1 opacity-50">
                <BiGroup />
              </span>
              <span className="text-sm pt-1 pr-1">{user.followers}</span>
              <p className="opacity-50 text-xs  mr-2">followers </p>
              <span className="text-sm pt-1 pr-1">{user.following}</span>
              <p className="opacity-50 text-xs  mr-2">following </p>
            </div>
            <div className="flex flex-row items-end">
              <span className="text-md px-1 opacity-50">
                <VscRepo />
              </span>
              <p className="opacity-50 text-sm pt-2">public repos: </p>
              <span className="text-sm pt-1 pl-1"> {user.public_repos}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserRepos;
