import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";
import roomRoutes from "./routes/room.js";
import messageRoutes from "./routes/messages.js";
import http from "http";
import Room from "./models/Room.js";
import { data } from "./utils/data.js";

const app = express();

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());
dotenv.config();

app.use("/api/room", roomRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Hello welcome to draw fusion");
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  });

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const artistRotationInterval = 30000; // 30 seconds
let currentRoomStatus = {};

async function setNextArtist(room_id) {
  console.log("Setting next artist");
  const room = currentRoomStatus[room_id];
  console.log(room, "room");
  if (room.timer) {
    clearInterval(room.timer);
  }

  if (room.currentRound === room.players.length * 3 - 1) {
    await Room.findByIdAndUpdate(room_id, {
      status: "end",
    });
    io.emit("game-ended", {
      room_id,
      status: "end",
    });
    return;
  }

  room.status = "playing";
  room.artistIndex = (room.artistIndex + 1) % room.players.length;
  room.artist = room.players[room.artistIndex].user;
  room.currentWord = data[Math.floor(Math.random() * data.length)];
  room.currentRound += 1;

  console.log("New artist is", room.artist);

  await Room.findByIdAndUpdate(room_id, {
    status: "playing",
    artist: room.artist,
    currentRound: room.currentRound,
    currentWord: room.currentWord,
    artistStartTime: Date.now(),
  });

  io.emit("artist-changed", {
    room_id,
    status: "playing",
    artist: room.artist,
    currentRound: room.currentRound,
    currentWord: room.currentWord,
    artistStartTime: Date.now(),
  });

  // Set a timer to change the artist again after 30 seconds
  room.timer = setInterval(() => {
    setNextArtist(room_id);
  }, artistRotationInterval);
  console.log("Timer set");
}

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join-room", ({ room_id, user }) => {
    console.log("User joined room", room_id, user);
    socket.join(room_id);

    if (!currentRoomStatus[room_id]) {
      currentRoomStatus[room_id] = {
        players: [],
        artist: null,
        artistIndex: 0,
        timer: null,
        currentWord: data[Math.floor(Math.random() * data.length)],
        currentRound: 0,
      };
    }

    currentRoomStatus[room_id].players.push({ socket, user });

    console.log(currentRoomStatus[room_id].players, "players");

    io.emit("user-connected", {
      room_id,
      user,
    });
  });

  socket.on("start-game", (room_id) => {
    console.log(currentRoomStatus[room_id], "this");
    if (currentRoomStatus[room_id]?.players?.length >= 2) {
      setNextArtist(room_id);
      io.emit("gameStarted");
    } else {
      socket.emit("notEnoughPlayers");
    }
  });

  socket.on("start-drawing", (data) => {
    console.log("Start drawing", data);
    io.emit("start-drawing", data);
  });

  socket.on("draw", (data) => {
    console.log("Drawing", data);
    io.emit("draw", data);
  });

  socket.on("stop-drawing", (data) => {
    console.log("End drawing", data);
    io.emit("stop-drawing", data);
  });

  socket.on("clear-canvas", (data) => {
    console.log("Clear canvas", data);
    io.emit("clear-canvas", data);
  });

  socket.on("send-message", (data) => {
    console.log("Send message", data);
    io.emit("sent-msg", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export { io };
