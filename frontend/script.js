// class WebSocketChatApp {
//   constructor() {
//     this.ws = null;
//     this.username = "";
//     this.messages = [];
//     this.users = [];
//     this.isConnected = false;
//     this.reconnectAttempts = 0;
//     this.maxReconnectAttempts = 5;
//     this.reconnectDelay = 1000;
//     this.messageQueue = []; // Queue messages while disconnected
//     this.keepAliveInterval = null; // Keep connection alive

//     this.serverUrl = this.getWebSocketUrl();

//     this.initializeElements();
//     this.setupEventListeners();
//     this.showJoinModal();

//     // Auto-resize textarea
//     this.setupAutoResize();
//   }
//   getWebSocketUrl() {
//     // Get current page protocol and host
//     const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
//     const host = window.location.host;

//     // For development
//     if (host.includes("localhost") || host.includes("127.0.0.1")) {
//       return "ws://localhost:3001";
//     }

//     // For production - use same host as the webpage
//     return `${protocol}//${host}`;
//   }
//   initializeElements() {
//     // Modal elements
//     this.joinModal = document.getElementById("joinModal");
//     this.joinForm = document.getElementById("joinForm");
//     this.usernameInput = document.getElementById("usernameInput");
//     this.joinBtn = document.getElementById("joinBtn");
//     this.joinError = document.getElementById("joinError");

//     // Header elements
//     this.connectionStatus = document.getElementById("connectionStatus");
//     this.onlineUsersCount = document.getElementById("onlineUsersCount");

//     // Messages elements
//     this.messagesContainer = document.getElementById("messagesContainer");
//     this.messageInput = document.getElementById("messageInput");
//     this.sendBtn = document.getElementById("sendBtn");
//     this.inputError = document.getElementById("inputError");

//     // Sidebar elements
//     this.sidebar = document.getElementById("sidebar");
//     this.usersList = document.getElementById("usersList");
//     this.userCount = document.getElementById("userCount");
//   }

//   setupEventListeners() {
//     // Join form
//     this.joinForm.addEventListener("submit", (e) => {
//       e.preventDefault();
//       this.handleJoin();
//     });

//     // Message form
//     this.sendBtn.addEventListener("click", () => this.sendMessage());

//     // Enter to send message
//     this.messageInput.addEventListener("keydown", (e) => {
//       if (e.key === "Enter" && !e.shiftKey) {
//         e.preventDefault();
//         this.sendMessage();
//       }
//     });

//     // Window events
//     window.addEventListener("beforeunload", () => {
//       if (this.ws) {
//         this.ws.close();
//       }
//     });

//     window.addEventListener("online", () => {
//       if (!this.isConnected && this.username) {
//         this.connectWebSocket();
//       }
//     });

//     window.addEventListener("offline", () => {
//       this.updateConnectionStatus("disconnected");
//     });

//     // Mobile sidebar toggle (if needed)
//     if (window.innerWidth <= 768) {
//       this.setupMobileSidebar();
//     }
//   }

//   setupAutoResize() {
//     this.messageInput.addEventListener("input", () => {
//       this.messageInput.style.height = "auto";
//       this.messageInput.style.height =
//         Math.min(this.messageInput.scrollHeight, 120) + "px";
//     });
//   }

//   setupMobileSidebar() {
//     const sidebarToggle = document.getElementById("sidebarToggle");
//     sidebarToggle.addEventListener("click", () => {
//       this.sidebar.classList.toggle("hidden");
//     });
//   }

//   showJoinModal() {
//     this.joinModal.classList.remove("hidden");
//     this.usernameInput.focus();
//   }

//   hideJoinModal() {
//     this.joinModal.classList.add("hidden");
//   }

//   handleJoin() {
//     const username = this.usernameInput.value.trim();

//     if (!username) {
//       this.showJoinError("Please enter a username");
//       return;
//     }

//     if (username.length > 20) {
//       this.showJoinError("Username too long (max 20 characters)");
//       return;
//     }

//     if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
//       this.showJoinError(
//         "Username can only contain letters, numbers, underscore, and dash"
//       );
//       return;
//     }

//     this.username = username;
//     this.hideJoinModal();
//     this.connectWebSocket();
//   }

//   showJoinError(message) {
//     this.joinError.textContent = message;
//     this.joinError.classList.remove("hidden");
//     setTimeout(() => {
//       this.joinError.classList.add("hidden");
//     }, 3000);
//   }

//   showInputError(message) {
//     this.inputError.textContent = message;
//     this.inputError.classList.remove("hidden");
//     setTimeout(() => {
//       this.clearInputError();
//     }, 3000);
//   }

//   connectWebSocket() {
//     this.updateConnectionStatus("connecting");

//     try {
//       // Close existing connection if any
//       if (this.ws) {
//         this.ws.close(1000, "Reconnecting");
//       }

//       this.ws = new WebSocket(this.serverUrl);

//       // Set connection timeout
//       const connectionTimeout = setTimeout(() => {
//         if (this.ws.readyState === WebSocket.CONNECTING) {
//           this.ws.close();
//           this.attemptReconnect();
//         }
//       }, 10000); // 10 second timeout

//       this.ws.onopen = () => {
//         clearTimeout(connectionTimeout);
//         console.log("🔗 Connected to WebSocket server");
//         this.isConnected = true;
//         this.reconnectAttempts = 0;
//         this.updateConnectionStatus("connected");
//         this.enableInput();
//         this.startKeepAlive(); // Start keep-alive on successful connection

//         // Send join command
//         this.sendToServer({
//           command: "join",
//           data: { username: this.username },
//         });

//         // Process queued messages
//         this.processMessageQueue();
//       };

//       this.ws.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           this.handleServerMessage(data);
//         } catch (error) {
//           console.error("❌ Error parsing server message:", error);
//         }
//       };

//       this.ws.onclose = (event) => {
//         clearTimeout(connectionTimeout);
//         console.log(
//           "🔌 WebSocket connection closed:",
//           event.code,
//           event.reason
//         );
//         this.isConnected = false;
//         this.updateConnectionStatus("disconnected");
//         this.disableInput();
//         this.stopKeepAlive(); // Stop keep-alive on connection close

//         // Only attempt reconnection for unexpected closures
//         if (event.code !== 1000 && event.code !== 1001 && this.username) {
//           console.log("🔄 Attempting to reconnect due to unexpected closure");
//           this.attemptReconnect();
//         } else {
//           console.log("ℹ️ Normal connection closure, not attempting reconnect");
//         }
//       };

//       this.ws.onerror = (error) => {
//         clearTimeout(connectionTimeout);
//         console.error("❌ WebSocket error:", error);
//         // Don't immediately mark as disconnected on error
//         // Let the onclose event handle the connection state
//       };

//       // Add connection health monitoring
//       this.startConnectionMonitoring();
//     } catch (error) {
//       console.error("❌ Failed to create WebSocket connection:", error);
//       this.updateConnectionStatus("disconnected");
//       this.showNotification("Failed to connect to server", "error");
//     }
//   }

//   // attemptReconnect() {
//   //   if (this.reconnectAttempts >= this.maxReconnectAttempts) {
//   //     console.log("❌ Max reconnection attempts reached");
//   //     this.showNotification(
//   //       "Unable to reconnect. Please refresh the page.",
//   //       "error"
//   //     );
//   //     return;
//   //   }

//   //   this.reconnectAttempts++;
//   //   this.updateConnectionStatus("connecting");

//   //   const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

//   //   console.log(
//   //     `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
//   //   );

//   //   setTimeout(() => {
//   //     if (!this.isConnected) {
//   //       console.log(`🔄 Attempting reconnection...`);
//   //       this.connectWebSocket();
//   //     }
//   //   }, delay);
//   // }

//   // Handle reconnection with same username
//   handleReconnection() {
//     if (this.username && !this.isConnected) {
//       console.log(`🔄 Attempting to reconnect as ${this.username}`);
//       this.connectWebSocket();
//     }
//   }

//   handleServerMessage(data) {
//     console.log("📨 Received:", data.command);

//     switch (data.command) {
//       case "connection-established":
//         console.log("✅ Connection established");
//         break;

//       case "join-success":
//         this.handleJoinSuccess(data.data);
//         break;

//       case "new-message":
//         this.handleNewMessage(data.data.message);
//         break;

//       case "message-sent":
//         // Handle confirmation that our message was sent successfully
//         console.log("✅ Message sent successfully");
//         break;

//       case "message-updated":
//         this.handleMessageUpdate(data.data.message);
//         break;

//       case "user-joined":
//         this.handleUserJoined(data.data);
//         break;

//       case "user-left":
//         this.handleUserLeft(data.data);
//         break;

//       case "user-reconnected":
//         this.handleUserReconnected(data.data);
//         break;

//       case "error":
//         this.handleError(data.data.message);
//         break;

//       case "ping":
//         // Respond to heartbeat
//         this.sendToServer({
//           command: "pong",
//           data: { timestamp: Date.now() },
//         });
//         break;

//       case "user-already-connected":
//         // Handle case where username is already taken
//         this.handleUserAlreadyConnected(data.data);
//         break;

//       //   case "pong":
//       //     // Handle heartbeat response
//       //     break;

//       default:
//         console.log("❓ Unknown command:", data.command);
//     }
//   }

//   handleJoinSuccess(data) {
//     console.log("🎉 Successfully joined chat");
//     this.showNotification("Successfully joined the chat!", "success");

//     // Reset reconnection attempts on successful connection
//     this.reconnectAttempts = 0;

//     // Load message history
//     if (data.messages) {
//       this.messages = data.messages;
//       this.displayMessages();
//     }

//     // Update users
//     if (data.onlineUsers) {
//       this.updateUsersList(data.onlineUsers);
//     }

//     // Process any queued messages
//     this.processMessageQueue();
//   }

//   handleNewMessage(message) {
//     this.messages.push(message);
//     this.displayMessage(message, true);
//     this.scrollToBottom();

//     // Play notification sound for other users' messages
//     if (message.author !== this.username) {
//       this.playNotificationSound();
//     }
//   }

//   handleMessageUpdate(updatedMessage) {
//     const index = this.messages.findIndex((m) => m.id === updatedMessage.id);
//     if (index !== -1) {
//       this.messages[index] = updatedMessage;
//       this.updateMessageDisplay(updatedMessage);
//     }
//   }

//   handleUserJoined(data) {
//     this.showSystemMessage(`${data.username} joined the chat`);
//     this.updateUsersList(data.onlineUsers);
//     this.showNotification(`${data.username} joined the chat`, "info");
//   }

//   handleUserLeft(data) {
//     // Check if this is actually the current user reconnecting
//     if (data.username === this.username) {
//       console.log("ℹ️ Current user left, but may be reconnecting");
//       return;
//     }

//     this.showSystemMessage(`${data.username} left the chat`);
//     this.updateUsersList(data.onlineUsers);
//   }

//   handleUserReconnected(data) {
//     this.showSystemMessage(`${data.username} reconnected to the chat`);
//     this.updateUsersList(data.onlineUsers);
//     this.showNotification(`${data.username} reconnected`, "info");
//   }

//   handleUserAlreadyConnected(data) {
//     this.showJoinError("Username already taken by another user");
//     // Don't show the join modal again, just show the error
//   }

//   handleError(message) {
//     console.error("❌ Server error:", message);

//     if (message === "Username already taken") {
//       this.showJoinModal();
//       this.showJoinError(message);
//     } else {
//       this.showInputError(message);
//     }
//   }

//   sendToServer(data) {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       try {
//         this.ws.send(JSON.stringify(data));
//         console.log(`📤 Sent command: ${data.command}`);
//       } catch (error) {
//         console.error("❌ Error sending message:", error);
//         // Don't immediately disconnect, let the connection monitoring handle it
//         this.showInputError(
//           "Failed to send message, attempting to reconnect..."
//         );
//         this.handleReconnection();
//       }
//     } else {
//       console.warn("⚠️ WebSocket not connected, queuing message");
//       this.messageQueue.push(data);
//       this.showInputError(
//         "Not connected to server. Message will be sent when reconnected."
//       );

//       // Try to reconnect if not already attempting
//       if (!this.isConnected && this.username) {
//         this.handleReconnection();
//       }
//     }
//   }

//   processMessageQueue() {
//     while (this.messageQueue.length > 0) {
//       const queuedMessage = this.messageQueue.shift();
//       this.sendToServer(queuedMessage);
//     }
//   }

//   sendMessage() {
//     const content = this.messageInput.value.trim();

//     if (!content) return;

//     if (
//       !this.isConnected ||
//       !this.ws ||
//       this.ws.readyState !== WebSocket.OPEN
//     ) {
//       this.showInputError(
//         "Not connected to server, attempting to reconnect..."
//       );

//       // Try to reconnect and queue the message
//       if (this.username) {
//         this.handleReconnection();
//         // Queue the message to be sent after reconnection
//         this.messageQueue.push({
//           command: "send-message",
//           data: { content },
//         });
//       }
//       return;
//     }

//     this.sendToServer({
//       command: "send-message",
//       data: { content },
//     });

//     // Clear input and reset height
//     this.messageInput.value = "";
//     this.messageInput.style.height = "auto";
//     this.clearInputError();
//   }
//   likeMessage(messageId) {
//     if (
//       !this.isConnected ||
//       !this.ws ||
//       this.ws.readyState !== WebSocket.OPEN
//     ) {
//       this.showInputError(
//         "Not connected to server, attempting to reconnect..."
//       );

//       // Try to reconnect and queue the action
//       if (this.username) {
//         this.handleReconnection();
//         this.messageQueue.push({
//           command: "like-message",
//           data: { messageId },
//         });
//       }
//       return;
//     }

//     this.sendToServer({
//       command: "like-message",
//       data: { messageId },
//     });
//   }

//   dislikeMessage(messageId) {
//     if (
//       !this.isConnected ||
//       !this.ws ||
//       this.ws.readyState !== WebSocket.OPEN
//     ) {
//       this.showInputError(
//         "Not connected to server, attempting to reconnect..."
//       );

//       // Try to reconnect and queue the action
//       if (this.username) {
//         this.handleReconnection();
//         this.messageQueue.push({
//           command: "dislike-message",
//           data: { messageId },
//         });
//       }
//       return;
//     }

//     this.sendToServer({
//       command: "dislike-message",
//       data: { messageId },
//     });
//   }

//   displayMessages() {
//     this.messagesContainer.innerHTML = "";
//     this.messages.forEach((message) => {
//       this.displayMessage(message, false);
//     });
//     this.scrollToBottom();
//   }

//   displayMessage(message, animate = true) {
//     const messageDiv = document.createElement("div");
//     messageDiv.className = `message ${
//       message.author === this.username ? "own" : ""
//     }`;
//     messageDiv.id = `message-${message.id}`;

//     const bubble = document.createElement("div");
//     bubble.className = "message-bubble";

//     bubble.innerHTML = `
//                     <div class="message-author">${this.escapeHtml(
//                       message.author
//                     )}</div>
//                     <div class="message-content">${this.formatMessage(
//                       message.content
//                     )}</div>
//                     <div class="message-footer">
//                         <div class="message-actions">
//                             <button class="action-btn like-btn" onclick="chatApp.likeMessage(${
//                               message.id
//                             })" title="Like this message">
//                                 👍 <span id="likes-${message.id}">${
//       message.likes
//     }</span>
//                             </button>
//                             <button class="action-btn dislike-btn" onclick="chatApp.dislikeMessage(${
//                               message.id
//                             })" title="Dislike this message">
//                                 👎 <span id="dislikes-${message.id}">${
//       message.dislikes
//     }</span>
//                             </button>
//                         </div>
//                         <div class="message-time">${this.formatTime(
//                           message.timestamp
//                         )}</div>
//                     </div>
//                 `;

//     messageDiv.appendChild(bubble);
//     this.messagesContainer.appendChild(messageDiv);

//     if (animate) {
//       messageDiv.style.opacity = "0";
//       messageDiv.style.transform = "translateY(10px)";
//       setTimeout(() => {
//         messageDiv.style.transition = "opacity 0.3s ease, transform 0.3s ease";
//         messageDiv.style.opacity = "1";
//         messageDiv.style.transform = "translateY(0)";
//       }, 10);
//     }
//   }

//   updateMessageDisplay(message) {
//     const likesElement = document.getElementById(`likes-${message.id}`);
//     const dislikesElement = document.getElementById(`dislikes-${message.id}`);

//     if (likesElement) {
//       likesElement.textContent = message.likes;
//       // Add animation effect
//       likesElement.parentElement.style.transform = "scale(1.2)";
//       setTimeout(() => {
//         likesElement.parentElement.style.transform = "scale(1)";
//       }, 200);
//     }

//     if (dislikesElement) {
//       dislikesElement.textContent = message.dislikes;
//       // Add animation effect
//       dislikesElement.parentElement.style.transform = "scale(1.2)";
//       setTimeout(() => {
//         dislikesElement.parentElement.style.transform = "scale(1)";
//       }, 200);
//     }
//   }

//   showSystemMessage(text) {
//     const systemDiv = document.createElement("div");
//     systemDiv.className = "system-message";
//     systemDiv.innerHTML = `
//                     <div>${this.escapeHtml(text)}</div>
//                     <div style="font-size: 0.75rem; margin-top: 0.25rem;">${this.formatTime(
//                       Date.now()
//                     )}</div>
//                 `;
//     this.messagesContainer.appendChild(systemDiv);
//     this.scrollToBottom();
//   }

//   updateUsersList(usernames) {
//     this.users = usernames || [];
//     this.usersList.innerHTML = "";

//     // Update counts
//     const userCount = this.users.length;
//     this.userCount.textContent = `${userCount} user${
//       userCount !== 1 ? "s" : ""
//     }`;
//     this.onlineUsersCount.textContent = `${userCount} user${
//       userCount !== 1 ? "s" : ""
//     } online`;

//     // Display users
//     this.users.forEach((username) => {
//       const userItem = document.createElement("div");
//       userItem.className = `user-item ${
//         username === this.username ? "current-user" : ""
//       }`;

//       userItem.innerHTML = `
//                         <div class="user-avatar">${username
//                           .charAt(0)
//                           .toUpperCase()}</div>
//                         <div class="user-name">${this.escapeHtml(
//                           username
//                         )}</div>
//                         <div class="online-indicator"></div>
//                     `;

//       this.usersList.appendChild(userItem);
//     });

//     // Show "you" indicator for current user
//     if (this.users.includes(this.username)) {
//       const currentUserElement = this.usersList.querySelector(
//         ".current-user .user-name"
//       );
//       if (currentUserElement) {
//         currentUserElement.innerHTML +=
//           ' <span style="font-size: 0.75rem; opacity: 0.8;">(you)</span>';
//       }
//     }
//   }

//   updateConnectionStatus(status) {
//     const statusConfig = {
//       connecting: {
//         text: "Connecting...",
//         class: "status-connecting",
//       },
//       connected: {
//         text: "Connected",
//         class: "status-connected",
//       },
//       disconnected: {
//         text: "Disconnected",
//         class: "status-disconnected",
//       },
//     };

//     const config = statusConfig[status] || statusConfig.disconnected;

//     this.connectionStatus.className = `connection-status ${config.class}`;
//     this.connectionStatus.querySelector(".status-text").textContent =
//       config.text;

//     // Update input state
//     if (status === "connected") {
//       this.enableInput();
//     } else {
//       this.disableInput();
//     }
//   }

//   enableInput() {
//     this.messageInput.disabled = false;
//     this.sendBtn.disabled = false;
//     this.messageInput.placeholder = "Type your message...";
//   }

//   disableInput() {
//     this.messageInput.disabled = true;
//     this.sendBtn.disabled = true;
//     this.messageInput.placeholder = "Connecting...";
//   }

//   scrollToBottom() {
//     this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
//   }

//   formatTime(timestamp) {
//     const date = new Date(timestamp);
//     const now = new Date();
//     const diffInHours = (now - date) / (1000 * 60 * 60);

//     if (diffInHours < 24) {
//       return date.toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     } else {
//       return date.toLocaleDateString("en-US", {
//         month: "short",
//         day: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     }
//   }

//   formatMessage(content) {
//     // Basic message formatting
//     return this.escapeHtml(content)
//       .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **bold**
//       .replace(/\*(.*?)\*/g, "<em>$1</em>") // *italic*
//       .replace(/__(.*?)__/g, "<u>$1</u>") // __underline__
//       .replace(/\n/g, "<br>"); // Line breaks
//   }

//   escapeHtml(text) {
//     const div = document.createElement("div");
//     div.textContent = text;
//     return div.innerHTML;
//   }

//   showNotification(message, type = "info") {
//     const notification = document.createElement("div");
//     notification.className = `notification ${type}`;
//     notification.textContent = message;

//     document.body.appendChild(notification);

//     // Auto-remove after 3 seconds
//     setTimeout(() => {
//       notification.style.animation = "notificationSlide 0.3s ease-out reverse";
//       setTimeout(() => {
//         document.body.removeChild(notification);
//       }, 300);
//     }, 3000);
//   }

//   clearInputError() {
//     this.inputError.classList.add("hidden");
//     this.inputError.textContent = "";
//   }

//   playNotificationSound() {
//     // Simple notification sound using Web Audio API
//     try {
//       const audioContext = new (window.AudioContext ||
//         window.webkitAudioContext)();
//       const oscillator = audioContext.createOscillator();
//       const gainNode = audioContext.createGain();

//       oscillator.connect(gainNode);
//       gainNode.connect(audioContext.destination);

//       oscillator.frequency.value = 800;
//       oscillator.type = "sine";

//       gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
//       gainNode.gain.exponentialRampToValueAtTime(
//         0.01,
//         audioContext.currentTime + 0.2
//       );

//       oscillator.start(audioContext.currentTime);
//       oscillator.stop(audioContext.currentTime + 0.2);
//     } catch (error) {
//       // Ignore audio errors (browsers might block audio without user interaction)
//       console.error("❌ Audio error:", error);
//     }
//   }

//   startKeepAlive() {
//     // Send a keep-alive message every 25 seconds to prevent connection timeout
//     this.keepAliveInterval = setInterval(() => {
//       if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//         try {
//           this.ws.send(
//             JSON.stringify({
//               command: "keep-alive",
//               data: { timestamp: Date.now() },
//             })
//           );
//         } catch (error) {
//           console.error("❌ Error sending keep-alive:", error);
//         }
//       }
//     }, 25000);
//   }

//   stopKeepAlive() {
//     if (this.keepAliveInterval) {
//       clearInterval(this.keepAliveInterval);
//       this.keepAliveInterval = null;
//     }
//   }

//   startConnectionMonitoring() {
//     // Monitor connection health every 10 seconds
//     setInterval(() => {
//       if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//         // Connection is open, reset reconnection attempts
//         this.reconnectAttempts = 0;
//       } else if (
//         this.ws &&
//         this.ws.readyState === WebSocket.CLOSED &&
//         this.username
//       ) {
//         // Connection is closed but we have a username, try to reconnect
//         console.log(
//           "🔍 Connection monitoring detected closed connection, attempting reconnect"
//         );
//         this.handleReconnection();
//       }
//     }, 10000);
//   }

//   // Handle browser-initiated connection drops
//   handleBrowserConnectionDrop() {
//     console.log("🌐 Browser dropped connection, attempting to reconnect...");

//     // Wait a bit before attempting to reconnect
//     setTimeout(() => {
//       if (!this.isConnected && this.username) {
//         this.handleReconnection();
//       }
//     }, 1000);
//   }

//   // Add visibility change handling to detect when page becomes visible again
//   setupVisibilityHandling() {
//     document.addEventListener("visibilitychange", () => {
//       if (!document.hidden && !this.isConnected && this.username) {
//         console.log("👁️ Page became visible, checking connection...");
//         this.handleReconnection();
//       }
//     });
//   }

//   // Cleanup method
//   destroy() {
//     if (this.ws) {
//       this.ws.close(1000, "Client disconnecting");
//     }
//     this.stopKeepAlive(); // Ensure keep-alive is stopped on destroy
//   }
// }

// // Initialize the chat application
// const chatApp = new WebSocketChatApp();

// // Global cleanup
// window.addEventListener("beforeunload", () => {
//   chatApp.destroy();
// });

// // Prevent zoom on double-tap for mobile
// let lastTouchEnd = 0;
// document.addEventListener(
//   "touchend",
//   (event) => {
//     const now = new Date().getTime();
//     if (now - lastTouchEnd <= 300) {
//       event.preventDefault();
//     }
//     lastTouchEnd = now;
//   },
//   false
// );

class WebSocketChatApp {
  constructor() {
    this.ws = null;
    this.username = "";
    this.messages = [];
    this.users = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = []; // Queue messages while disconnected

    // WebSocket server URL - adjust if needed
    this.serverUrl = "ws://localhost:3001";

    this.initializeElements();
    this.setupEventListeners();
    this.showJoinModal();

    // Auto-resize textarea
    this.setupAutoResize();
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

    // Window events
    window.addEventListener("beforeunload", () => {
      if (this.ws) {
        this.ws.close();
      }
    });

    window.addEventListener("online", () => {
      if (!this.isConnected && this.username) {
        this.connectWebSocket();
      }
    });

    window.addEventListener("offline", () => {
      this.updateConnectionStatus("disconnected");
    });

    // Mobile sidebar toggle (if needed)
    if (window.innerWidth <= 768) {
      this.setupMobileSidebar();
    }
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

    if (username.length > 30) {
      this.showJoinError("Username too long (max 30 characters)");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      this.showJoinError(
        "Username can only contain letters, numbers, underscore, and dash"
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
        this.reconnectAttempts = 0;
        this.updateConnectionStatus("connected");
        this.enableInput();

        // Send join command
        this.sendToServer({
          command: "join",
          data: { username: this.username },
        });

        // Process queued messages
        this.processMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error("❌ Error parsing server message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(
          "🔌 WebSocket connection closed:",
          event.code,
          event.reason
        );
        this.isConnected = false;
        this.updateConnectionStatus("disconnected");
        this.disableInput();

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && this.username) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.isConnected = false;
        this.updateConnectionStatus("disconnected");
        this.showNotification("Connection error occurred", "error");
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      this.updateConnectionStatus("disconnected");
      this.showNotification("Failed to connect to server", "error");
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      this.showNotification(
        "Unable to reconnect. Please refresh the page.",
        "error"
      );
      return;
    }

    this.reconnectAttempts++;
    this.updateConnectionStatus("connecting");

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isConnected) {
        console.log(
          `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );
        this.connectWebSocket();
      }
    }, delay);
  }

  handleServerMessage(data) {
    console.log("📨 Received:", data.command);

    switch (data.command) {
      case "connection-established":
        console.log("✅ Connection established");
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
    console.log("🎉 Successfully joined chat");
    this.showNotification("Successfully joined the chat!", "success");

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

    // Play notification sound for other users' messages
    if (message.author !== this.username) {
      this.playNotificationSound();
    }
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
    this.showNotification(`${data.username} joined the chat`, "info");
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
    } else {
      this.showInputError(message);
    }
  }

  sendToServer(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket not connected, queuing message");
      this.messageQueue.push(data);
      this.showInputError(
        "Not connected to server. Message will be sent when reconnected."
      );
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      this.sendToServer(queuedMessage);
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
                            <button class="action-btn like-btn" onclick="chatApp.likeMessage(${
                              message.id
                            })" title="Like this message">
                                👍 <span id="likes-${message.id}">${
      message.likes
    }</span>
                            </button>
                            <button class="action-btn dislike-btn" onclick="chatApp.dislikeMessage(${
                              message.id
                            })" title="Dislike this message">
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
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
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

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "notificationSlide 0.3s ease-out reverse";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
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

  playNotificationSound() {
    // Simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Ignore audio errors (browsers might block audio without user interaction)
    }
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
