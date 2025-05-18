"use client";
import { USER_ROLE } from "@/types/roles.types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Camera, Eye, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string|null>(null);

  const handleNavigation = async (role:string) => {
    setSelectedRole(role);
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/stream-count`);
      const { activeStreamers } = await res.json();

      if (role === USER_ROLE.streamer && activeStreamers >= 2) {
        toast.error("Only two streamers allowed at a time", {
          duration: 4000,
          position: "bottom-center",
          style: {
            background: "#F43F5E",
            color: "#fff",
            borderRadius: "8px",
          },
        });
        setIsLoading(false);
        return;
      }

      router.push(`/${role}`);
    } catch (error) {
      console.error("Failed to check stream count:", error);
      toast.error("Connection error. Please try again.", {
        duration: 4000,
        position: "bottom-center",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col items-center">
      <Toaster />

      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto pt-16 px-6 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center mr-3">
            <Camera size={22} />
          </div>
          <h1 className="text-2xl font-bold">Fermion Stream</h1>
        </div>

        <h2 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Connect & Stream Live
        </h2>

        <p className="text-lg text-gray-300 text-center max-w-xl mb-12">
          The perfect platform for real-time interaction and streaming. Join as
          a streamer to broadcast or watch others' streams.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Streamer Card */}
          <div
            className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-blue-900/30 ${
              selectedRole === USER_ROLE.streamer && isLoading
                ? "border-blue-500"
                : "border-gray-700 hover:border-blue-500"
            }`}
            onClick={() => handleNavigation(USER_ROLE.streamer)}
          >
            <div className="absolute top-6 right-6 p-2 rounded-full bg-blue-500/20">
              <Camera size={22} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Join as Streamer</h3>
            <p className="text-gray-400 mb-4">
              Share your camera and voice with others in real-time
            </p>
            <button
              disabled={isLoading}
              className={`w-full bg-blue-600 mt-4 px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors`}
            >
              {selectedRole === USER_ROLE.streamer && isLoading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Start Streaming
            </button>
          </div>

          {/* Viewer Card */}
          <div
            className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-green-900/30 ${
              selectedRole === USER_ROLE.viewer && isLoading
                ? "border-green-500"
                : "border-gray-700 hover:border-green-500"
            }`}
            onClick={() => handleNavigation(USER_ROLE.viewer)}
          >
            <div className="absolute top-6 right-6 p-2 rounded-full bg-green-500/20">
              <Eye size={22} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Join as Viewer</h3>
            <p className="text-gray-400 mb-4">
              Watch live streams and see streamers interact
            </p>
            <button
              disabled={isLoading}
              className={`w-full bg-green-600 mt-4 px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors`}
            >
              {selectedRole === USER_ROLE.viewer && isLoading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Watch Streams
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-6xl mx-auto mt-24 px-6 pb-16">
        <h3 className="text-2xl font-bold text-center mb-12">Key Features</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2">WebRTC Streaming</h4>
            <p className="text-gray-400">
              Low-latency, high-quality peer-to-peer streaming between
              participants
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2">Live Viewing</h4>
            <p className="text-gray-400">
              Watch live streams with HLS playback for optimal performance
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2">Real-time Connection</h4>
            <p className="text-gray-400">
              Connect with other streamers in real-time for interactive
              broadcasting
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-800">
        <div className="text-center text-gray-500 text-sm">
          © 2025 Fermion Stream. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
