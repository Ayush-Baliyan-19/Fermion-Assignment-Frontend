"use client";
import React, { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { createPeerConnection } from "../lib/webrtc";
import VideoBox from "../components/VideoBox";

const Page = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const peerRefs = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    socket.connect();

    // Get local stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        localStreamRef.current = stream;
      });

    socket.on("connect", () => {
      socket.emit("join_room", { room: "room1", role: "streamer" });
    });

    // When a new peer (another streamer/watcher) joins
    socket.on("new_peer", ({ id }: { id: string }) => {
      startConnection(id);
    });

    // When a watcher joins the stream
    socket.on("watcher_joined", ({ watcher_sid }: { watcher_sid: string }) => {
      console.log("watcher_sid", watcher_sid);
      startConnection(watcher_sid);
    });

    // Offer from another peer
    socket.on("offer", async ({ sender, offer }) => {
      const pc = createPeerConnection(socket, sender, false);
      peerRefs.current[sender] = pc;

      pc.ontrack = (event) => handleOnTrack(sender, event);
      addLocalTracks(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { target: sender, answer });
    });

    // Answer to our offer
    socket.on("answer", ({ sender, answer }) => {
      peerRefs.current[sender]?.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    // ICE candidate received
    socket.on("ice_candidate", ({ sender, candidate }) => {
      peerRefs.current[sender]?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      Object.values(peerRefs.current).forEach((pc) => pc.close());
    };
  }, []);

  // Start connection for a peer (watcher or another streamer)
  const startConnection = async (peerId: string) => {
    const pc = createPeerConnection(socket, peerId, true);
    peerRefs.current[peerId] = pc;

    pc.ontrack = (event) => handleOnTrack(peerId, event);
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

  // Add local tracks to the peer connection
  const addLocalTracks = (pc: RTCPeerConnection) => {
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });
  };

  // Handle incoming remote track
  const handleOnTrack = (peerId: string, event: RTCTrackEvent) => {
    const inboundStream = new MediaStream();
    event.streams[0].getTracks().forEach((track) => {
      inboundStream.addTrack(track);
    });
    setRemoteStreams((prev) => ({ ...prev, [peerId]: inboundStream }));
  };

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">Live Stream</h2>

      <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl">
        {/* Local Video */}
        {localStream && (
          <div className="w-2/5 relative rounded-lg overflow-hidden shadow-lg border border-gray-700">
            <VideoBox stream={localStream} muted />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 text-sm rounded-md">
              You
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div
            key={peerId}
            className="w-2/5 relative rounded-lg overflow-hidden shadow-lg border border-gray-700"
          >
            <VideoBox stream={stream} />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 text-sm rounded-md">
              Peer ({peerId.slice(0, 4)}…)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;
