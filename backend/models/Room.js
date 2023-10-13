import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    users: [
      {
        name: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],
    artist: {
      type: String,
    },
    artistStartTime: {
      type: Date,
    },
    currentWord: {
      type: String,
    },
    maxUser: {
      type: Number,
    },
    maxRound: {
      type: Number,
    },
    currentRound: {
      type: Number,
    },
    startTime: {
      type: Number,
    },
    timeLine: [
      {
        user: {
          type: String,
        },
        time: {
          type: Number,
        },
      },
    ],
    status: {
      type: String,
      enum: ["waiting", "playing", "end"],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Room", roomSchema);
