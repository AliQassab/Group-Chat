# 💬 Group Chat App

A real-time chat application built with **Node.js**, **Express**, and the **websocket** library.  
Messages are stored in a JSON file (`messages.json`) so that chat history is persistent across server restarts.

---

## ✨ Features

- 🔗 Real-time chat via WebSocket protocol
- 👥 Multiple users can join using unique usernames
- 💬 Send and receive messages instantly
- 👍👎 Like / Dislike messages (one reaction per user, toggle supported)
- 🕒 Messages stored in `messages.json` with timestamps and reaction counts
- 📦 REST API endpoints for managing messages and users
- 🔄 Auto-reconnect logic on the client if connection drops
- 🎨 Simple frontend with message list, user list, and reaction buttons

---

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AliQassab/Group-Chat.git
cd Group-Chat
cd backend
```

## Install dependencies

npm install

## Run the server

npm start

The server will start on http://localhost:3001
by default.
