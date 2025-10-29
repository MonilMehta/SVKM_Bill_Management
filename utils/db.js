import mongoose from "mongoose";
import "dotenv/config";
export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    // console.log(`Connecting to database...`);
    // console.log(
    //   `Connected to database successfully ${connection.connection.host}`
    // );
  } catch (error) {
    // console.log(`Error while connecting to DB!!`, error);
    throw error;
  }
};
