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
// Delete an event
app.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { organizerEmail } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID" });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
      organizerEmail: organizerEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Event not found or you are not the organizer",
      });
    }

    res.send({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to delete event" });
  }
});

// Join an event as a volunteer.
// Body: { email, name } — volunteers are stored by their first name,
// and volunteerEmails keeps their email for "already joined" checks.
// api url: http://localhost:5000/events/<id>/join
app.post("/events/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID" });
    }

    if (!email) {
      return res
        .status(401)
        .send({ message: "Please log in to join this event." });
    }

    // First name of the user (falls back to the email's local part)
    const firstName =
      (name && String(name).trim().split(/\s+/)[0]) ||
      String(email)
        .split("@")[0]
        .split(/[._-]+/)[0];

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $addToSet: {
          volunteers: firstName,
          volunteerEmails: email,
          joinedUsers: email,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Event not found" });
    }

    const updated = await eventsCollection.findOne({ _id: new ObjectId(id) });
    res.send({ message: "Successfully joined the event", ...updated });
  } catch (error) {
    res.status(500).send({ message: "Failed to join event" });
  }
});

// Get events joined by a specific user (email), sorted by event date
// api url: http://localhost:5000/joined-events/<email>
app.get("/joined-events/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await eventsCollection
      .find({ joinedUsers: email })
      .sort({ date: 1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch joined events" });
  }
}); 

app.delete("/events/:id/leave", async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: {
          volunteers: email,
          volunteerEmails: email,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found",
      });
    }

    res.send({
      success: true,
      message: "You have left the event successfully",
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to leave event",
      error: error.message,
    });
  }
});


// api url: http://localhost:5000/events
app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
