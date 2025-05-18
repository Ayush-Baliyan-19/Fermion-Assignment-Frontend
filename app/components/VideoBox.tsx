"use client";
import React from "react";

const VideoBox = ({ stream, muted = false, videoRef = null }: any) => {
  const localVideoRef = React.useRef(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const videoElement = videoRef?.current || localVideoRef.current;

    if (stream && videoElement) {
      try {
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => {
          setIsLoading(false);
        };
        videoElement.onerror = () => {
          setHasError(true);
          setIsLoading(false);
        };
      } catch (error) {
        console.error("Error setting video source:", error);
        setHasError(true);
        setIsLoading(false);
      }
    }

    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream, videoRef]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-red-500 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-gray-400">Failed to load video</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef || localVideoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default VideoBox;
