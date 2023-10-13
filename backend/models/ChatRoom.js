import mongoose from "mongoose";

const ChatRoomSchema = new mongoose.Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  messages: [
    {
      username: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      isAnswer: {
        type: Boolean,
        default: false,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default mongoose.model("ChatRoom", ChatRoomSchema);
