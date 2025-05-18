import { io } from "socket.io-client";

const socket = io("https://fermion-assignment-backend.onrender.com", {
  transports: ["websocket"],
  path: "/socket.io",
  autoConnect: false,
  upgrade: false,
  reconnectionAttempts: 5,
});

export default socket;
