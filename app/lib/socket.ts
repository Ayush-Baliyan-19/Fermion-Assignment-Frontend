import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  path: "/socket.io",
  autoConnect: false,
  upgrade: false,
  reconnectionAttempts: 5,
});

export default socket;
