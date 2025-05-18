"use client";
import React, { useEffect, useRef } from "react";

const VideoBox = ({
  stream,
  muted = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={muted}
      playsInline
      className="w-[400px] h-[300px] rounded shadow-md"
    />
  );
};

export default VideoBox;
