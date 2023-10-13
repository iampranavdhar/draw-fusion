"use client";
import { apiHandler } from "@/app/handler/api";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const Results = ({
  params,
}: {
  params: {
    room_id: string;
  };
}) => {
  const router = useRouter();
  console.log(params.room_id, "params");

  const [room, setRoom] = useState<IRoom>();

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

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Results</h1>
      <table className="table-auto w-full max-w-lg mt-4">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border px-4 py-2">Janvi</td>
            <td className="border px-4 py-2">310</td>
          </tr>
          <tr>
            <td className="border px-4 py-2">Gayatri</td>
            <td className="border px-4 py-2">300</td>
          </tr>
          <tr>
            <td className="border px-4 py-2">Gayatri</td>
            <td className="border px-4 py-2">250</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Results;
