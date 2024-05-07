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

class Room {
  private currentTurn: string;
  private score: number;

  constructor(private roomName: string, private io: Server<ClientToServerEvents, ServerToClientEvents>) {
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
    console.log(`User ${socket.id} joined room ${this.roomName}`);
    socket.to(this.roomName).emit("test", `User ${socket.id} joined room ${this.roomName}`);

    const clientsArrayToClients = Array.from(roomClients);
    console.log("Clients Array To Clients: ", clientsArrayToClients);
    this.io.to(this.roomName).emit("sendArray", clientsArrayToClients);

    socket.on("setCurrentTurn", (user: string) => {
      this.currentTurn = user;
      console.log(`User ${socket.id} set current turn to ${this.currentTurn}`);
    });

    socket.on("decreaseScore", (value: number) => {
     /* let currentTurn;
      console.log(`User ${socket.id} is updating score ${value}`);
      console.log(`Current Turn: ${this.currentTurn}`);
      console.log(`Current Turn: ${currentTurn}`);
      if (currentTurn !== socket.id) {
        console.log(`User ${socket.id} is not allowed to update score. It's not their turn`);
        console.log(`Current Turn: ${currentTurn}` + `User ${socket.id}`)
        socket.emit("scoreUpdateInProgress", "It's not your turn");
        return;
      }*/

      console.log(`User ${socket.id} decreased score by ${value}`);

      if (value > this.score) {
        socket.emit(
          "bust",
          `Bust! Your score cannot be greater than your current score. Your current score is ${this.score}.`,
        );
        return;
      }

      this.score -= value;

      console.log(`User ${socket.id} score is now: ${this.score}`);
      const updatedScore = { name: socket.id, score: this.score, turn: this.currentTurn };
      this.io.to(this.roomName).emit("updateScore", JSON.stringify(updatedScore));

      if (this.score === 0) {
        let winnerMessage = `Game over! ${socket.id} WON!`;
        const roomClients =
          this.io.sockets.adapter.rooms.get(this.roomName) ?? new Set<string>();
        const clientsArray = Array.from(roomClients);
        this.io.to(this.roomName).emit("gameOver", winnerMessage);
        sendGametoDB([{ players: clientsArray }], this.currentTurn);
        this.io.to(this.roomName).emit("sendArray", clientsArray);
      }

      if (roomClients) {
        console.log("ollaaks tääl kostkaana");
        const roomClients =
        this.io.sockets.adapter.rooms.get(this.roomName) ?? new Set<string>();
        const clientsArray = Array.from(roomClients);
        const currentIndex = clientsArray.indexOf(socket.id);
        const nextIndex = (currentIndex + 1) % clientsArray.length;
        this.currentTurn = clientsArray[nextIndex];
        console.log(`Current turn is now: ${this.currentTurn} on room ${this.roomName}`);
       // currentTurn = this.currentTurn;
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

  socket.on("create", (room: string | string[]) => {
    const roomInstance = new Room(room.toString(), io);
    roomInstance.join(socket);
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    // Handle disconnection logic for the room
  });

  socket.on("update", (msg) => {
    console.log(`${msg}`);
    socket.to([...socket.rooms]).emit("test", `${socket.id}: ${msg}`);
    if (msg === "game") {
      socket.to([...socket.rooms]).emit("addGame", "New game added");
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
