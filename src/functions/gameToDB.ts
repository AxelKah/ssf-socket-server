/* eslint-disable @typescript-eslint/quotes */
import { addGame } from "../graphql/queries";
import { doGraphQLFetch } from "../graphql/fetch";

require("dotenv").config(); // Loading environment variables from .env file


const apiUrl = process.env.API_URL as string; // API URL from environment variables

const sendGametoDB = async (data: Array<any>, currentTurn: string) => {

  const token = process.env.TOKEN as string;
  try {
    if (data.length > 0) {
      // Check if the data array is not empty
      const winnerData = await doGraphQLFetch(
        apiUrl,
        addGame,
        {
          game: {
            user1: data[0].players[0],
            user2: data[0].players[1],
            winner: currentTurn,
          },
        },
        token,
      );
    } else {
      console.error("Error: Data array is empty");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

export default sendGametoDB;
