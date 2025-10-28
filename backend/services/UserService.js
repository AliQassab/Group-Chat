import { v4 as uuidv4 } from "uuid";

class UserService {
  constructor() {
    this.connectedUsers = new Map();
    this.usernames = new Set();
  }

  addUser(connectionId, username) {
    // Check if username is already taken
    const normalizedUsername = username.toLowerCase();

    if (this.usernames.has(normalizedUsername)) {
      return { success: false, error: "Username already taken" };
    }

    const userData = {
      id: uuidv4(),
      username,
      connectionId,
      joinedAt: Date.now(),
    };

    this.connectedUsers.set(connectionId, userData);
    this.usernames.add(normalizedUsername);

    return { success: true, user: userData };
  }

  removeUser(connectionId) {
    const userData = this.getUser(connectionId);
    if (userData) {
      this.usernames.delete(userData.username.toLowerCase());
      this.connectedUsers.delete(connectionId);
      return userData;
    }
    return null;
  }

  getUser(connectionId) {
    return this.connectedUsers.get(connectionId);
  }

  getAllUsers() {
    return Array.from(this.connectedUsers.values());
  }

  getUsernames() {
    // Return original usernames from connected users (not normalized)
    return Array.from(this.connectedUsers.values()).map(
      (user) => user.username
    );
  }

  validateUsername(username) {
    const errors = [];

    if (!username || username.trim() === "") {
      errors.push("Username is required");
    }

    if (username && username.length < 3) {
      errors.push("Username too short (min 3 characters)");
    }

    if (username && username.length > 20) {
      errors.push("Username too long (max 20 characters)");
    }

    if (
      username &&
      (!/^[\p{L}\p{N}_\s-]+$/u.test(username) || /^\s+$/.test(username))
    ) {
      errors.push(
        "Username can contain letters, numbers, spaces, underscore, and dash"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
export default new UserService();
