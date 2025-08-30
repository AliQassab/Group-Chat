class WebSocketHandler {
  constructor(messageService, userService) {
    this.messageService = messageService;
    this.userService = userService;
    this.connections = new Map();
  }

  addConnection(connectionId, connection) {
    this.connections.set(connectionId, { connection, user: null });
    console.log(`➕ Connection added: ${connectionId}`);
  }
  removeConnection(connectionId) {
    const connectionData = this.connections.get(connectionId);
    if (connectionData) {
      // Remove user if exists
      if (connectionData.user) {
        this.userService.removeUser(connectionId);
      }
      this.connections.delete(connectionId);
      console.log(`➖ Connection removed: ${connectionId}`);
      return connectionData.user;
    }
    return null;
  }

  async handleMessage(connectionId, message) {
    if (message.type !== "utf8") {
      this.sendError(connectionId, "Only text messages are supported");
      return;
    }

    try {
      const data = JSON.parse(message.utf8Data);
      console.log(`📨 Message from ${connectionId}:`, data.command);

      switch (data.command) {
        case "join":
          await this.handleJoin(connectionId, data);
          break;

        case "send-message":
          await this.handleSendMessage(connectionId, data);
          break;

        case "like-message":
          await this.handleLikeMessage(connectionId, data);
          break;

        case "dislike-message":
          await this.handleDislikeMessage(connectionId, data);
          break;

        case "get-messages":
          this.handleGetMessages(connectionId, data);
          break;

        default:
          this.sendError(connectionId, `Unknown command: ${data.command}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${connectionId}:`, error);
      this.sendError(connectionId, "Invalid message format");
    }
  }

  async handleJoin(connectionId, data) {
    const { username } = data.data || {};
    const connectionData = this.connections.get(connectionId);

    if (!connectionData) {
      this.sendError(connectionId, "Connection not found");
      return;
    }

    const validation = this.userService.validateUsername(username);
    if (!validation.isValid) {
      this.sendError(connectionId, validation.errors.join(", "));
      return;
    }

    const result = this.userService.addUser(connectionId, username);
    if (!result.success) {
      this.sendError(connectionId, result.error);
      return;
    }

    // Store user in connection data
    connectionData.user = result.user;

    this.sendToConnection(connectionId, {
      command: "join-success",
      data: {
        user: result.user,
        messages: this.messageService.getAllMessages(),
        onlineUsers: this.userService.getUsernames(),
      },
    });

    this.broadcastToOthers(connectionId, {
      command: "user-joined",
      data: {
        username,
        timestamp: Date.now(),
        onlineUsers: this.userService.getUsernames(),
      },
    });

    console.log(`👋 User ${username} joined (${connectionId})`);
  }

  async handleSendMessage(connectionId, data) {
    const user = this.userService.getUser(connectionId);
    if (!user) {
      this.sendError(connectionId, "Must join with username first");
      return;
    }

    const { content } = data.data || {};

    const validation = this.messageService.validateMessage(
      user.username,
      content
    );
    if (!validation.isValid) {
      this.sendError(connectionId, validation.errors.join(", "));
      return;
    }

    try {
      const message = await this.messageService.createMessage(
        user.username,
        content
      );

      this.broadcastToAll({
        command: "new-message",
        data: { message },
      });

      console.log(
        `💬 Message from ${user.username}: ${content.substring(0, 50)}...`
      );
    } catch (err) {
      console.error("❌ Failed to create message:", err);
      this.sendError(connectionId, "Could not save message");
    }
  }

  async handleLikeMessage(connectionId, data) {
    const user = this.userService.getUser(connectionId);
    if (!user) {
      this.sendError(connectionId, "Must join with username first");
      return;
    }

    const { messageId } = data.data || {};
    const updatedMessage = this.messageService.likeMessage(
      messageId,
      user.username
    );

    if (!updatedMessage) {
      this.sendError(connectionId, "Message not found");
      return;
    }

    this.broadcastToAll({
      command: "message-updated",
      data: { message: updatedMessage },
    });

    console.log(`👍 ${user.username} liked message ${messageId}`);
  }

  async handleDislikeMessage(connectionId, data) {
    const user = this.userService.getUser(connectionId);
    if (!user) {
      this.sendError(connectionId, "Must join with username first");
      return;
    }

    const { messageId } = data.data || {};
    const updatedMessage = this.messageService.dislikeMessage(
      messageId,
      user.username // ✅ pass username
    );

    if (!updatedMessage) {
      this.sendError(connectionId, "Message not found");
      return;
    }

    this.broadcastToAll({
      command: "message-updated",
      data: { message: updatedMessage },
    });

    console.log(`👎 ${user.username} disliked message ${messageId}`);
  }

  handleGetMessages(connectionId, data) {
    const { since } = data.data || {};
    const messages = since
      ? this.messageService.getMessagesAfter(since)
      : this.messageService.getAllMessages();

    this.sendToConnection(connectionId, {
      command: "messages",
      data: { messages },
    });
  }

  handleDisconnection(connectionId, reasonCode, description) {
    console.log(
      `🔌 Connection ${connectionId} disconnected: ${reasonCode} - ${description}`
    );

    const userData = this.userService.removeUser(connectionId);
    this.connections.delete(connectionId);

    if (userData) {
      this.broadcastToAll({
        command: "user-left",
        data: {
          username: userData.username,
          timestamp: Date.now(),
          onlineUsers: this.userService.getUsernames(),
        },
      });

      console.log(`👋 User ${userData.username} left`);
    }
  }

  sendToConnection(connectionId, data) {
    const connectionData = this.connections.get(connectionId);
    if (connectionData && connectionData.connection.connected) {
      try {
        connectionData.connection.sendUTF(JSON.stringify(data));
        console.log("📨 Sent:", data.command);
      } catch (error) {
        console.error(`❌ Error sending to connection ${connectionId}:`, error);
      }
    }
  }

  sendError(connectionId, message) {
    this.sendToConnection(connectionId, {
      command: "error",
      data: { message, timestamp: Date.now() },
    });
  }

  broadcastToAll(data) {
    this.connections.forEach((connectionData, connectionId) => {
      if (connectionData.connection.connected) {
        try {
          connectionData.connection.sendUTF(JSON.stringify(data));
        } catch (error) {
          console.error(`❌ Error broadcasting to ${connectionId}:`, error);
        }
      }
    });
  }

  broadcastToOthers(excludeConnectionId, data) {
    this.connections.forEach((connectionData, connectionId) => {
      if (
        connectionId !== excludeConnectionId &&
        connectionData.connection.connected
      ) {
        try {
          connectionData.connection.sendUTF(JSON.stringify(data));
        } catch (error) {
          console.error(`❌ Error broadcasting to ${connectionId}:`, error);
        }
      }
    });
  }

  generateConnectionId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

export default WebSocketHandler;
