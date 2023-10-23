"use client";
import { apiHandler } from "@/app/handler/api";
import { capitalize } from "@/app/utils/common";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const DrawingRoom = ({
  params,
}: {
  params: { room_id: string; username: string };
}) => {
  const router = useRouter();
  const socket = useRef<any>(null);

  let canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [color, setColor] = useState<string>("white");
  const [countDown, setCountDown] = useState<number | null>(null);
  const [artistTimer, setArtistTimer] = useState<number | null>(null);

  const [room, setRoom] = useState<any>({});
  const [messages, setMessages] = useState<any>([]);
  const [messageText, setMessageText] = useState<string>("");

  useEffect(() => {
    const { room_id, username } = params;
    let user: IUser | undefined;
    if (!room_id || !username) {
      router.push("/");
    } else {
      const getRoom = async () => {
        const res = await apiHandler({
          method: "GET",
          url: `/api/room/${room_id}`,
          data: {},
        });
        const res2 = await apiHandler({
          method: "GET",
          url: `/api/messages/${room_id}`,
          data: {},
        });
        if (res?.status === 200 && res2?.status === 200) {
          setRoom(res.data);
          console.log("res2", res2?.data?.messages);
          setMessages(res2?.data?.messages);
          user = res?.data?.users?.find((user: any) => user.name === username);
          if (!user) {
            toast.error("User not found");
            router.push("/");
          }
        } else {
          toast.error("Room not found or expired");
          router.push("/");
        }
      };
      getRoom();
    }
  }, []);

  useEffect(() => {
    socket.current = io("http://localhost:4005");

    socket.current.on("user-connected", (socData: any) => {
      console.log("user joined socket", socData);
      if (socData.room_id.toString() === params.room_id.toString()) {
        setRoom((data: IRoom) => {
          return { ...data, users: [...data.users, socData.user] };
        });
      }
    });

    socket.current.on("user-disconnected", (_id: any) => {
      setRoom((data: IRoom) => {
        return {
          ...data,
          users: data.users.filter(
            (u: any) => u._id.toString() !== _id.toString()
          ),
        };
      });
    });

    socket.current.on("artist-changed", (data: any) => {
      console.log("artist changed", data);
      if (data.room_id.toString() === params.room_id.toString()) {
        setRoom((room: IRoom) => {
          return {
            ...room,
            status: data.status,
            artist: data.artist._id,
            currentWord: data.currentWord,
            artistStartTime: data.artistStartTime,
          };
        });
      }
    });

    socket.current.on("start-drawing", (data: any) => {
      if (
        contextRef.current &&
        data?.room_id?.toString() === params?.room_id?.toString()
      ) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(data.x, data.y);
      }
    });

    socket.current.on("stop-drawing", (data: any) => {
      if (
        contextRef.current &&
        data?.room_id?.toString() === params?.room_id?.toString()
      ) {
        contextRef.current.closePath();
      }
    });

    socket.current.on("draw", (data: any) => {
      if (
        contextRef.current &&
        data?.room_id?.toString() === params?.room_id?.toString()
      ) {
        contextRef.current.lineTo(data.x, data.y);
        contextRef.current.stroke();
      }
    });

    socket.current.on("game-ended", (data: any) => {
      if (data?.room_id.toString() === params?.room_id?.toString()) {
        router.push(`/results/${params.room_id}`);
      }
    });

    socket.current.on("clear-canvas", (data: any) => {
      if (
        contextRef.current &&
        data?.room_id?.toString() === params?.room_id?.toString()
      ) {
        contextRef.current.clearRect(
          0,
          0,
          window.innerWidth * 2,
          window.innerHeight * 2
        );
      }
    });

    socket.current.on("sent-msg", (data: any) => {
      if (data?.room_id.toString() === params?.room_id?.toString()) {
        setMessages(data.messages);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas!.getContext("2d");
    if (context) {
      canvas!.width = canvas!.offsetWidth * 2;
      canvas!.height = canvas!.offsetHeight * 2;
      context.scale(2, 2);
      context.lineCap = "round";
      context.strokeStyle = color;
      context.lineWidth = 5;
      contextRef.current = context;
      canvas!.style.backgroundColor = "black";
    }
  }, [color]);

  const startDrawing = ({
    nativeEvent,
  }: React.MouseEvent<HTMLCanvasElement>) => {
    if (contextRef.current) {
      const { offsetX, offsetY } = nativeEvent;
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      socket.current.emit("start-drawing", {
        room_id: params.room_id,
        x: offsetX,
        y: offsetY,
        color,
      });
      setIsDrawing(true);
    }
  };

  const finishDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
      socket.current.emit("stop-drawing", params.room_id);
      setIsDrawing(false);
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) {
      return;
    }
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    socket.current.emit("draw", {
      room_id: params.room_id,
      x: offsetX,
      y: offsetY,
      color,
    });
  };

  const leaveRoom = async () => {
    const res = await apiHandler({
      method: "POST",
      url: `/api/room/leave-room`,
      data: {
        room_id: params?.room_id,
        user_id: room?.users?.find((user: any) => user.name === params.username)
          ._id,
      },
    });
    if (res?.status === 200) {
      toast.success("Left room successfully");
      router.push("/");
    } else {
      toast.error("Error leaving room");
    }
  };

  const changeStatus = async (status: string) => {
    if (status === "playing") {
      if (room?.users?.length < 2) {
        toast.error("Minimum 2 users required to start the game");
        return;
      }
    }
    const res = await apiHandler({
      method: "POST",
      url: `/api/room/change-status`,
      data: {
        room_id: params?.room_id,
        status,
      },
    });
    if (res?.status === 200) {
      if (status === "playing") {
        socket.current.emit("start-game", params.room_id);
      }
      setRoom(res.data);
    } else {
      toast.error("Error changing status");
    }
  };

  const sendMessage = async (message: string) => {
    const res = await apiHandler({
      method: "POST",
      url: `/api/messages/send-message`,
      data: {
        room_id: params?.room_id,
        username: params?.username,
        message,
      },
    });
    if (res?.status === 200) {
      setRoom(res.data.room);
      socket.current.emit("send-message", {
        room_id: params.room_id,
        messages: res.data.chat.messages,
      });
    } else {
      toast.error("Error sending message");
    }
  };

  // Shortcut to clear canvas
  useEffect(() => {
    const undo = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== "INPUT" &&
        (e.key === "Escape" ||
          e.key === "Backspace" ||
          e.key === "Delete" ||
          e.key === "z" ||
          e.key === "Z")
      ) {
        if (contextRef.current) {
          contextRef.current.clearRect(
            0,
            0,
            window.innerWidth * 2,
            window.innerHeight * 2
          );
          socket.current.emit("clear-canvas", params.room_id);
        }
      }
    };
    window.addEventListener("keydown", undo);
    return () => window.removeEventListener("keydown", undo);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (room.artistStartTime) {
        const remainingTime = moment(room.artistStartTime)
          .add(30, "seconds")
          .diff(moment(), "seconds");
        setArtistTimer(remainingTime < 0 ? 0 : remainingTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  return (
    <div className="grid grid-cols-[0.4fr_1fr_0.4fr] w-full max-w-[100vw] h-screen">
      {/* Users Column */}
      <div className="h-full p-2">
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <h1 className="text-2xl font-bold">Users</h1>
            <ul className="mt-2">
              {room?.users?.map((user: any) => (
                <li key={user._id} className="w-full flex items-center mt-2 ">
                  <div
                    className="w-8 h-8 rounded mr-2 flex items-center justify-center"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.score}
                  </div>
                  <div className="text-[0.9rem] flex flex-col items-start justify-start m-0">
                    <span>{capitalize(user.name)}</span>
                    <span
                      className={`text-gray-500 text-xs font-normal m-0
                    ${
                      room.artist.toString() === user._id.toString()
                        ? "text-green-500"
                        : "text-red-500"
                    }
                    `}
                    >
                      {room?.status === "waiting"
                        ? "Waiting"
                        : room?.status === "playing" &&
                          room?.artist?.toString() === user?._id?.toString()
                        ? "Drawing"
                        : room?.status === "playing" &&
                          room?.artist?.toString() !== user?._id?.toString()
                        ? "Guessing"
                        : "Game Over"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full mt-2">
            <button
              className="mb-2 w-full py-1 bg-transparent border border-violet-500 text-violet-500 rounded-md mb-1hover:bg-violet-500 hover:text-white transition duration-200 ease-in-out"
              onClick={() => {
                const link = window.location.href;
                // remove the last part of the link
                const newLink = link.substring(0, link.lastIndexOf("/"));
                navigator.clipboard.writeText(newLink);
                toast.success("Link copied to clipboard");
              }}
            >
              Share
            </button>
            <button
              className="w-full py-2 px-4 bg-red-500 text-white rounded-md"
              onClick={() => {
                leaveRoom();
              }}
            >
              Leave room
            </button>
          </div>
        </div>
      </div>
      <div className="w-full h-full relative bg-[rgba(46,46,46,0.9)] border-x border-[#2c2c2c] overflow-hidden">
        <canvas
          style={{
            background: "rgba(255,255,255,0.9)",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          ref={canvasRef}
        />
        {/* overlay with start button if the room.status is waiting */}
        {countDown ||
          (room?.status === "waiting" && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[rgb(0,0,0,0.9)]">
              {countDown ? (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[rgb(0,0,0,0.9)]">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-violet-500 animate-spin" />
                    </div>
                    {/* Numbers counting from 5 to 0 with animation */}
                    <div className="flex items-center justify-center text-white text-6xl font-bold">
                      {countDown}
                    </div>
                  </div>
                </div>
              ) : (
                room?.status === "waiting" && (
                  <button
                    className="py-2 px-4 bg-violet-500 text-white rounded-md
            hover:bg-violet-600 transition duration-200 ease-in-out
              "
                    onClick={() => {
                      changeStatus("playing");
                    }}
                  >
                    Start Game
                  </button>
                )
              )}
            </div>
          ))}
        {room?.status === "playing" && (
          <>
            <div className="absolute top-[1%] left-[1%] w-auto p-3">
              <div className="flex items-center justify-center bg-transparent rounded-md transition duration-200 ease-in-out cursor-pointer">
                <span
                  className="
                text-indigo-500
              text-lg font-medium"
                >
                  {artistTimer}
                </span>
                {room?.users?.find(
                  (user: any) =>
                    user._id.toString() === room?.artist?.toString()
                )?.name === params?.username && (
                  <div className="flex items-center justify-center bg-transparent rounded-md transition duration-200 ease-in-out cursor-pointer">
                    <span
                      className="
                text-indigo-500
              text-lg font-medium border border-indigo-500 rounded-md px-2 py-1 ml-4"
                    >
                      {room?.currentWord}
                    </span>
                  </div>
                )}
                <p
                  onClick={() => {
                    if (contextRef.current) {
                      contextRef.current.clearRect(
                        0,
                        0,
                        window.innerWidth * 2,
                        window.innerHeight * 2
                      );
                    }
                  }}
                  className="text-gray-500 text-lg mr-8 font-medium cursor-pointer hover:text-gray-400 ml-4"
                >
                  Clear
                </p>
              </div>
            </div>

            <div className="absolute top-[1%] left-[90%] w-full p-3 flex items-center">
              {/* clear canvas icon */}
              <p className="text-white text-lg mr-8 font-medium"></p>
            </div>
          </>
        )}
        {room?.status === "end" && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[rgb(0,0,0,0.9)]">
            <div className="flex flex-col items-center justify-center">
              {/* Numbers counting from 5 to 0 with animation */}
              <div className="flex items-center justify-center text-white text-3xl font-bold">
                Congratulations!{" "}
                {
                  room?.users?.sort((a: any, b: any) => b.score - a.score)[0]
                    .name
                }{" "}
                🎉
              </div>
              {/* congrats message to use with high scrore */}
              <div className="flex items-center justify-center text-white text-2xl font-bold mt-4">
                Game Over
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Chat Column */}
      <div className="h-full">
        <div className="flex flex-col h-full">
          <div className="flex-grow rounded-md">
            <div className="flex items-center justify-between py-2 px-4 rounded-t-md">
              <h1 className="text-2xl font-bold">Chat</h1>
            </div>
            <div className="flex-grow overflow-y-auto px-2">
              <ul className="mt-2">
                {messages?.map((message: IMessage) => (
                  <li key={message._id} className="flex items-center mt-2">
                    <div
                      className="w-5 h-5 rounded mr-2"
                      style={{
                        backgroundColor: room?.users?.find(
                          (user: any) => user.name === message.username
                        )?.color,
                      }}
                    />
                    <span>{message.username}</span>
                    <span
                      className={`ml-2
                    ${
                      message.isAnswer
                        ? "text-green-500"
                        : message.isAnswer === false
                        ? "text-red-500"
                        : "text-gray-500"
                    }
                    `}
                    >
                      {message.isAnswer ? "guessed it right!" : message.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-2">
            <input
              type="text"
              className="w-[95%] ml-1 mb-1 py-2 px-4 bg-[#212121] text-white rounded-md border border-[rgba(255,255,255,0.12)] focus:outline-none placeholder-gray-400"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await sendMessage(messageText);
                  setMessageText("");
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingRoom;
