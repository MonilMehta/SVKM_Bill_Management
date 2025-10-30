import mongoose from "mongoose";
import "dotenv/config";
export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error(`Error while connecting to DB!!`, error);
    throw error;
  }
};
