import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";
import {connectDB} from "./db.js";

const panStatuses = [
  { name: "PAN operative/N.A." },
];

async function insertPanStatuses() {
  await connectDB();
  await PanStatusMaster.deleteMany({});
  await PanStatusMaster.insertMany(panStatuses);
  mongoose.connection.close();
}

insertPanStatuses();
