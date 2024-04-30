/* eslint-disable @typescript-eslint/no-unused-vars */
const getAllAnimals = `
query Animals {
    animals {
        animal_name
        id
    }
}`;

const getAllSpecies = `
query Species {
    species {
        species_name
        id
    }
}`;

const addGame = `
mutation AddGame($game: GameInput!) {
    addGame(game: $game) {
        user1
        user2
        winner
        }
        }`;

const login = `
mutation Login($credentials: Credentials!) {
    login(credentials: $credentials) {
      message
      token
      user {
        email
        id
        user_name
      }
    }
  }
  `;

const checkToken = `
query CheckToken {
    checkToken {
      message
      user {
        user_name
      }
    }
  }
`;

export { login, checkToken, addGame };
