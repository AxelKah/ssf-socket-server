/* eslint-disable @typescript-eslint/quotes */
import { addGame } from "../graphql/queries";
import { doGraphQLFetch } from "../graphql/fetch";

require("dotenv").config(); // Loading environment variables from .env file

//hardcoded for testing
const apiUrl = process.env.API_URL as string; // API URL from environment variables
//const apiUrl = "https://axelkah-darts.azurewebsites.net/graphql";

const sendGametoDB = async (data: Array<any>, currentTurn: string) => {
console.log("data to server   täälläää  näin satasarfas: ", data);
//  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjNiNTM1NGE2YmIwMDRkNjA3NzhkYjMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJ1c2VyX25hbWUiOiJ0ZXN0Iiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MTUxNjQ0OTV9.eqeVZ-ToSVKKdq7he2PTEa3rFaRCVUABnAzU6RU-hjY";  
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
