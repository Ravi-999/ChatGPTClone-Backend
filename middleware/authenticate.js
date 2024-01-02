require("dotenv").config();
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const authenticateToken = (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const userDetails = await userModel.findOne({ email: user.email });
    req.user = userDetails;
    next();
  });
};

module.exports = { authenticateToken };
