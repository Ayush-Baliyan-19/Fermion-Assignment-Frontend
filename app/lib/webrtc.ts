export function createPeerConnection(
  socket: any,
  peerId: string,
  initiator: boolean
) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", {
        target: peerId,
        candidate: event.candidate,
      });
    }
  };

  return pc;
}
