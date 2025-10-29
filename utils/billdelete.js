import "dotenv/config";
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";

const connectDB = async () => {

  try {
    const connection = await mongoose.connect("mongodb+srv://adityagupta5277:kvixFMX3Ctl46i4i@cluster0.jxetv.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0");
    
    // console.log(
    //   `Connected to database successfully ${connection.connection.host}`
    // );
  } catch (error) {
    // console.log(`Error while connecting to DB!!`, error);
    throw error;
  }
};
async function deleteBills() {
  await connectDB();
  // Get the _id values of bills to delete (skip first 100)
  const billsToDelete = await Bill.find({}, { _id: 1 });
  const idsToDelete = billsToDelete.map(doc => doc._id);

  // Delete the bills with those _ids
  await Bill.deleteMany({ _id: { $in: idsToDelete } });
  // console.log("Bills deleted.");
  mongoose.connection.close();
}

deleteBills();
