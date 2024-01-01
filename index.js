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
app.post("/google/login", async (req, res) => {
  try {
    const { credential } = req.body;
    const { name, email } = jwt.decode(credential);
    const existingUser = await userModal.findOne({ email });
    if (!existingUser) {
      const newUser = new userModal({
        fullName: name,
        email: email,
      });
      await newUser.save();
    }
    const token = jwt.sign({ name, email }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token, name, email }).end();
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
      const updatedChat = await existingChat.save();
      res.status(200).json({ randomAnswer });
    } else {
      const newChat = new ChatModel({
        chatID,
        chatDescription: question,
        shareID: uuidv4(),
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
app.get("/c/getUser", async (req, res) => {
  const { name, email } = req.user;
  const user = await userModal.findOne({ email });
  res.status(200).json(user).end();
});
app.get("/c/history", async (req, res) => {
  const allChats = await ChatModel.find({}, "chatID chatDescription"); // Retrieve only chatID and chatDescription fields

  // Extract chatID and chatDescription from each chat
  const chatDetails = allChats.map((chat) => ({
    chatID: chat.chatID,
    chatDescription: chat.chatDescription,
  }));

  res.status(200).json(chatDetails).end();
});
app.get("/c/getChat/:chatID", async (req, res) => {
  const { chatID } = req.params;
  console.log(chatID);
  try {
    const chat = await ChatModel.findOne({ chatID });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const contentArray = chat.content;
    res.status(200).json(contentArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.listen(3001, () => {
  console.log("server running on 3001");
});
