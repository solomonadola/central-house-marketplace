import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose
  .connect(process.env.DB)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => console.error(err));
const app = express();

app.listen(3000, () => {
  console.log("the server is running on port 3000!");
});
