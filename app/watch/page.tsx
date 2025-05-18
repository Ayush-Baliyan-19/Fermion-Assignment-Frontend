"use client";
import React, { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { createPeerConnection } from "../lib/webrtc";
import VideoBox from "../components/VideoBox";
import { ArrowLeft, Users, Loader2, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";

type RoomInfo = {
  streamers: number;
  viewers: number;
};

type Streams = Record<string, MediaStream>;

const Page: React.FC = () => {
  const router = useRouter();
  const [streams, setStreams] = useState<Streams>({});
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    streamers: 0,
    viewers: 0,
  });
  const [connectedTime, setConnectedTime] = useState<number>(0);
  const peerRefs = useRef<Record<string, RTCPeerConnection>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      socket.emit("join_room", { room: "room1", role: "watcher" });
      setIsConnecting(false);

      // Start the streaming timer
      timerRef.current = setInterval(() => {
        setConnectedTime((prev) => prev + 1);
      }, 1000);
    });

    socket.on("room_info", (info: RoomInfo) => {
      setRoomInfo(info);
    });

    socket.on(
      "offer",
      async ({
        sender,
        offer,
      }: {
        sender: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        const pc = createPeerConnection(socket, sender, false);
        peerRefs.current[sender] = pc;

        pc.ontrack = (e: RTCTrackEvent) => {
          const incomingStream = e.streams[0];
          setStreams((prev) => ({
            ...prev,
            [sender]: incomingStream,
          }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { target: sender, answer });
      }
    );

    socket.on(
      "ice_candidate",
      ({
        sender,
        candidate,
      }: {
        sender: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const pc = peerRefs.current[sender];
        if (pc) {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    );

    socket.on("user-disconnected", (sid: string) => {
      setStreams((prev) => {
        const copy = { ...prev };
        delete copy[sid];
        return copy;
      });

      if (peerRefs.current[sid]) {
        peerRefs.current[sid].close();
        delete peerRefs.current[sid];
      }
    });

    return () => {
      socket.disconnect();
      Object.values(peerRefs.current).forEach((pc) => pc.close());

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format the connected time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  // Toggle audio for all streams
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Leave stream and return to home
  const leaveStream = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={leaveStream}
              className="mr-4 p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Fermion Stream</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-400">
              <Users size={16} className="mr-2" />
              <span>
                {roomInfo.streamers} streamer{roomInfo.streamers !== 1 && "s"},{" "}
                {roomInfo.viewers} viewer{roomInfo.viewers !== 1 && "s"}
              </span>
            </div>

            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold animate-pulse">
              LIVE
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {isConnecting ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="text-lg">Connecting to stream...</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Stream time indicator */}
            <div className="absolute top-4 right-4 z-10 bg-black/60 px-3 py-1 rounded-lg text-sm flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
              <span>{formatTime(connectedTime)}</span>
            </div>

            {/* Stream display */}
            <div className="mt-2 space-y-6">
              {Object.keys(streams).length === 0 ? (
                <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                      <Users size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Active Streamers
                    </h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Waiting for streamers to go live. When streamers connect,
                      their video will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(streams).map(([sid, stream], idx) => (
                    <div
                      key={sid}
                      className="aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 relative"
                    >
                      <VideoBox stream={stream} muted={isMuted} />
                      <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        Streamer {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gray-700 hover:bg-gray-600"
              } transition-colors`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-gray-400 hidden md:block">
              Watching for: {formatTime(connectedTime)}
            </div>

            <button
              onClick={leaveStream}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
            >
              Exit Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
