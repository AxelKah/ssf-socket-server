interface ServerToClientEvents {
  test: (message: string) => void;
  addGame: (message: string) => void;
  updateScore: (message: string) => void;
  gameOver: (message: string) => void;
  sendArray: (clients: Array<string>) => void;
  bust: (message: string) => void;
  scoreUpdateInProgress: (message: string) => void;
  currentTurn: (message: string) => void;
  clientMessage: (message: string) => void;
  sendWinner: (gameInfo: string) => void;
  // tää ylempi takas array jos ei toimi


}

interface ClientToServerEvents {
  update: (message: string) => void;
  create: (room: string) => void;
  decreaseScore: (value: number) => void;
  turn: (user: string) => void;
  setCurrentTurn: (user: string) => void;
  join: (room: string) => void;
  
}

export { ServerToClientEvents, ClientToServerEvents };
