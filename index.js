const express = require("express");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const ChatModel = require("./models/chatModel");
const userModal = require("./models/userModel");
const { generateRandomString } = require("./utils/helper");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./middleware/authenticate");
const { default: axios } = require("axios");
require("dotenv").config();

app.use(cors());
app.use("/c", authenticateToken);
app.use(express.json());

const MONGDODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(MONGDODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");
});

app.get("/", (req, res) => {
  res.status(200).json("<h1>Hello</h1>").end();
});
app.post("/github/login", async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: token,
      },
    });
    const data = await response.json();
    console.log(data);
    return res.status(200).send(response);
  } catch (err) {
    console.log(err);
  }
});
app.post("/google/login", async (req, res) => {
  try {
    const { credential } = req.body;
    const { name, email, picture } = jwt.decode(credential);
    let existingUser = await userModal.findOne({ email });

    if (!existingUser) {
      const newUser = new userModal({
        userID: uuidv4(),
        fullName: name,
        email: email,
        picture,
      });
      existingUser = await newUser.save();
    }

    const { userID } = existingUser;
    const token = jwt.sign({ name, email }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token, name, email, picture, userID }).end();
  } catch (err) {
    console.log(err);
  }
});
app.post("/c/answer", async (req, res) => {
  const { chatID, question } = req.body;
  const existingChat = await ChatModel.findOne({ chatID });
  const randomAnswer = generateRandomString(200);
  try {
    if (existingChat) {
      existingChat.content.push({ question, answer: randomAnswer });
      const chat = await ChatModel.findOne({ chatID });

      if (existingChat.userID !== req.user.userID) {
        return res
          .status(403)
          .json({ error: "Forbidden: User does not have access to this chat" });
      }

      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      const updatedChat = await existingChat.save();
      res.status(200).json({ randomAnswer });
    } else {
      const newChat = new ChatModel({
        userID: req.user.userID,
        chatID,
        chatDescription: question,
        content: [{ question, answer: randomAnswer }],
      });
      await newChat.save();
      res.status(201).json({ randomAnswer }).end();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/c/deleteChat", async (req, res) => {
  const { chatID } = req.body;
  try {
    const chat = await ChatModel.findOne({ chatID });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    if (chat.userID !== req.user.userID) {
      return res
        .status(403)
        .json({ error: "Forbidden: User does not have access to this chat" });
    }
    const deletedChat = await ChatModel.findOneAndDelete({ chatID });
    if (deletedChat) {
      res.status(200).json({ message: "Chat deleted successfully" });
    } else {
      res.status(404).json({ message: "Chat not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/c/getUser", async (req, res) => {
  const { email } = req.user;
  const user = await userModal.findOne({ email });
  res.status(200).json(user).end();
});
app.get("/c/history", async (req, res) => {
  const allChats = await ChatModel.find(
    { userID: req.user?.userID },
    "chatID chatDescription"
  )
    .sort({ createdAt: -1 })
    .exec();
  const chatDetails = allChats.map((chat) => ({
    chatID: chat.chatID,
    chatDescription: chat.chatDescription,
  }));

  res.status(200).json(chatDetails).end();
});
app.get("/c/getChat/:chatID", async (req, res) => {
  const { chatID } = req.params;
  try {
    const chat = await ChatModel.findOne({ chatID });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.userID !== req.user.userID) {
      return res
        .status(403)
        .json({ error: "Forbidden: User does not have access to this chat" });
    }

    const { content, shareID } = chat;
    res.status(200).json({ content, shareID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/c/sharedlink/:chatID", async (req, res) => {
  const { chatID } = req.params;
  const chat = await ChatModel.findOne({ chatID });
  console.log("sharig chat", chat);
  console.log(chatID, chat.shareID);
  if (!chat) {
    return res.status(404).json({ error: "Chat not found" });
  }
  if (chat.userID !== req.user.userID) {
    return res
      .status(403)
      .json({ error: "Forbidden: User does not have access to this chat" });
  }
  const newShareID = uuidv4();
  const sharableLength = chat.content.length;
  const updatedChat = await ChatModel.findOneAndUpdate(
    { chatID },
    { shareID: newShareID, sharableLength },
    { new: true }
  );
  res.status(200).json({ shareID: updatedChat.shareID });
});
app.get("/c/fork/forkChat/:shareID", async (req, res) => {
  const { shareID } = req.params;
  const chat = await ChatModel.findOne({ shareID });
  console.log("Got the chat having shareID:-", shareID);
  console.log("chat Details", chat);
  if (!chat) {
    return res.status(404).json({ error: "Chat not found" });
  }
  const shareableContent = chat.content.slice(0, chat.sharableLength);
  const newChat = new ChatModel({
    userID: req.user.userID,
    chatID: uuidv4(),
    content: shareableContent,
    chatDescription: chat.chatDescription,
  });

  const updatedChat = await newChat.save();
  console.log("updatedChat is", updatedChat);
  res.status(200).json(newChat);
});

app.get("/share/:shareID", async (req, res) => {
  const { shareID } = req.params;
  const chat = await ChatModel.findOne({ shareID });
  if (!chat) {
    return res.status(404).json({ error: "Chat not found" });
  }
  const userDetails = await userModal.findOne({ userID: chat.userID });
  res
    .status(200)
    .json({ chat, picture: userDetails.picture, name: userDetails.fullName });
});
app.listen(3001, () => {
  console.log("server running on 3001");
});
