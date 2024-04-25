import express from 'express'; // Express framework for building web applications
import morgan from 'morgan'; // HTTP request logger middleware
import helmet from 'helmet'; // Security middleware
import cors from 'cors'; // Cross-origin resource sharing middleware
import { createServer } from 'http'; // Create HTTP server
import { Server } from 'socket.io'; // Socket.IO server
import * as middlewares from './middlewares'; // Importing custom middlewares
import api from './api'; // Importing API routes
import MessageResponse from './interfaces/MessageResponse'; // Importing custom interface
import { ClientToServerEvents, ServerToClientEvents } from './interfaces/Socket'; // Importing custom socket events interface

/* eslint-disable @typescript-eslint/space-before-blocks */

// Importing required modules


require('dotenv').config(); // Loading environment variables from .env file

const app = express(); // Creating an instance of Express application

const httpServer = createServer(app); // Creating HTTP server using Express app
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
}); // Creating Socket.IO server instance

app.use(morgan('dev')); // Using morgan middleware for logging HTTP requests
app.use(helmet()); // Using helmet middleware for securing the app
app.use(cors()); // Using cors middleware for enabling cross-origin resource sharing
app.use(express.json()); // Parsing JSON request bodies

io.on('connection', (socket) => {
  console.log(`a user ${socket.id} connected`); // Logging when a user connects to the server

  socket.on('create', (room: string | string[]) => {
    socket.join(room); // Joining a room
    console.log(`user ${socket.id} joined room ${room}`); // Logging when a user joins a room
    socket.to(room).emit('test', `user ${socket.id} joined room ${room}`); // Emitting a 'test' event to all users in the room except the sender

    // Set starting score of 501 for the user
    let score = 501;

    socket.on('decreaseScore', (value: number) => {
      // Decrease the score by the given value
      console.log(`user ${socket.id} decreased score by ${value}`); // Logging the score decrease
      
      // Check if the score is greater than the current score
      if (value > score) {
        socket.emit('bust', `Bust! Your score cannot be greater than your current score. Your current score is ${score}.`);
        
        return;
      }

      score -= value;

      // Emit the updated score to all users in the room
      console.log(`user ${socket.id} score is now: ${score}`); // Logging the updated score
      const updatedScore = { name: socket.id, score };
      io.to(room).emit('updateScore', JSON.stringify(updatedScore));

      // Check if the score reaches 0
      if (score === 0) {
        const winnerMessage = `Game over! ${socket.id} won.`;
        io.to(room).emit('gameOver', winnerMessage);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`user ${socket.id} disconnected`); // Logging when a user disconnects from the server
  });

  socket.on('update', (msg) => {
    console.log('message:', msg); // Logging the received message

    // Emitting different events based on the received message
    socket.to([...socket.rooms]).emit('test', `${socket.id}: ${msg}`);
    if (msg === 'animal') {
      socket.to([...socket.rooms]).emit('addAnimal', 'New animal added');
    } else if (msg === 'species') {
      socket.to([...socket.rooms]).emit('addSpecies', 'New species added');
    } else if (msg === 'game') {
      socket.to([...socket.rooms]).emit('addGame', 'New game added');
    }/* else if (typeof msg === 'number') {
      const result = 501 - msg;
      socket.to([...socket.rooms]).emit('subtractValue', result);
    }*/
  });
});

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'Socket server for Darts rooms',
  }); // Sending a JSON response with a message
});

app.use('/api/v1', api); // Mounting API routes

app.use(middlewares.notFound); // Handling 404 errors
app.use(middlewares.errorHandler); // Handling errors

export default httpServer; // Exporting the HTTP server
