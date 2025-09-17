import MessageService from "../services/MessageService.js";
export const getAllMessages = (req, res) => {
  const { since } = req.query;
  try {
    const messages = since
      ? MessageService.getMessagesAfter(parseInt(since))
      : MessageService.getAllMessages();

    res.status(200).json({
      success: true,
      data: { messages },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const sendMessage = (req, res) => {
  const { author, content } = req.body;
  try {
    // Validate message
    const validation = MessageService.validateMessage(author, content);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    // Create message
    const message = MessageService.createMessage(author, content);

    res.status(201).json({
      success: true,
      data: { message },
    });
    console.log("✅ Message created:", message);
  } catch (error) {
    console.error("❌ Error creating message:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const likeMessage = (req, res) => {
  const messageId = req.params.id;
  const updatedMessage = MessageService.likeMessage(messageId);

  if (!updatedMessage) {
    return res.status(404).json({
      success: false,
      error: "Message not found",
    });
  }

  res.json({
    success: true,
    data: { message: updatedMessage },
  });
};

export const dislikeMessage = (req, res) => {
  const messageId = req.params.id;
  const updatedMessage = MessageService.dislikeMessage(messageId);

  if (!updatedMessage) {
    return res.status(404).json({
      success: false,
      error: "Message not found",
    });
  }

  res.json({
    success: true,
    data: { message: updatedMessage },
  });
};
