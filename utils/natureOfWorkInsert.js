import mongoose from "mongoose";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import {connectDB} from "./db.js";

const works = [
  { natureOfWork: "Proforma Invoice" },
  { natureOfWork: "Credit note" },
  { natureOfWork: "Hold/Ret Release" },
  { natureOfWork: "Direct FI Entry" },
  { natureOfWork: "Advance/LC/BG" },
  { natureOfWork: "Petty cash" },
  { natureOfWork: "Imports" },
  { natureOfWork: "Materials" },
  { natureOfWork: "Equipments" },
  { natureOfWork: "IT related" },
  { natureOfWork: "IBMS" },
  { natureOfWork: "Consultancy bill" },
  { natureOfWork: "Civil Works" },
  { natureOfWork: "STP Work" },
  { natureOfWork: "MEP Work" },
  { natureOfWork: "HVAC Work" },
  { natureOfWork: "Fire Fighting Work" },
  { natureOfWork: "Petrol/Diesel" },
  { natureOfWork: "Painting work" },
  { natureOfWork: "Utility Work" },
  { natureOfWork: "Site Infra" },
  { natureOfWork: "Carpentry" },
  { natureOfWork: "Housekeeping/Security" },
  { natureOfWork: "Overheads" },
  { natureOfWork: "Others" },
];

async function insertNatureOfWork() {
  await connectDB();
  await NatureOfWorkMaster.deleteMany({});
  await NatureOfWorkMaster.insertMany(works);
  mongoose.connection.close();
}

insertNatureOfWork();
