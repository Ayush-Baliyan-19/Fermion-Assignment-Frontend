"use client";
import React, { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { createPeerConnection } from "../lib/webrtc";
import VideoBox from "../components/VideoBox";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  ArrowLeft,
  Settings,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type RoomInfo = {
  streamers: number;
  viewers: number;
};

type RemoteStreams = Record<string, MediaStream>;

const Page: React.FC = () => {
  const router = useRouter();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreams>({});
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    streamers: 0,
    viewers: 0,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const peerRefs = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    socket.connect();

    // Get local stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsConnecting(false);

        // Initial state based on device permissions
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        setIsConnecting(false);
      });

    socket.on("connect", () => {
      socket.emit("join_room", { room: "room1", role: "streamer" });
    });

    socket.on("room_info", (info: RoomInfo) => {
      setRoomInfo(info);
    });

    socket.on("new_peer", ({ id }: { id: string }) => {
      startConnection(id);
    });

    socket.on("watcher_joined", ({ watcher_sid }: { watcher_sid: string }) => {
      startConnection(watcher_sid);
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

        pc.ontrack = (event: RTCTrackEvent) => handleOnTrack(sender, event);
        addLocalTracks(pc);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { target: sender, answer });
      }
    );

    socket.on(
      "answer",
      ({
        sender,
        answer,
      }: {
        sender: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        peerRefs.current[sender]?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
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
        peerRefs.current[sender]?.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    );

    socket.on("user-disconnected", (sid: string) => {
      setRemoteStreams((prev) => {
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

      // Clean up local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startConnection = async (peerId: string) => {
    const pc = createPeerConnection(socket, peerId, true);
    peerRefs.current[peerId] = pc;

    pc.ontrack = (event: RTCTrackEvent) => handleOnTrack(peerId, event);
    addLocalTracks(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { target: peerId, offer });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          target: peerId,
          candidate: event.candidate,
        });
      }
    };
  };

  const addLocalTracks = (pc: RTCPeerConnection) => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });
  };

  const handleOnTrack = (peerId: string, event: RTCTrackEvent) => {
    const inboundStream = new MediaStream();
    event.streams[0].getTracks().forEach((track) => {
      inboundStream.addTrack(track);
    });
    setRemoteStreams((prev) => ({ ...prev, [peerId]: inboundStream }));
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const leaveStream = () => {
    Object.values(peerRefs.current).forEach((pc) => pc.close());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    socket.disconnect();
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Local stream */}
            <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
              {localStream && (
                <>
                  <VideoBox
                    stream={localStream}
                    muted={true}
                    // videoRef={localVideoRef}
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    You (Streaming)
                  </div>
                </>
              )}

              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                  <div className="text-center">
                    <VideoOff
                      size={48}
                      className="mx-auto mb-2 text-gray-400"
                    />
                    <p className="text-gray-400">Camera is off</p>
                  </div>
                </div>
              )}
            </div>

            {/* Remote streams */}
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <div
                key={peerId}
                className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg"
              >
                <VideoBox stream={stream} />
                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Peer Streamer
                </div>
              </div>
            ))}

            {/* Placeholder if no remote streams */}
            {Object.keys(remoteStreams).length === 0 && (
              <div className="aspect-video bg-gray-800/50 rounded-xl border border-gray-700 flex items-center justify-center">
                <div className="text-center px-4 py-10">
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Users size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Waiting for another streamer
                  </h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    When another streamer joins, their video will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${
                isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-500 hover:bg-red-600"
              } transition-colors`}
            >
              {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-500 hover:bg-red-600"
              } transition-colors`}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Settings size={20} />
            </button>

            <button
              onClick={leaveStream}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
            >
              End Stream
            </button>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Stream Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Video Source</label>
                <select className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Default Camera</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Audio Source</label>
                <select className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Default Microphone</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600 py-2 rounded-lg transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
