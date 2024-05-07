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

require("dotenv").config();

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

let currentTurn: string;

io.on("connection", (socket) => {
  console.log(`a user ${socket.id} connected`);
  const sessionID = socket.id;
  console.log(`sessionID: ${sessionID}`);

  socket.on("create", (room: string | string[]) => {
    const roomClients = io.sockets.adapter.rooms.get(room.toString()) ?? new Set<string>();
    if (roomClients.size >= 2) {
      socket.emit("clientMessage", `Room ${room} is already full`);
      return;
    }

    socket.join(room);
    console.log(`user ${socket.id} joined room ${room}`);
    socket.to(room).emit("test", `user ${socket.id} joined room ${room}`);

    let score = 501;

    const clientsArrayToClients = Array.from(roomClients);
    console.log("clientsArrayToClients: ", clientsArrayToClients);
    io.to(room).emit("sendArray", clientsArrayToClients);

    socket.on("setCurrentTurn", (user: string) => {
      currentTurn = user;
      console.log(`user ${socket.id} set current turn to ${currentTurn}`);
    });

    socket.on("decreaseScore", (value: number) => {
      console.log(`user ${socket.id} is updating score ${value}`);
      console.log(`currentTurn: ${currentTurn}`);
      if (currentTurn !== socket.id) {
        socket.emit(
          "scoreUpdateInProgress",
          `It is not your turn to update the score. Please wait for your turn. Current turn: ${currentTurn}`,
        );
        return;
      }

      console.log(`user ${socket.id} decreased score by ${value}`);

      if (value > score) {
        socket.emit(
          "bust",
          `Bust! Your score cannot be greater than your current score. Your current score is ${score}.`,
        );
        return;
      }

      score -= value;

      console.log(`user ${socket.id} score is now: ${score}`);
      const updatedScore = { name: socket.id, score, turn: currentTurn };
      io.to(room).emit("updateScore", JSON.stringify(updatedScore));

      if (score === 0) {
        let winnerMessage = `Game over! ${socket.id} WON!`;
        const roomClients =
          io.sockets.adapter.rooms.get(room.toString()) ?? new Set<string>(); // Cast 'room' to 'string' and provide a default value of an empty set
        const clientsArray = Array.from(roomClients);
        io.to(room).emit("gameOver", winnerMessage);
        sendGametoDB([{ players: clientsArray }], currentTurn);
        io.to(room).emit("sendArray", clientsArray);
      }

      if (roomClients) {
        const roomClients =
        io.sockets.adapter.rooms.get(room.toString()) ?? new Set<string>();
        const clientsArray = Array.from(roomClients);
        const currentIndex = clientsArray.indexOf(socket.id);
        const nextIndex = (currentIndex + 1) % clientsArray.length;
        currentTurn = clientsArray[nextIndex];
      } else {
        currentTurn = socket.id;
      }

      io.to(room).emit("currentTurn", currentTurn);
    });
  });
/*
  socket.on("join", (roomName: string) => {
    let rooms = io.sockets.adapter.rooms;
    let room = rooms.get(roomName);
    

    if (room === undefined) {
      socket.emit("clientMessage", `Room ${roomName} does not exist`);
      return;
    } else if (room.size == 1) {
      socket.join(roomName);
      socket.to(roomName).emit("test", `user ${socket.id} joined room ${roomName}`);
    } else {
      socket.emit("clientMessage", `Room is full`);
      console.log("Room is full");
      return;
    }
  });
*/
  socket.on("disconnect", () => {
    console.log(`user ${socket.id} disconnected`);
    if (currentTurn === socket.id) {
      currentTurn = socket.id;
      const room = Array.from(socket.rooms)[1];
      if (room) {
        io.to(room).emit("currentTurn", currentTurn);
      }
    }
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
