/* eslint-disable @typescript-eslint/space-before-blocks */
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import * as middlewares from './middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';
import { ClientToServerEvents, ServerToClientEvents } from './interfaces/Socket';

require('dotenv').config();

const app = express();

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`a user ${socket.id} connected`);
  socket.on('create', (room: string | string[]) => {
    socket.join(room);
    console.log(`user ${socket.id} joined room ${room}`);
    socket.to(room).emit('test', `user ${socket.id} joined room ${room}`);
  });
  socket.on('disconnect', () => {
    console.log(`user ${socket.id} disconnected`);
  });
  socket.on('update', (msg) => {
    console.log('message:', msg);
    socket.to([...socket.rooms]).emit('test', `${socket.id}: ${msg}`);
    if (msg === 'animal') {
      socket.to([...socket.rooms]).emit('addAnimal', 'New animal added');
    } else if (msg === 'species') {
      socket.to([...socket.rooms]).emit('addSpecies', 'New species added');
    } else if (msg === 'game') {
      socket.to([...socket.rooms]).emit('addGame', 'New game added');
    }
  });
});

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'Socket server for Darts rooms',
  });
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default httpServer;
