// insertRegions.js
import mongoose from "mongoose";
import RegionMaster from "../models/region-master-model.js";
import { connectDB } from "./db.js";
const regions = [
  "MUMBAI",
  "KHARGHAR",
  "AHMEDABAD",
  "BANGALURU",
  "BHUBANESHWAR",
  "CHANDIGARH",
  "DELHI",
  "NOIDA",
  "NAGPUR",
  "GANSOLI",
  "HOSPITAL",
  "DHULE",
  "SHIRPUR",
  "INDORE",
  "HYDERABAD"
];

async function insertRegions() {
  await connectDB();
  for (const name of regions) {
    await RegionMaster.updateOne({ name }, { name }, { upsert: true });
  }
  // console.log("Regions inserted/updated!");
  await mongoose.disconnect();
}

insertRegions();
