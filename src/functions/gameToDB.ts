/* eslint-disable @typescript-eslint/quotes */
import { addGame } from "../graphql/queries";
import { doGraphQLFetch } from "../graphql/fetch";

require("dotenv").config(); // Loading environment variables from .env file

//hardcoded for testing
const apiUrl = process.env.API_URL as string; // API URL from environment variables
//const apiUrl = "https://axelkah-darts.azurewebsites.net/graphql";

const sendGametoDB = async (data: Array<any>, currentTurn: string) => {
  console.log("data to server: ", data);
  const token = process.env.TOKEN as string;
  try {
    console.log("apiurl: ", apiUrl);
    if (data.length > 0) {
      // Check if the data array is not empty
      const winnerData = await new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await doGraphQLFetch(
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
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 10000); // 5 seconds timeout
      });
    } else {
      console.error("Error: Data array is empty");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

export default sendGametoDB;
