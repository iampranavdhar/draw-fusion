"use client";
import { useRouter } from "next/navigation.js";
import { apiHandler } from "./handler/api.js";
import { toast } from "react-toastify";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function Home() {
  const router = useRouter();
  const socket = useRef<any>();

  const [username, setUsername] = useState("");

  useEffect(() => {
    socket.current = io("http://localhost:4005"); // Connect to the Socket.io server
    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!username || username === "") {
      toast.error("Please enter a username");
      return;
    }
    try {
      const res = await apiHandler({
        method: "POST",
        url: "/api/room/create-room",
        data: {
          username: username,
        },
      });
      if (res?.status === 200) {
        socket.current.emit("join-room", {
          room_id: res.data._id,
          user: res.data.users[0],
        });
        router.push(`/room/${res.data._id}/${username}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen !overflow-hidden flex flex-col items-center justify-center px-4 pt-16 mx-auto sm:max-w-xl md:max-w-full lg:pt-32 md:px-0 bg-gray-100">
      <div className="flex flex-col items-center max-w-2xl md:px-8">
        <div className="max-w-xl mb-10 md:mx-auto sm:text-center lg:max-w-2xl md:mb-12">
          <div>
            <p className="inline-block px-3 py-px mb-4 text-xs font-semibold tracking-wider text-teal-400 uppercase rounded-full bg-teal-accent-400">
              Game On!
            </p>
          </div>
          <h2 className="max-w-lg mb-6 font-sans text-3xl font-bold leading-none tracking-tight text-gray-900 sm:text-4xl md:mx-auto">
            <span className="relative inline-block">
              <svg
                viewBox="0 0 52 24"
                fill="currentColor"
                className="absolute top-0 left-0 z-0 hidden w-32 -mt-8 -ml-20 text-blue-gray-100 lg:w-32 lg:-ml-28 lg:-mt-10 sm:block"
              >
                <defs>
                  <pattern
                    id="192913ce-1f29-4abd-b545-0fbccfd2b0ec"
                    x="0"
                    y="0"
                    width=".135"
                    height=".30"
                  >
                    <circle cx="1" cy="1" r=".7" />
                  </pattern>
                </defs>
                <rect
                  fill="url(#192913ce-1f29-4abd-b545-0fbccfd2b0ec)"
                  width="52"
                  height="24"
                />
              </svg>
              <span className="relative">Guess</span>
            </span>{" "}
            the Sketch, Race the Clock!
          </h2>
          <p className="text-base text-gray-700 md:text-lg">
            Race against the clock to sketch and guess in this fast-paced
            showdown!
          </p>
        </div>
        <form className="flex flex-col items-center w-full mb-4 md:flex-row">
          <input
            placeholder="Name"
            type="text"
            className="flex-grow w-full h-12 px-4 mb-3 transition duration-200 bg-white text-[#242424] border border-gray-300 rounded shadow-sm appearance-none md:mr-2 md:mb-0 focus:border-deep-purple-accent-400 focus:outline-none focus:shadow-outline"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center w-full h-12 px-6 bg-violet-600 hover:bg-violet-700 font-medium tracking-wide text-white transition duration-200 rounded shadow-md md:w-auto bg-deep-purple-accent-400 hover:bg-deep-purple-accent-700 focus:shadow-outline focus:outline-none cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              handleCreateRoom();
            }}
          >
            Start
          </button>
        </form>
        <p className="max-w-md mb-10 text-xs text-gray-600 sm:text-sm md:text-center">
          We don't store your names ever and we don't sell your data.
        </p>
      </div>
    </div>
  );
}
