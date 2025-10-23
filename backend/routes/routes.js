import express from "express";
import { ensureFields } from "../middleware/middleware.js";
import { sendMessage } from "../controllers/message.controller.js";
import { getAllUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/messages", ensureFields(["author", "content"]), sendMessage);
router.get("/users", getAllUsers);

export default router;
