// room routes
import express from "express";
import Room from "../models/Room.js";
import { io } from "../index.js";
import { data } from "../utils/data.js";

const router = express.Router();

const colors = [
  "#7D77FB",
  "#FFA500",
  "#FF0000",
  "#008000",
  "#FF00FF",
  "#800080",
  "#0000FF",
  "#008080",
  "#808080",
  "#808000",
  "#283618",
  "#023047",
  "#0081a7",
  "#ef476f",
  "#03045e",
  "#390099",
  "#f72585",
  "#ff6700",
  "#011627",
  "#2ec4b6",
  "#ff9f1c",
  "#ff1654",
  "#247ba0",
  "#70c1b3",
  "#b2dbbf",
  "#23588e",
  "#fca311",
  "#e71d36",
  "#ff9f1c",
  "#2ec4b6",
  "#011627",
  "#ff1654",
  "#247ba0",
  "#70c1b3",
  "#b2dbbf",
  "#23588e",
  "#fca311",
  "#e71d36",
  "#ff9f1c",
  "#2ec4b6",
  "#011627",
  "#ff1654",
  "#247ba0",
  "#70c1b3",
  "#b2dbbf",
];

router.post("/create-room", async (req, res) => {
  try {
    const { username } = req.body;

    const newRoom = new Room({
      users: [
        {
          name: username,
          color: colors[0],
        },
      ],
      currentRound: "",
      artist: "",
      maxRound: 3,
      currentRound: 1,
      maxUser: 10,
      status: "waiting",
    });

    await newRoom.save();

    res.status(200).json(newRoom);
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: error.message });
  }
});

router.post("/join-room", async (req, res) => {
  try {
    const { username, room_id } = req.body;

    const room = await Room.findById(room_id);

    if (!room) {
      res.status(400).json({ message: "Room not found" });
    }

    if (room?.status !== "waiting") {
      res
        .status(400)
        .json({ message: "Players have started the game already" });
    }

    if (room?.users?.length >= room?.maxUser) {
      res.status(400).json({ message: "Room is full" });
    }

    const newUser = {
      name: username,
      color: colors[room.users.length],
    };

    room.users.push(newUser);

    const newRoom = await room.save();

    res.status(200).json(newRoom);
  } catch (error) {
    console.log(error);
  }
});

// leave room
router.post("/leave-room", async (req, res) => {
  try {
    const { user_id, room_id } = req.body;

    const room = await Room.findOne({
      _id: room_id.toString(),
    });

    if (!room) {
      return res.status(400).json({ message: "Room not found" });
    }

    const index = room?.users?.findIndex(
      (user) => user._id.toString() === user_id.toString()
    );

    if (index === -1) {
      return res.status(400).json({ message: "User is not part of the room" });
    }

    room.users.splice(index, 1);

    // delete the room if there are no users
    if (room.users.length === 0) {
      await Room.findByIdAndDelete(room_id);
      return res.status(200).json({ message: "Room deleted" });
    }

    // if the user is drawing then change the drawer
    if (room.artist === user_id) {
      const userIds = room.users.map((user) => user._id);
      const nextDrawerId = userIds.find((id) => id !== user_id);

      if (nextDrawerId) {
        room.artist = nextDrawerId;
      } else {
        const firstUserId = userIds[0];
        room.artist = firstUserId;
      }
    }

    await room.save();

    io.emit("user-disconnected", user_id);

    return res.status(200).json(room);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Room not found" });
  }
});

// change status
router.post("/change-status", async (req, res) => {
  try {
    const { room_id, status } = req.body;

    const room = await Room.findById(room_id);

    if (!room) {
      return res.status(400).json({ message: "Room not found" });
    }

    if (status === "playing") {
      room.startTime = Date.now();
      // make a timeLine array for three rounds and see the start time and end time for each user in each round
      // it should be like 9 items for 3 rounds and 3 users
      // timeLine: [
      //   {
      //     user_id: "id",
      //     start_time: "time",
      //     end_time: "time",
      //   },

      const timeLine = [];
      const userIds = room.users.map((user) => user._id);
      for (let i = 0; i < room.maxRound; i++) {
        for (let j = 0; j < userIds.length; j++) {
          timeLine.push({
            user_id: userIds[j],
            start_time: "",
            end_time: "",
          });
        }
      }
      room.timeLine = timeLine;
    }

    room.status = status;
    room.currentWord = data[Math.floor(Math.random() * data.length)];
    room.artist = room.users[0]._id;

    await room.save();

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

router.post("/change-artist", async (req, res) => {
  try {
    const { room_id } = req.body;

    // see the presence of drawing and make the next user as drawer and change the word
    const room = await Room.findById(room_id);
    const index = room.users.findIndex(
      (user) => user._id.toString() === room.artist.toString()
    );

    if (index === -1) {
      // then no one is drawing so make the first user as drawer and change the word
      room.artist = room.users[0]._id;
      room.currentWord = "word";
    }

    if (index === room.users.length - 1) {
      // then the last user is drawing so make the first user as drawer and change the word
      room.artist = room.users[0]._id;
      room.currentWord = "word";
    } else {
      room.artist = room.users[index + 1]._id;
      room.currentWord = "word";
    }

    await room.save();

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

// check if the word is correct or not and change the score
router.get("/check/word/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentRound } = req.body;

    const room = await Room.findById(id);
    const index = room.users.findIndex(
      (user) => user._id.toString() === room.artist.toString()
    );

    if (room.currentWord === currentRound) {
      room.users[index].score += 10;
    }

    await room.save();

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

// check if the username is part of the room or not
router.get("/check/username/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    const room = await Room.findById(id);

    const index = room.users.findIndex((user) => user.name === username);

    if (index === -1) {
      res.status(400).json({ message: "User is not part of the room" });
    }

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

// get room details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findById(id);

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Room not found" });
  }
});

// check room and user details
router.get("/check-room-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const room = await Room.findById(id);
    if (!room) {
      res.status(400).json({ message: "Room not found" });
    }
    const index = room.users.findIndex((user) => user.name === username);
    if (index === -1) {
      res.status(400).json({ message: "User is not part of the room" });
    }

    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

export default router;
