const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chatID: {
      type: String,
      required: true,
      unique: true,
    },
    shareID: {
      type: String,
      unique: true,
    },
    content: [
      {
        question: {
          type: String,
          required: true,
        },
        answer: {
          type: String,
          required: true,
        },
      },
    ],
    chatDescription: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ChatModel = mongoose.model("ChatModel", chatSchema);

module.exports = ChatModel;
