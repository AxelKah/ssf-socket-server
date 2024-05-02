/* eslint-disable @typescript-eslint/quotes */
import express from "express"; // Express framework for building web applications
import morgan from "morgan"; // HTTP request logger middleware
import helmet from "helmet"; // Security middleware
import cors from "cors"; // Cross-origin resource sharing middleware
import { createServer } from "http"; // Create HTTP server
import { Server } from "socket.io"; // Socket.IO server
import * as middlewares from "./middlewares"; // Importing custom middlewares
import api from "./api"; // Importing API routes
import MessageResponse from "./interfaces/MessageResponse"; // Importing custom interface
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./interfaces/Socket"; // Importing custom socket events interface
import { doGraphQLFetch } from "./graphql/fetch";
import { addGame } from "./graphql/queries";

/* eslint-disable @typescript-eslint/space-before-blocks */

// Importing required modules

require("dotenv").config(); // Loading environment variables from .env file

const app = express(); // Creating an instance of Express application

const httpServer = createServer(app); // Creating HTTP server using Express app
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "*",
  },
}); // Creating Socket.IO server instance

app.use(morgan("dev")); // Using morgan middleware for logging HTTP requests
app.use(helmet()); // Using helmet middleware for securing the app
app.use(cors()); // Using cors middleware for enabling cross-origin resource sharing
app.use(express.json()); // Parsing JSON request bodies
//let isUpdatingScore = false; // Flag to track if score is currently being updated

app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Socket server for Darts rooms",
  }); // Sending a JSON response with a message
});

app.use("/api/v1", api); // Mounting API routes

app.use(middlewares.notFound); // Handling 404 errors
app.use(middlewares.errorHandler); // Handling errors
let currentTurn: string; // Variable to track the current turn

const apiUrl = "http://localhost:3000/graphql";

const sendGametoDB = async (data: Array<any>) => {
  console.log("data: ", data[0].players[0], data[0].players[1], currentTurn);
  try {
    const winnerData = await doGraphQLFetch(apiUrl, addGame, {
      game: {
        user1: data[0].players[0],
        user2: data[0].players[1],
        winner: currentTurn,
      },
    });
    console.log("winnerData: ", winnerData);
  } catch (error) {
    console.error("Error:", error);
  }
};


io.on("connection", (socket) => {
  console.log(`a user ${socket.id} connected `); // Logging when a user connects to the server
  const sessionID = socket.id; // Storing the session ID of the connected user
  console.log(`sessionID: ${sessionID}`); // Logging the session ID
  socket.on("create", (room: string | string[]) => {
    socket.join(room); // Joining a room

    console.log(`user ${socket.id} joined room ${room}`); // Logging when a user joins a room
    socket.to(room).emit("test", `user ${socket.id} joined room ${room}`); // Emitting a 'test' event to all users in the room except the sender

    // Set starting score of 501 for the user
    let score = 501;

    socket.on("setCurrentTurn", (user: string) => {
      currentTurn = user;
      console.log(`user ${socket.id} set current turn to ${currentTurn}`); // Logging the current turn
    });

    socket.on("decreaseScore", (value: number) => {
      // Check if score is currently being updated by another client
      console.log(`user ${socket.id} is updating score ${value}`); // Logging the score update
      console.log(`currentTurn: ${currentTurn}`); // Logging the current turn
      if (currentTurn !== socket.id) {
        socket.emit(
          "scoreUpdateInProgress",
          `It is not your turn to update the score. Please wait for your turn. Current turn: ${currentTurn}`
        );
        return;
      }

      // Decrease the score by the given value
      console.log(`user ${socket.id} decreased score by ${value}`); // Logging the score decrease

      // Check if the score is greater than the current score
      if (value > score) {
        socket.emit(
          "bust",
          `Bust! Your score cannot be greater than your current score. Your current score is ${score}.`
        );
        return;
      } /* else if (value > 180) {
        socket.emit('bust', 'Bust! Your score cannot be greater than 180.');
        return;
      }*/

      score -= value;

      // Emit the updated score to all users in the room
      console.log(`user ${socket.id} score is now: ${score}`); // Logging the updated score
      const updatedScore = { name: socket.id, score, turn: currentTurn };
      io.to(room).emit("updateScore", JSON.stringify(updatedScore));

      // Check if the score reaches 0
      if (score === 0) {
        let winnerMessage = `Game over! ${socket.id} WON!`;
        const roomClients =
          io.sockets.adapter.rooms.get(room.toString()) ?? new Set<string>(); // Cast 'room' to 'string' and provide a default value of an empty set
        const clientsArray = Array.from(roomClients);
        io.to(room).emit("gameOver", winnerMessage); // Emit the 'gameOver' event to all users in the room
        sendGametoDB([{ players: clientsArray }]);

        io.to(room).emit("sendArray", clientsArray);
      }

      // Set the current turn to the next user in the room
      const roomClients =
        io.sockets.adapter.rooms.get(room.toString()) ?? new Set<string>(); // Cast 'room' to 'string' and provide a default value of an empty set
      if (roomClients) {
        const clientsArray = Array.from(roomClients);
        const currentIndex = clientsArray.indexOf(socket.id);
        const nextIndex = (currentIndex + 1) % clientsArray.length;
        currentTurn = clientsArray[nextIndex];
      } else {
        currentTurn = socket.id; // Set the current turn to the first connected user
      }

      // Emit the current turn to all users in the room
      io.to(room).emit("currentTurn", currentTurn);
    });

    // Emit the current turn to the user who just joined the room
  });

  socket.on("join", (roomName: string) => {
    let rooms = io.sockets.adapter.rooms;
    let room = rooms.get(roomName);

    if (room === undefined) {
      socket.emit("clientMessage", `Room ${roomName} does not exist`);
      return;
    } else if (room.size == 1) {
      //socket.emit("clientMessage", `Room ${roomName} is full`);
      socket.join(roomName);
      socket.to(roomName).emit("test", `user ${socket.id} joined room ${roomName}`); // Emitting a 'test' event to all users in the room except the sender
    } else {
      socket.emit("clientMessage", `Room is full`);
      console.log("Room is full");
    
      return;
    }

    // socket.join(roomName); // Joining a room1
    // console.log(`user ${socket.id} joined room ${roomName}`); // Logging when a user joins a room
   // socket.to(roomName).emit("test", `user ${socket.id} joined room ${room}`); // Emitting a 'test' event to all users in the room except the sender
  });

  socket.on("disconnect", () => {
    console.log(`user ${socket.id} disconnected`); // Logging when a user disconnects from the server

    // Check if the disconnected user was the one with the current turn
    if (currentTurn === socket.id) {
      currentTurn = socket.id;

      // Emit the current turn as null to all users in the room
      const room = Array.from(socket.rooms)[1];
      if (room) {
        io.to(room).emit("currentTurn", currentTurn); // Fix: Cast 'currentTurn' to 'string'
      }
    }
  });

  socket.on("update", (msg) => {
    console.log("message:", msg); // Logging the received message

    // Emitting different events based on the received message
    socket.to([...socket.rooms]).emit("test", `${socket.id}: ${msg}`);
    if (msg === "animal") {
      socket.to([...socket.rooms]).emit("addAnimal", "New animal added");
    } else if (msg === "species") {
      socket.to([...socket.rooms]).emit("addSpecies", "New species added");
    } else if (msg === "game") {
      socket.to([...socket.rooms]).emit("addGame", "New game added");
    } /* else if (typeof msg === 'number') {
      const result = 501 - msg;
      socket.to([...socket.rooms]).emit('subtractValue', result);
    } */
  });
});

app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Socket server for Darts rooms",
  }); // Sending a JSON response with a message
});

app.use("/api/v1", api); // Mounting API routes

app.use(middlewares.notFound); // Handling 404 errors
app.use(middlewares.errorHandler); // Handling errors

export default httpServer; // Exporting the HTTP server
