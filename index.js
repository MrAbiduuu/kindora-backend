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

// Events created by a specific organizer (must be registered BEFORE /events/:id,
// otherwise "organizer" would be parsed as an event id)
// api url: http://localhost:5000/events/organizer/<email>
app.get("/events/organizer/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const result = await eventsCollection
      .find({ organizerEmail: email })
      .sort({ date: 1 })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch organizer events" });
  }
});

// Get individual event by ID
app.get("/events/:id", async (req, res) => {
  const { id } = req.params;

  console.log("Requested ID:", id);

  const result = await eventsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// Update an event
app.put("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { organizerEmail, ...updatedData } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID" });
    }

    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        organizerEmail: organizerEmail,
      },
      {
        $set: updatedData,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found or you are not the organizer",
      });
    }

    res.send({ message: "Event updated successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to update event" });
  }
});



// api url: http://localhost:5000/events
app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
