import express from "express";
import http from "node:http";
import cors from "cors";

import MessageService from "./services/MessageService.js";
import UserService from "./services/UserService.js";
import WebSocketHandler from "./handlers/WebSocketHandler.js";
import { createWebSocketServer } from "./websocket/websocket-server.mjs";

const PORT = process.env.PORT || 3001;

// const frontendURL =
//   "https://aliqassab-websocket-frontend.hosting.codeyourfuture.io";
const frontendURL = "https://group-chat-one.vercel.app";

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  `${frontendURL},http://localhost:5500,http://127.0.0.1:5500`
)
  .split(",")
  .map((s) => s.trim());

console.log("🌐 Allowed origins:", allowedOrigins);

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // allow no-origin (curl/health checks) and any configured origin
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      console.log(`❌ CORS blocked origin: ${origin}`);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "👋🏻 Hello from the backend",
  });
});

const messageService = MessageService;
const userService = UserService;

const server = http.createServer(app);
const wsHandler = new WebSocketHandler(messageService, userService);

// Pass the allowed origins to WebSocket server
createWebSocketServer(server, wsHandler, {
  allowedOrigins: allowedOrigins,
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`🔡 WebSocket server ready`);
  console.log(`🔗 HTTP API available at http://localhost:${PORT}`);
  console.log(`🔒 Allowed origins:`, allowedOrigins);
});

const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");

  // Close WebSocket connections
  wsHandler.connections.forEach((connectionData) => {
    if (connectionData.connection.connected) {
      connectionData.connection.close();
    }
  });

  // Close HTTP server
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);

process.on("SIGTERM", gracefulShutdown);
