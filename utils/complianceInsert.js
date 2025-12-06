import mongoose from "mongoose";
import ComplianceMaster from "../models/compliance-master-model.js";
import {connectDB} from "./db.js";

const compliances = [
  { compliance206AB: "206AB check on website" },
  { compliance206AB: "2024-Specified Person U/S 206AB" },
  { compliance206AB: "2024-Non-Specified person U/S 206AB" },
  { compliance206AB: "2025-Specified Person U/S 206AB" },
  { compliance206AB: "2025-Non-Specified person U/S 206AB" },
];

async function insertCompliances() {
  await connectDB();
  await ComplianceMaster.deleteMany({}); // Delete all existing compliance records
  await ComplianceMaster.insertMany(compliances); // Insert new compliance records
  mongoose.connection.close();
}

insertCompliances();
