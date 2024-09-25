"use client";

import React, { useState, useEffect, CSSProperties, useRef } from "react";
import Papa from "papaparse";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

type Station = {
  name: string;
  description: string;
  image: string;
  link: string;
  type: "v" | "p"; // New field to distinguish between video and playlist
  playlistId?: string; // New field to store playlist ID
};

type RadioWheelProps = {};

export default function RadioWheel({}: RadioWheelProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const wheelRadius = 40; // radius of the wheel in vw

  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const [volume, setVolume] = useState(100); // Volume state
  const [tempVolume, setTempVolume] = useState(100); // Temporary volume state

  const [currentSong, setCurrentSong] = useState("");

  useEffect(() => {
    // Load the YouTube IFrame Player API if not already loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        playerRef.current = new window.YT.Player("youtube-player", {
          width: "01",
          height: "01",
          videoId: "", // Default video ID, can be a placeholder
          startSeconds: 0, // gonna be useful if i want to add random start times.===
          events: {
            onReady: () => setPlayerReady(true),
          },
          playerVars: {
            playsinline: 1,
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            loop: 1,
            playlist: "", // Same as videoId for looping
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; allowfullscreen; loop;",
          },
        });
      };
    }
  }, []);

  // Function to handle volume changes from the slider
  const handleVolumeChange = (newVolume: any) => {
    newVolume = parseInt(newVolume); // Ensure newVolume is an integer
    setVolume(newVolume);

    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(newVolume);
    }

    // Mute if volume is 0, otherwise, store the current volume as tempVolume
    if (newVolume === 0) {
      handleMute();
    } else {
      setTempVolume(newVolume);
    }
  };

  // Function to handle mute
  const handleMute = () => {
    if (volume > 0) {
      setTempVolume(volume);
    }
    setVolume(0);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(0);
    }
  };

  // Function to handle unmute
  const handleUnmute = () => {
    const newVolume = Math.max(tempVolume, 10); // Use tempVolume or 10, whichever is greater
    setVolume(newVolume);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const loadVideo = (station: Station) => {
    setSelectedStation(station);
    if (playerReady && playerRef.current) {
      if (station.type === "v") {
        // Load the video to get the duration
        playerRef.current.cueVideoById(station.link);

        setTimeout(() => {
          const duration = playerRef.current.getDuration();
          const randomStart = Math.floor(Math.random() * duration);
          playerRef.current.loadVideoById({ videoId: station.link, startSeconds: randomStart });
        }, 500); // Wait for 1 second to ensure video data is loaded
      } else if (station.type === "p" && station.playlistId) {
        // Load and shuffle the playlist
        playerRef.current.loadPlaylist({
          listType: "playlist",
          list: station.playlistId,
        });
        playerRef.current.setShuffle(true);
        playerRef.current.mute(); // Mute the playlist initially

        setTimeout(() => {
          const playlistSize = playerRef.current.getPlaylist().length;
          const randomIndex = Math.floor(Math.random() * playlistSize);
          playerRef.current.playVideoAt(randomIndex);
          setTimeout(() => {
            const duration = playerRef.current.getDuration();
            const randomStart = Math.floor(Math.random() * duration);
            playerRef.current.seekTo(randomStart);
            playerRef.current.unMute(); // Unmute
          }, 550);
        }, 500); // Wait for the playlist to be loaded and shuffled
      }
    }
  };

  useEffect(() => {
    async function fetchStations() {
      const response = await fetch("/radio/radio_list.csv");
      if (!response.body) {
        throw new Error("Response body is null");
      }
      const reader = response.body.getReader();
      const result = await reader.read();
      const decoder = new TextDecoder("utf-8");
      const csv = decoder.decode(result.value);
      const parsedData = Papa.parse(csv, { header: true }).data as Station[];
      setStations(parsedData);
    }

    fetchStations();
  }, []);

  return (
    <div className={`  flex items-center  h-full  `}>
      <style>
        {`
          @media screen and (max-height: 700px || max-width: 700px)  {
            .height-mobile {
              display: block;
            }
            .height-desktop {
              display: none;
            }
          }

          @media screen and (min-height: 701px || min-width: 701px) {
            .height-mobile {
              display: none;
            }
            .height-desktop {
              display: block;
            }
          }
        `}
      </style>
      {/* Mobile Now Playing Bar */}
      <div
        className="height-mobile md:hidden fixed bottom-0 left-0 w-full h-[100px] bg-black text-white flex items-center justify-center z-10
      border-t border-[#f5f0e6]"
      >
        {selectedStation && (
          <div className="flex flex-row justify-start items-center w-full px-[25px]">
            <img
              src={`/radio/radio_icons/${selectedStation.image}`}
              alt={selectedStation.name}
              className=" flex justify-center items-center m-2 w-11/12"
              style={{ width: `${wheelRadius * 1.5}px`, height: `${wheelRadius * 1.5}px` }}
            />
            <div className="pl-[20px] text-start flex-col">
              <div className="font-bold text-lg">{selectedStation.name}</div>
              <div className="text-sm">{selectedStation.description}</div>
              <div className="text-sm"></div> {/* Current Song Placeholder */}
            </div>
          </div>
        )}
      </div>
      {/* Mobile Layout */}
      <div className={`height-mobile md:hidden flex flex-col items-center justify-center gap-4 p-4 mb-[100px]`}>
        {stations.map((station) => {
          const imagePath = `/radio/radio_icons/${station.image}`;

          return (
            <button
              key={station.name}
              style={{
                opacity: selectedStation?.name === station.name ? 1 : 0.6,
                transition: "transform 0.3s ease",
                borderColor: selectedStation?.name === station.name ? "blue" : "gray",
                borderWidth: selectedStation?.name === station.name ? "4px" : "2px",
                scale: selectedStation?.name === station.name ? 1.025 : 1,
              }}
              className="flex justify-start items-center w-full rounded-xl outline outline-[2px] outline-black/10 bg-black/10"
              onClick={() => {
                loadVideo(station);
              }}
            >
              <img
                src={imagePath}
                alt={station.description}
                className=" flex justify-center items-center m-2 w-11/12"
                style={{ width: `${wheelRadius * 2}px`, height: `${wheelRadius * 2}px` }}
              />
              <div className="flex flex-col justify-center items-start">
                <div className="font-bold text-xl text-start">{station.name}</div>
                <div className="pl-1 text-start">{station.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div id="youtube-player" className=""></div>

      {/* Desktop Layout Alternative */}
      <div className={` h-[(100vh+600px)]   hidden  md:block`}>
        {/* Desktop Now Playing Bar */}
        <div
          className=" flex fixed bottom-0 left-0 w-full h-[100px] bg-black text-white  items-center  z-10 justify-end
        border-t border-[#f5f0e6]
        "
        >
          {selectedStation && (
            <div className="flex flex-row justify-start items-center w-2/3 pl-[75px]">
              <img
                src={`/radio/radio_icons/${selectedStation.image}`}
                alt={selectedStation.name}
                className=" flex justify-center items-center m-2 w-11/12"
                style={{ width: `${wheelRadius * 1.5}px`, height: `${wheelRadius * 1.5}px` }}
              />
              <div className="pl-[20px] text-start flex-col">
                <div className="font-bold text-lg">{selectedStation.name}</div>
                <div className="text-sm">{selectedStation.description}</div>
                <div className="text-sm"></div> {/* Current Song Placeholder */}
              </div>
            </div>
          )}

          <div className="flex  justify-end items-center  w-1/3">
            {/* volume button */}
            <div className=" flex flex-row items-center justify-center gap-2">
              {volume === 0 ? (
                <button className="md:cursor-none" onClick={handleUnmute}>
                  <div className="flex flex-row justify-center items-center">
                    <div className="flex flex-row justify-end items-center  w-[25px] h-[50px]">
                      <svg
                        version="1.1"
                        id="Icons"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 32 32"
                        fill="#ffffff"
                        className="h-3 w-3"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path
                            d="M26.5,2.1c-0.3-0.2-0.7-0.2-1,0L13.7,9H6c-0.6,0-1,0.4-1,1v12c0,0.6,0.4,1,1,1h7.7l11.8,6.9C25.7,30,25.8,30,26,30 c0.2,0,0.3,0,0.5-0.1c0.3-0.2,0.5-0.5,0.5-0.9V3C27,2.6,26.8,2.3,26.5,2.1z"
                            className="st0"
                          ></path>
                        </g>
                      </svg>
                    </div>
                    {/* x icon */}
                    <div className="flex justify-start items-center  w-[25px] h-[50px]">
                      <svg
                        version="1.1"
                        id="Icons"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 16 16"
                        fill="#ffffff"
                        className="h-3 w-[9px] ml-[1px]"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="square" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path d="M1 13.5L2.5 15.75 8 10 13.5 15.75 15.5 13.5 10 8 15.5 2 13.5 0 8 5.5 2.5 0 1 2 6 8z" className="st0"></path>
                        </g>
                      </svg>
                      {/* x icon */}
                    </div>
                  </div>
                </button>
              ) : (
                <button className="md:cursor-none" onClick={handleMute}>
                  <div className="flex flex-row justify-center items-center">
                    <div className="flex flex-row justify-end items-center w-[25px] h-[50px]">
                      <svg
                        version="1.1"
                        id="Icons"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 32 32"
                        fill="#ffffff"
                        className="h-3 w-3"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path
                            d="M26.5,2.1c-0.3-0.2-0.7-0.2-1,0L13.7,9H6c-0.6,0-1,0.4-1,1v12c0,0.6,0.4,1,1,1h7.7l11.8,6.9C25.7,30,25.8,30,26,30 c0.2,0,0.3,0,0.5-0.1c0.3-0.2,0.5-0.5,0.5-0.9V3C27,2.6,26.8,2.3,26.5,2.1z"
                            className="st0"
                          ></path>
                        </g>
                      </svg>
                    </div>
                    {/* speaker icon */}
                    <div className="flex justify-start items-center w-[25px] h-[50px]">
                      <svg
                        version="1.1"
                        id="Icons"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 64 64"
                        className="h-[13px] "
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="7"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path d="M 32 -1.9411 a 48 48 45 0 1 0 67.8823 M 20.6863 9.3726 a 32 32 45 0 1 0 45.2548 M 9.3726 20.6863 a 16 16 45 0 1 0 22.6274"></path>
                        </g>
                      </svg>

                      {/* speaker icon */}
                    </div>
                  </div>
                </button>
              )}
              <input type="range" min="0" max="100" value={volume} onChange={(e) => handleVolumeChange(e.target.value)} />
            </div>
          </div>
        </div>
        {/* alt Desktop Layout */}

        <div className={` grid md:grid-cols-1    items-center justify-center gap-4 p-4 mb-[100px]`}>
          {stations.map((station) => {
            const imagePath = `/radio/radio_icons/${station.image}`;

            return (
              <button
                key={station.name}
                style={{
                  opacity: selectedStation?.name === station.name ? 1 : 0.6,
                  transition: "transform 0.3s ease",
                  borderColor: selectedStation?.name === station.name ? "blue" : "gray",
                  borderWidth: selectedStation?.name === station.name ? "4px" : "2px",
                  scale: selectedStation?.name === station.name ? 1.025 : 1,
                }}
                className="flex justify-start items-center w-full rounded-xl outline outline-[2px] outline-black/10 bg-black/10 cursor-none"
                onClick={() => {
                  loadVideo(station);
                }}
              >
                <img
                  src={imagePath}
                  alt={station.description}
                  className=" flex justify-center items-center m-2 w-11/12"
                  style={{ width: `${wheelRadius * 2}px`, height: `${wheelRadius * 2}px` }}
                />
                <div className="flex flex-col justify-center items-start">
                  <div className="font-bold text-xl text-start">{station.name}</div>
                  <div className="pl-1 text-start">{station.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
