import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

// upcoming events (date >= today, soonest first)
// api url: http://localhost:5000/events/upcoming
app.get("/events/upcoming", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const result = await eventsCollection
    .find({ date: { $gte: today } })
    .sort({ date: 1 })
    .toArray();
  res.send(result);
});

// Get individual event by ID
app.get("/event/:id", async (req, res) => {
  const { id } = req.params;

  console.log("Requested ID:", id);

  const result = await eventsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// single event details (includes volunteers array)
// api url: http://localhost:5000/events/:id
app.get("/events/:id", async (req, res) => {
  try {
    const result = await eventsCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!result) return res.status(404).send({ message: "Event not found" });
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: "Invalid event id" });
  }
});

// join an event as a volunteer (adds email once, res.detail volunteers)
// api url: http://localhost:5000/events/:id/join   body: { email }
app.post("/events/:id/join", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).send({ message: "A valid volunteer email is required" });
    }
    const event = await eventsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { volunteers: email } },
      { returnDocument: "after", projection: { volunteers: 1 } }
    );
    if (!event) return res.status(404).send({ message: "Event not found" });
    res.send({ volunteers: event.volunteers ?? [] });
  } catch (err) {
    res.status(400).send({ message: "Invalid event id" });
  }
});

// api url: http://localhost:5000/events
app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
