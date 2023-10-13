interface IUser {
  _id?: string;
  name: string;
  color: string;
  score: number;
}

interface IRoom {
  _id?: string;
  users: IUser[];
  currentRound: string;
  artist?: any;
  artistStartTime?: Date;
  maxUser: number;
  maxRound: number;
  startTime?: Date;
  timeLine?: any[];
  status: "waiting" | "playing" | "end";
  createdAt?: Date;
  updatedAt?: Date;
}

interface IMessage {
  _id?: string;
  username: string;
  message: string;
  isAnswer: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
