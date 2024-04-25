interface ServerToClientEvents {
  addAnimal: (message: string) => void;
  addSpecies: (message: string) => void;
  test: (message: string) => void;
  addGame: (message: string) => void;
  updateScore: (message: string) => void;
  gameOver: (message: string) => void;
  bust: (message: string) => void;


}

interface ClientToServerEvents {
  update: (message: string) => void;
  create: (room: string) => void;
  decreaseScore: (value: number) => void;
}

export { ServerToClientEvents, ClientToServerEvents };
