"use client";
import { USER_ROLE } from "@/types/roles.types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast, Toaster } from "react-hot-toast";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  const handleNavigation = async (selectedRole: USER_ROLE) => {
    // const res = await fetch(`/api/stream-count`);
    // const { activeStreamers } = await res.json();

    // if (selectedRole === USER_ROLE.streamer && activeStreamers >= 2) {
    //   toast.error("Only two streamers allowed at a time");
    //   return;
    // }

    router.push(`/${selectedRole}`);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <Toaster />
      <h1 className="text-4xl font-bold mb-10">Welcome to Fermion Stream</h1>
      <div className="flex space-x-6">
        <button
          onClick={() => handleNavigation(USER_ROLE.streamer)}
          className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Join as Streamer
        </button>
        <button
          onClick={() => handleNavigation(USER_ROLE.viewer)}
          className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700"
        >
          Join as Watcher
        </button>
      </div>
    </div>
  );
}
