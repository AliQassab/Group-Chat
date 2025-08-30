import express from "express";
import { ensureFields } from "../middleware/middleware.js";
import {
  dislikeMessage,
  getAllMessages,
  likeMessage,
  sendMessage,
} from "../controllers/message.controller.js";
import { getAllUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/messages", getAllMessages);
router.post("/messages", ensureFields(["author", "content"]), sendMessage);
router.post("/messages/:id/like", likeMessage);
router.post("/messages/:id/dislike", dislikeMessage);
router.get("/users", getAllUsers);

export default router;
