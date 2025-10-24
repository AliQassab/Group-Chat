class WebSocketChatApp {
  constructor() {
    this.username = "";
    this.messages = [];
    this.users = [];
    this.isConnected = false;
    this.ws = null;
    this.serverUrl = this.getWebSocketUrl();

    this.initializeElements();
    this.setupEventListeners();
    this.setupAutoResize();
    this.showJoinModal();
  }

  getWebSocketUrl() {
    // Get current page protocol and host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // For development (localhost or 127.0.0.1)
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return `${protocol}//localhost:3001`;
    }

    // For production - use your production WebSocket URL
    return `${protocol}//aliaqassab-websocket-backend.hosting.codeyourfuture.io`;
  }

  initializeElements() {
    // Modal elements
    this.joinModal = document.getElementById("joinModal");
    this.joinForm = document.getElementById("joinForm");
    this.usernameInput = document.getElementById("usernameInput");
    this.joinBtn = document.getElementById("joinBtn");
    this.joinError = document.getElementById("joinError");

    // Header elements
    this.connectionStatus = document.getElementById("connectionStatus");
    this.onlineUsersCount = document.getElementById("onlineUsersCount");

    // Messages elements
    this.messagesContainer = document.getElementById("messagesContainer");
    this.messageInput = document.getElementById("messageInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.inputError = document.getElementById("inputError");

    // Sidebar elements
    this.sidebar = document.getElementById("sidebar");
    this.usersList = document.getElementById("usersList");
    this.userCount = document.getElementById("userCount");
  }

  setupEventListeners() {
    // Join form
    this.joinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleJoin();
    });

    // Message form
    this.sendBtn.addEventListener("click", () => this.sendMessage());

    // Enter to send message
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      if (this.ws) {
        this.ws.close();
      }
    });
  }

  setupAutoResize() {
    this.messageInput.addEventListener("input", () => {
      this.messageInput.style.height = "auto";
      this.messageInput.style.height =
        Math.min(this.messageInput.scrollHeight, 120) + "px";
    });
  }

  showJoinModal() {
    this.joinModal.classList.remove("hidden");
    this.usernameInput.focus();
  }

  hideJoinModal() {
    this.joinModal.classList.add("hidden");
  }

  handleJoin() {
    const username = this.usernameInput.value.trim();

    if (!username) {
      this.showJoinError("Please enter a username");
      return;
    }

    if (username.length < 3) {
      this.showJoinError("Username too short (min 3 characters)");
      return;
    }

    if (username.length > 20) {
      this.showJoinError("Username too long (max 20 characters)");
      return;
    }

    // Allow Unicode letters, numbers, underscore, dash, and spaces (but not only spaces)
    if (!/^[\p{L}\p{N}_\s-]+$/u.test(username) || /^\s+$/.test(username)) {
      this.showJoinError(
        "Username can contain letters, numbers, spaces, underscore, and dash"
      );
      return;
    }

    this.username = username;
    this.hideJoinModal();
    this.connectWebSocket();
  }

  showJoinError(message) {
    this.joinError.textContent = message;
    this.joinError.classList.remove("hidden");
    setTimeout(() => {
      this.joinError.classList.add("hidden");
    }, 3000);
  }

  connectWebSocket() {
    this.updateConnectionStatus("connecting");

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log("🔗 Connected to WebSocket server");
        this.isConnected = true;
        this.updateConnectionStatus("connected");
        this.enableInput();

        // Send join command
        this.sendToServer({
          command: "join",
          data: { username: this.username },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error("❌ Error parsing server message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket connection closed");
        this.isConnected = false;
        this.updateConnectionStatus("disconnected");
        this.disableInput();
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.isConnected = false;
        this.updateConnectionStatus("disconnected");
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      this.updateConnectionStatus("disconnected");
    }
  }

  handleServerMessage(data) {
    console.log("📨 Received:", data.command);

    switch (data.command) {
      case "connection-established":
        break;

      case "join-success":
        this.handleJoinSuccess(data.data);
        break;

      case "new-message":
        this.handleNewMessage(data.data.message);
        break;

      case "message-updated":
        this.handleMessageUpdate(data.data.message);
        break;

      case "user-joined":
        this.handleUserJoined(data.data);
        break;

      case "user-left":
        this.handleUserLeft(data.data);
        break;

      case "error":
        this.handleError(data.data.message);
        break;

      default:
        console.log("❓ Unknown command:", data.command);
    }
  }

  handleJoinSuccess(data) {
    // Load message history
    if (data.messages) {
      this.messages = data.messages;
      this.displayMessages();
    }

    // Update users
    if (data.onlineUsers) {
      this.updateUsersList(data.onlineUsers);
    }
  }

  handleNewMessage(message) {
    this.messages.push(message);
    this.displayMessage(message, true);
    this.scrollToBottom();
  }

  handleMessageUpdate(updatedMessage) {
    const index = this.messages.findIndex((m) => m.id === updatedMessage.id);
    if (index !== -1) {
      this.messages[index] = updatedMessage;
      this.updateMessageDisplay(updatedMessage);
    }
  }

  handleUserJoined(data) {
    this.showSystemMessage(`${data.username} joined the chat`);
    this.updateUsersList(data.onlineUsers);
  }

  handleUserLeft(data) {
    this.showSystemMessage(`${data.username} left the chat`);
    this.updateUsersList(data.onlineUsers);
  }

  handleError(message) {
    console.error("❌ Server error:", message);

    if (message === "Username already taken") {
      this.showJoinModal();
      this.showJoinError(message);
    } else if (message === "Must join with username first") {
      // User was disconnected, try to rejoin automatically
      if (this.username) {
        console.log("🔄 Auto-rejoining with existing username");
        this.sendToServer({
          command: "join",
          data: { username: this.username },
        });
      } else {
        this.showJoinModal();
      }
    } else {
      this.showInputError(message);
    }
  }

  sendToServer(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket not connected");
      this.showInputError("Not connected to server");
    }
  }

  sendMessage() {
    const content = this.messageInput.value.trim();

    if (!content) return;

    if (!this.isConnected) {
      this.showInputError("Not connected to server");
      return;
    }

    this.sendToServer({
      command: "send-message",
      data: { content },
    });

    // Clear input and reset height
    this.messageInput.value = "";
    this.messageInput.style.height = "auto";
    this.clearInputError();
  }

  likeMessage(messageId) {
    if (!this.isConnected) {
      this.showInputError("Not connected to server");
      return;
    }

    this.sendToServer({
      command: "like-message",
      data: { messageId },
    });
  }

  dislikeMessage(messageId) {
    if (!this.isConnected) {
      this.showInputError("Not connected to server");
      return;
    }

    this.sendToServer({
      command: "dislike-message",
      data: { messageId },
    });
  }

  displayMessages() {
    this.messagesContainer.innerHTML = "";
    this.messages.forEach((message) => {
      this.displayMessage(message, false);
    });
    this.scrollToBottom();
  }

  displayMessage(message, animate = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      message.author === this.username ? "own" : ""
    }`;
    messageDiv.id = `message-${message.id}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    bubble.innerHTML = `
                    <div class="message-author">${this.escapeHtml(
                      message.author
                    )}</div>
                    <div class="message-content">${this.formatMessage(
                      message.content
                    )}</div>
                    <div class="message-footer">
                        <div class="message-actions">
                            <button class="action-btn like-btn" onclick="chatApp.likeMessage('${
                              message.id
                            }')" title="Like this message">
                                👍 <span id="likes-${message.id}">${
      message.likes
    }</span>
                            </button>
                            <button class="action-btn dislike-btn" onclick="chatApp.dislikeMessage('${
                              message.id
                            }')" title="Dislike this message">
                                👎 <span id="dislikes-${message.id}">${
      message.dislikes
    }</span>
                            </button>
                        </div>
                        <div class="message-time">${this.formatTime(
                          message.timestamp
                        )}</div>
                    </div>
                `;

    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);

    if (animate) {
      messageDiv.style.opacity = "0";
      messageDiv.style.transform = "translateY(10px)";
      setTimeout(() => {
        messageDiv.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        messageDiv.style.opacity = "1";
        messageDiv.style.transform = "translateY(0)";
      }, 10);
    }
  }

  updateMessageDisplay(message) {
    const likesElement = document.getElementById(`likes-${message.id}`);
    const dislikesElement = document.getElementById(`dislikes-${message.id}`);

    if (likesElement) {
      likesElement.textContent = message.likes;
      // Add animation effect
      likesElement.parentElement.style.transform = "scale(1.2)";
      setTimeout(() => {
        likesElement.parentElement.style.transform = "scale(1)";
      }, 200);
    }

    if (dislikesElement) {
      dislikesElement.textContent = message.dislikes;
      // Add animation effect
      dislikesElement.parentElement.style.transform = "scale(1.2)";
      setTimeout(() => {
        dislikesElement.parentElement.style.transform = "scale(1)";
      }, 200);
    }
  }

  showSystemMessage(text) {
    const systemDiv = document.createElement("div");
    systemDiv.className = "system-message";
    systemDiv.innerHTML = `
                    <div>${this.escapeHtml(text)}</div>
                    <div style="font-size: 0.75rem; margin-top: 0.25rem;">${this.formatTime(
                      Date.now()
                    )}</div>
                `;
    this.messagesContainer.appendChild(systemDiv);
    this.scrollToBottom();
  }

  updateUsersList(usernames) {
    this.users = usernames || [];
    this.usersList.innerHTML = "";

    // Update counts
    const userCount = this.users.length;
    this.userCount.textContent = `${userCount} user${
      userCount !== 1 ? "s" : ""
    }`;
    this.onlineUsersCount.textContent = `${userCount} user${
      userCount !== 1 ? "s" : ""
    } online`;

    // Display users
    this.users.forEach((username) => {
      const userItem = document.createElement("div");
      userItem.className = `user-item ${
        username === this.username ? "current-user" : ""
      }`;

      userItem.innerHTML = `
                        <div class="user-avatar">${username
                          .charAt(0)
                          .toUpperCase()}</div>
                        <div class="user-name">${this.escapeHtml(
                          username
                        )}</div>
                        <div class="online-indicator"></div>
                    `;

      this.usersList.appendChild(userItem);
    });

    // Show "you" indicator for current user
    if (this.users.includes(this.username)) {
      const currentUserElement = this.usersList.querySelector(
        ".current-user .user-name"
      );

      if (currentUserElement) {
        currentUserElement.innerHTML +=
          ' <span style="font-size: 0.75rem; opacity: 0.8;">(you)</span>';
      }
    }
  }

  updateConnectionStatus(status) {
    const statusConfig = {
      connecting: {
        text: "Connecting...",
        class: "status-connecting",
      },
      connected: {
        text: "Connected",
        class: "status-connected",
      },
      disconnected: {
        text: "Disconnected",
        class: "status-disconnected",
      },
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    this.connectionStatus.className = `connection-status ${config.class}`;
    this.connectionStatus.querySelector(".status-text").textContent =
      config.text;

    // Update input state
    if (status === "connected") {
      this.enableInput();
    } else {
      this.disableInput();
    }
  }

  enableInput() {
    this.messageInput.disabled = false;
    this.sendBtn.disabled = false;
    this.messageInput.placeholder = "Type your message...";
  }

  disableInput() {
    this.messageInput.disabled = true;
    this.sendBtn.disabled = true;
    this.messageInput.placeholder = "Connecting...";
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();

    if (isToday) {
      // Show time only for today's messages
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      // Show date and time for older messages
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  formatMessage(content) {
    // Basic message formatting
    return this.escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **bold**
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // *italic*
      .replace(/__(.*?)__/g, "<u>$1</u>") // __underline__
      .replace(/\n/g, "<br>"); // Line breaks
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showInputError(message) {
    this.inputError.textContent = message;
    this.inputError.classList.remove("hidden");
    setTimeout(() => {
      this.clearInputError();
    }, 3000);
  }

  clearInputError() {
    this.inputError.classList.add("hidden");
    this.inputError.textContent = "";
  }

  // Cleanup method
  destroy() {
    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
    }
  }
}

// Initialize the chat application
const chatApp = new WebSocketChatApp();

// Global cleanup
window.addEventListener("beforeunload", () => {
  chatApp.destroy();
});

// Global error handler
window.addEventListener("error", (event) => {
  console.error("❌ Global error:", event.error);
});

// Prevent zoom on double-tap for mobile
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  false
);
