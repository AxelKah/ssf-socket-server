/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable @typescript-eslint/quotes */
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import * as middlewares from "./middlewares";
import api from "./api";
import MessageResponse from "./interfaces/MessageResponse";
import { ClientToServerEvents, ServerToClientEvents } from "./interfaces/Socket";
import sendGametoDB from "./functions/gameToDB";
import SocketIO from "socket.io";
/* eslint-disable @typescript-eslint/quotes */

require("dotenv").config();

const usernameToSocketIdMap: Record<string, string> = {};

class Room {
  private currentTurn: string;
  private score: number;

  constructor(private roomName: string, private username:string, private io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.currentTurn = "";
    this.score = 501;
  }
  


  public join(socket: SocketIO.Socket) {
    const roomClients = this.io.sockets.adapter.rooms.get(this.roomName) ?? new Set<string>();
    if (roomClients.size >= 2) {
      socket.emit("clientMessage", `Room ${this.roomName} is already full`);
      return;
    }

    socket.join(this.roomName);
    usernameToSocketIdMap[this.username] = socket.id;
    console.log("Username to Socket ID Map: ", usernameToSocketIdMap);
    console.log(`User ${this.username} joined room ${this.roomName}`);
    socket.to(this.roomName).emit("test", `User ${this.username} joined room ${this.roomName}`);

    const usernamesArray = Object.keys(usernameToSocketIdMap);

    console.log("Clients Array To Clients: ", usernamesArray);
    this.io.to(this.roomName).emit("sendArray", usernamesArray);

    socket.on("setCurrentTurn", (user: string) => {
      this.currentTurn = usernameToSocketIdMap[user];
      console.log(`User ${this.username} set current turn to ${this.currentTurn}`);
    });

    socket.on("decreaseScore", (value: number, name: string) => {
      console.log(`User ${this.username} decreased score by ${value}`);

      if (value > this.score) {
        socket.emit(
          "bust",
          `Bust! Your score cannot be greater than your current score. Your current score is ${this.score}.`,
        );
        return;
      }

      this.score -= value;

      console.log(`User ${this.username} score is now: ${this.score}`);
      const updatedScore = { name: name, score: this.score, turn: this.currentTurn };
      this.io.to(this.roomName).emit("updateScore", JSON.stringify(updatedScore));
      console.log("Username to Socket ID Map: ", usernameToSocketIdMap);

      if (this.score === 0) {
        let winnerMessage = `Game over! ${this.username} WON!`;
        const usernames = Object.keys(usernameToSocketIdMap);
        this.io.to(this.roomName).emit("gameOver", winnerMessage);
        sendGametoDB([{ players: usernames }], this.username);
        this.io.to(this.roomName).emit("sendArray", usernames);
      }

      if (roomClients) {
        const roomClients =
          this.io.sockets.adapter.rooms.get(this.roomName) ?? new Set<string>();
        const clientsArray = Array.from(roomClients);
        const currentIndex = clientsArray.indexOf(socket.id);
        const nextIndex = (currentIndex + 1) % clientsArray.length;
        this.currentTurn = clientsArray[nextIndex];
        console.log(`Current turn is now: ${this.currentTurn} on room ${this.roomName}`);
        console.log(`Current turn is now: ${usernameToSocketIdMap[this.currentTurn]} on room ${this.roomName}`);
      } else {
        this.currentTurn = socket.id;
      }
      console.log(`Current turn is now: ${this.currentTurn} on room ${this.roomName}`);
      this.io.to(this.roomName).emit("currentTurn", this.currentTurn);
    });
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Socket server for Darts rooms",
  });
});

app.use("/api/v1", api);
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

io.on("connection", (socket) => {
  console.log(`A user ${socket.id} connected`);
  const sessionID = socket.id;
  console.log(`Session ID: ${sessionID}`);

  socket.on("create", (room: string | string[], username: string) => {
    const roomInstance = new Room(room.toString(), username, io);
    roomInstance.join(socket);
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    // Handle disconnection logic for the room
  });

  socket.on("update", (msg) => {
    console.log(`${msg}`);
    io.in([...socket.rooms]).emit("test", `${msg}`);
    if (msg === "game") {
    //  socket.to([...socket.rooms]).emit("addGame", "New game added");
    }
  });
});

app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Socket server for Darts rooms",
  });
});

app.use("/api/v1", api);
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default httpServer;
