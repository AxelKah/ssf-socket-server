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

  socket.on('disconnect', () => {
    console.log(`user ${socket.id} disconnected`);
  });
  socket.on('update', (msg) => {
    console.log('message:', msg);
    socket.broadcast.emit('test', `${socket.id}: ${msg}`);
    if (msg === 'animal') {
      socket.broadcast.emit('addAnimal', 'New animal added');
    } else if (msg === 'species') {
      socket.broadcast.emit('addSpecies', 'New species added');
    } else if (msg === 'test') {
      socket.broadcast.emit('test', 'Petteri :D:D:D');
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
