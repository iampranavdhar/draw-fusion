import express from "express";
import Room from "../models/Room.js";
import ChatRoom from "../models/ChatRoom.js";

const router = express.Router();

router.get("/:room_id", async (req, res) => {
  try {
    const { room_id } = req.params;

    const chat = await ChatRoom.findOne({
      room_id,
    });
    res.status(200).json(chat);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Room not found" });
  }
});

router.post("/send-message", async (req, res) => {
  try {
    const { room_id, username, message } = req.body;

    let chat = await ChatRoom.findOne({
      room_id,
    });

    if (!chat) {
      const newChat = new ChatRoom({
        room_id,
        messages: [],
      });

      chat = await newChat.save();
    }

    let room = await Room.findById(room_id);
    const currentWord = room.currentWord;
    let isAnswer = false;

    if (message?.toLowerCase() === currentWord?.toLowerCase()) {
      isAnswer = true;
      room.users.forEach((user) => {
        if (user.name === username) {
          user.score += 10;
        }
      });
      room.users.forEach((user) => {
        if (user._id.toString() === room.artist.toString()) {
          user.score += 20;
        }
      });
      room = await room.save();
    }

    chat.messages.push({
      username,
      message,
      isAnswer,
    });

    await chat.save();

    res.status(200).json({
      chat,
      room,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Room not found" });
  }
});

export default router;
