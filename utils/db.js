import mongoose from "mongoose";
import "dotenv/config";
export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connection successful")
  } catch (error) {
    console.error(`Error while connecting to DB!!`, error.message);
    throw error;
  }
};
