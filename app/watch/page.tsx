"use client";
import React, { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { createPeerConnection } from "../lib/webrtc";
import VideoBox from "../components/VideoBox";

const Page = () => {
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const peerRefs = useRef<Record<string, RTCPeerConnection>>({});

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      socket.emit("join_room", { room: "room1", role: "watcher" });
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
    };
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Watching Stream</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(streams).map(([sid, stream], idx) => (
          <div key={sid} className="border rounded-xl p-2 bg-black relative">
            <VideoBox stream={stream} muted={false} />
            <div className="absolute bottom-2 left-2 text-white bg-black/60 px-2 py-1 text-xs rounded">
              Streamer {idx + 1}
            </div>
          </div>
        ))}
        {Object.keys(streams).length === 0 && (
          <p className="text-center col-span-2">
            Waiting for streamers to join...
          </p>
        )}
      </div>
    </div>
  );
};

export default Page;
