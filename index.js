import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./utils/db.js";

const app = express();

const port = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

import billRoute from "./routes/bill-route.js";
app.use('/bill',billRoute)

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
