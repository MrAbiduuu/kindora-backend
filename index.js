import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
const port = 5000;
const app = express();
app.use(cors());

const client = new MongoClient(process.env.MONGODB_URI);
// console.log("MongoDB URI:", process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB();

app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
