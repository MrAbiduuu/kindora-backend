import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";
const port = 5000;
const app = express();
app.use(cors());
app.use(express.json());

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
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("kindora");
const eventsCollection = db.collection("events");
//show events
app.get("/events", async (req, res) => {
  const result = await eventsCollection.find({}).toArray();
  res.send(result);
});

// add events
app.post("/events/create", async (req, res) => {
  const data = req.body;
  const result = await eventsCollection.insertOne(data);
  console.log(result);
  res.send(result);
});
// api url: http://localhost:5000/events
app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
