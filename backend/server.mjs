import express from "express";
import http from "http";
import cors from "cors";

import MessageService from "./services/MessageService.js";
import UserService from "./services/UserService.js";
import WebSocketHandler from "./handlers/WebSocketHandler.js";
import routes from "./routes/routes.js";
import { createWebSocketServer } from "./websocket/websocket-server.mjs";

const PORT = process.env.PORT || 3001;

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
app.use(express.json());

const messageService = MessageService;
const userService = UserService;
app.use("/", routes);

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
