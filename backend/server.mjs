import express from "express";
import http from "http";
import cors from "cors";

import MessageService from "./services/MessageService.js";
import UserService from "./services/UserService.js";
import WebSocketHandler from "./handlers/WebSocketHandler.js";
import routes from "./routes/routes.js";
import { createWebSocketServer } from "./websocket/websocket-server.mjs";

const PORT = process.env.PORT || 3001;

// NEW: read allowed origins from env (comma-separated), fallback to localhost for dev
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((s) => s.trim());

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://aliqassab-websocket-frontend.hosting.codeyourfuture.io",
    ],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "API is live",
    port: Number(PORT),
  });
});

const messageService = MessageService;
const userService = UserService;

// Keep your existing app routes
app.use("/", routes); // unchanged

const server = http.createServer(app);
const wsHandler = new WebSocketHandler(messageService, userService);
createWebSocketServer(server, wsHandler);

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 HTTP API available at http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
  });
});
