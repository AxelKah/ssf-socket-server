interface ServerToClientEvents {
  addAnimal: (message: string) => void;
  addSpecies: (message: string) => void;
  test: (message: string) => void;
  addGame: (message: string) => void;


}

interface ClientToServerEvents {
  update: (message: string) => void;
  create: (room: string) => void;
}

export { ServerToClientEvents, ClientToServerEvents };
