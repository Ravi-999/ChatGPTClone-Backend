const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
    },
    chatID: {
      type: String,
      required: true,
      unique: true,
    },
    shareID: {
      type: String,
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
    sharableLength: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ChatModel = mongoose.model("ChatModel", chatSchema);

module.exports = ChatModel;
