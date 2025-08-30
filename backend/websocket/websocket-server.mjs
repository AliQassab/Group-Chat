// websocket-server.mjs
import { server as WebSocketServer } from "websocket";

export function createWebSocketServer(httpServer, wsHandler, options = {}) {
  const {
    allowedOrigins = ["http://localhost:5500", "http://127.0.0.1:5500"],
    autoAcceptConnections = false,
  } = options;

  const wsServer = new WebSocketServer({
    httpServer,
    autoAcceptConnections,
  });

  wsServer.on("request", (request) => {
    if (!allowedOrigins.includes(request.origin)) {
      request.reject(403, "Origin not allowed");
      return;
    }

    const connection = request.accept(null, request.origin);
    const connectionId = wsHandler.generateConnectionId();

    wsHandler.addConnection(connectionId, connection);

    wsHandler.sendToConnection(connectionId, {
      command: "connection-established",
      data: { connectionId },
    });

    connection.on("message", (message) => {
      wsHandler.handleMessage(connectionId, message).catch((err) => {
        console.error("❌ Error handling message:", err);
        wsHandler.sendError(connectionId, "Server error");
      });
    });

    connection.on("close", () => {
      const user = wsHandler.removeConnection(connectionId);

      if (user) {
        wsHandler.broadcastToAll({
          command: "user-left",
          data: {
            username: user.username,
            timestamp: Date.now(),
            onlineUsers: wsHandler.userService.getUsernames(),
          },
        });
      }
    });

    connection.on("error", (error) => {
      console.error(`❌ WebSocket error for ${connectionId}:`, error);
      wsHandler.removeConnection(connectionId);
    });
  });

  return wsServer;
}
