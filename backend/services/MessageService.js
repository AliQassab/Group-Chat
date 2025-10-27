import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class MessageService {
  constructor() {
    this.messages = [];
    this.reactions = new Map();
    this.dataFile = path.join(__dirname, "../data/messages.json");
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.loadMessages();
      this.initialized = true;
    }
  }
  async loadMessages() {
    try {
      const data = await fs.readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(data);
      this.messages = parsed.messages || [];
    } catch (error) {
      console.log(
        "📝 No existing messages file, starting fresh",
        error.message
      );
      this.messages = [];
    }
  }

  async saveMessages() {
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });

      const data = {
        messages: this.messages,
      };

      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }

  createMessage(author, content) {
    const message = {
      id: uuidv4(),
      author,
      content,
      timestamp: Date.now(),
      likes: 0,
      dislikes: 0,
    };
    this.messages.push(message);
    this.saveMessages();
    return message;
  }
  getAllMessages() {
    return [...this.messages];
  }

  getMessageById(id) {
    return this.messages.find((msg) => msg.id == id);
  }

  likeMessage(messageId, username) {
    const message = this.getMessageById(messageId);
    if (!message) return null;

    if (!this.reactions.has(messageId)) {
      this.reactions.set(messageId, { likes: new Set(), dislikes: new Set() });
    }
    const reactions = this.reactions.get(messageId);

    // Remove from dislikes if present
    reactions.dislikes.delete(username);

    if (reactions.likes.has(username)) {
      // Toggle off like
      reactions.likes.delete(username);
    } else {
      reactions.likes.add(username);
    }

    // Update numbers only
    message.likes = reactions.likes.size;
    message.dislikes = reactions.dislikes.size;

    this.saveMessages();
    return message;
  }

  dislikeMessage(messageId, username) {
    const message = this.getMessageById(messageId);
    if (!message) return null;

    if (!this.reactions.has(messageId)) {
      this.reactions.set(messageId, { likes: new Set(), dislikes: new Set() });
    }
    const reactions = this.reactions.get(messageId);

    // Remove from likes if present
    reactions.likes.delete(username);

    if (reactions.dislikes.has(username)) {
      // Toggle off dislike
      reactions.dislikes.delete(username);
    } else {
      reactions.dislikes.add(username);
    }

    // Update numbers only
    message.likes = reactions.likes.size;
    message.dislikes = reactions.dislikes.size;

    this.saveMessages();
    return message;
  }

  validateMessage(author, content) {
    const errors = [];

    if (!author || author.trim() === "") {
      errors.push("Author is required");
    }

    if (!content || content.trim() === "") {
      errors.push("Message content is required");
    }

    if (author && author.length > 50) {
      errors.push("Author name too long (max 50 characters)");
    }

    if (content && content.length > 500) {
      errors.push("Message too long (max 500 characters)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
// Create singleton instance
const messageService = new MessageService();

// Initialize asynchronously
await messageService.initialize();

export default messageService;
