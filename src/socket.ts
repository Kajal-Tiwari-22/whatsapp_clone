// src/socket.ts
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // backend server URL

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"], // match backend order
  withCredentials: true,                // allow cookies/auth headers
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
});
