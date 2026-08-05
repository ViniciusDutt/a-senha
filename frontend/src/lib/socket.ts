import { io } from "socket.io-client";

export const socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001",
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  },
);
