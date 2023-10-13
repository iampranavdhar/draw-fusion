"use client";
import { apiHandler } from "@/app/handler/api";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const UsernamePage = ({
  params,
}: {
  params: {
    room_id: string;
  };
}) => {
  const router = useRouter();
  const [room, setRoom] = useState<IRoom>();
  const [username, setUsername] = useState("");
  const socket = useRef<any>();

  useEffect(() => {
    const fetchRoom = async () => {
      const res = await apiHandler({
        method: "GET",
        url: `/api/room/${params.room_id}`,
        data: {},
      });
      if (res?.status === 200) {
        setRoom(res.data);
      } else {
        toast.error("Room not found or expired");
        router.push("/");
      }
    };
    fetchRoom();
  }, []);

  useEffect(() => {
    socket.current = io("http://localhost:4005"); // Connect to the Socket.io server
    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || username === "") {
      toast.error("Please enter a username");
      return;
    }
    try {
      const res = await apiHandler({
        method: "POST",
        url: `/api/room/join-room`,
        data: {
          username: username,
          room_id: params.room_id,
        },
      });
      if (res?.status === 200) {
        socket.current.emit("join-room", {
          room_id: params.room_id,
          user: res.data.users[res.data.users.length - 1],
        });
        router.push(`/room/${params.room_id}/${username}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <section className="flex flex-col justify-center antialiased bg-gray-200 text-gray-600 min-h-screen p-4">
      <div className="h-full">
        <div className="max-w-[360px] mx-auto">
          <div className="bg-white shadow-lg rounded-lg mt-9">
            <header className="text-center px-5 pb-5">
              <svg
                className="inline-flex -mt-9 w-[72px] h-[72px] fill-current rounded-full border-4 border-white box-content shadow mb-3"
                viewBox="0 0 72 72"
              >
                <path className="text-gray-700" d="M0 0h72v72H0z" />
                <path
                  className="text-pink-400"
                  d="M30.217 48c.78-.133 1.634-.525 2.566-1.175.931-.65 1.854-1.492 2.769-2.525a30.683 30.683 0 0 0 2.693-3.575c.88-1.35 1.66-2.792 2.337-4.325-1.287 3.3-1.93 5.9-1.93 7.8 0 2.467.914 3.7 2.743 3.7.508 0 1.084-.083 1.727-.25.644-.167 1.169-.383 1.575-.65-.474-.267-.812-.708-1.016-1.325-.203-.617-.305-1.392-.305-2.325 0-.833.11-1.817.33-2.95.22-1.133.534-2.35.94-3.65.407-1.3.898-2.658 1.474-4.075A71.574 71.574 0 0 1 48 28.45c0-.167-.127-.35-.381-.55a5.313 5.313 0 0 0-.94-.575 6.394 6.394 0 0 0-1.245-.45 4.925 4.925 0 0 0-1.194-.175 110.56 110.56 0 0 1-2.49 4.8c-.44.8-.872 1.567-1.295 2.3-.423.733-.804 1.4-1.143 2-1.83 3.033-3.387 5.275-4.675 6.725-1.287 1.45-2.421 2.275-3.404 2.475-.474-.167-.711-.567-.711-1.2 0-1.533.373-3.183 1.118-4.95a23.24 23.24 0 0 1 2.87-4.975c1.169-1.55 2.473-2.875 3.913-3.975s2.836-1.75 4.191-1.95c-.034-.3-.186-.658-.457-1.075a8.072 8.072 0 0 0-.99-1.225c-.39-.4-.797-.75-1.22-1.05-.424-.3-.805-.5-1.143-.6-1.39.067-2.829.692-4.319 1.875-1.49 1.183-2.87 2.658-4.14 4.425a26.294 26.294 0 0 0-3.126 5.75C26.406 38.117 26 40.083 26 41.95c0 1.733.39 3.158 1.169 4.275.779 1.117 1.795 1.708 3.048 1.775Z"
                />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {room?.users?.length} Players are waiting for you
              </h3>
              <div className="text-sm font-medium text-gray-500">
                Room #00224
              </div>
            </header>
            <div className="bg-gray-100 text-center px-5 py-6">
              <form className="space-y-3" onSubmit={handleJoinRoom}>
                <div className="flex shadow-sm rounded">
                  <div className="flex-grow">
                    <input
                      name="card-nr"
                      className="text-sm text-gray-800 bg-white rounded-l leading-5 py-2 px-3 placeholder-gray-400 w-full border border-transparent focus:border-indigo-300 focus:ring-0"
                      type="text"
                      placeholder="Username"
                      aria-label="Card Number"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="font-semibold text-sm inline-flex items-center justify-center px-3 py-2 border border-transparent rounded leading-5 shadow transition duration-150 ease-in-out w-full bg-indigo-500 hover:bg-indigo-600 text-white focus:outline-none focus-visible:ring-2"
                >
                  Start Fun
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsernamePage;
