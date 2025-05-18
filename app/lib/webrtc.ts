// This component provides an overview of how the WebRTC connections are created
// and maintained in the application.

const createPeerConnection = (socket:any, targetId:string, isOfferer = false) => {
  // ICE configuration for peer connections
  // Using Google's public STUN servers
  const configuration = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // Create a new RTCPeerConnection
  const pc = new RTCPeerConnection(configuration);

  // Event handler for ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      // Send ICE candidate to the peer via signaling server
      socket.emit("ice_candidate", {
        target: targetId,
        candidate: event.candidate,
      });
    }
  };

  // Connection state monitoring
  pc.onconnectionstatechange = (event) => {
    switch (pc.connectionState) {
      case "connected":
        console.log(`Connection established with peer ${targetId}`);
        break;
      case "disconnected":
        console.log(`Connection disconnected with peer ${targetId}`);
        break;
      case "failed":
        console.log(`Connection failed with peer ${targetId}`);
        // Consider implementing a reconnection strategy here
        break;
      case "closed":
        console.log(`Connection closed with peer ${targetId}`);
        break;
    }
  };

  // ICE connection state monitoring
  pc.oniceconnectionstatechange = (event) => {
    console.log(
      `ICE connection state with ${targetId}: ${pc.iceConnectionState}`
    );
  };

  // Signaling state monitoring
  pc.onsignalingstatechange = (event) => {
    console.log(`Signaling state with ${targetId}: ${pc.signalingState}`);
  };

  return pc;
};

export { createPeerConnection };
