import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const port = process.env.PORT || 5000;

// ==============================
// 1. Environment configuration
// ==============================

const AUTH_BASE_URL = process.env.AUTH_BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;
const MONGODB_URI = process.env.MONGODB_URI;

if (!AUTH_BASE_URL) {
  throw new Error("AUTH_BASE_URL is missing");
}

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing");
}

if (!CLIENT_URL) {
  throw new Error("CLIENT_URL is missing");
}

// ==============================
// 2. Middleware
// ==============================

app.use(
  cors({
    origin: CLIENT_URL.split(",").map((url) => url.trim()),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));

// ==============================
// 3. Better Auth JWT verification
// ==============================

const JWKS = createRemoteJWKSet(new URL(`${AUTH_BASE_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized: Token missing",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).send({
        message: "Unauthorized: Token missing",
      });
    }

    const { payload } = await jwtVerify(token, JWKS);

    if (!payload.sub) {
      return res.status(401).send({
        message: "Invalid token: User ID missing",
      });
    }

    req.user = payload;

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).send({
      message: "Invalid or expired token",
    });
  }
};

// ==============================
// 4. Authenticated user helper
// ==============================

const getUserEmail = (req) => {
  if (typeof req.user?.email !== "string") {
    return null;
  }

  return req.user.email.trim().toLowerCase();
};

const requireUserEmail = (req, res) => {
  const email = getUserEmail(req);

  if (!email) {
    res.status(401).send({
      message: "Authenticated user email is unavailable",
    });

    return null;
  }

  return email;
};

// ==============================
// 5. MongoDB connection
// ==============================

const client = new MongoClient(MONGODB_URI);

await client.connect();

console.log("Successfully connected to MongoDB!");

const db = client.db("kindora");
const eventsCollection = db.collection("events");

// ==============================
// 6. Public routes
// ==============================

// Server status
app.get("/", (req, res) => {
  res.send({
    message: "Hello from the Kindora server!",
  });
});

// Upcoming events
app.get("/events/upcoming", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await eventsCollection
      .find({ date: { $gte: today } })
      .sort({ date: 1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch upcoming events",
    });
  }
});

// Individual event
app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const result = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        message: "Event not found",
      });
    }

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch event",
    });
  }
});

// ==============================
// 7. Protected routes
// ==============================

// Show all events
app.get("/events", verifyToken, async (req, res) => {
  try {
    const result = await eventsCollection.find({}).toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch events",
    });
  }
});

// Create event
app.post("/events/create", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const data = {
      ...req.body,
      organizerEmail: email,
      organizerId: req.user.sub,
    };

    // Never accept a client-supplied ID
    delete data._id;

    const result = await eventsCollection.insertOne(data);

    res.status(201).send({
      message: "Event created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to create event",
    });
  }
});

// Organizer events
app.get("/events/organizer/:email", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const requestedEmail = req.params.email.trim().toLowerCase();

    if (requestedEmail !== email) {
      return res.status(403).send({
        message: "You cannot access another organizer's events",
      });
    }

    const result = await eventsCollection
      .find({ organizerEmail: email })
      .sort({ date: 1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch organizer events",
    });
  }
});

// Update event
app.put("/events/:id", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const updatedData = { ...req.body };

    // Protected fields cannot be changed by the client
    delete updatedData._id;
    delete updatedData.organizerEmail;
    delete updatedData.organizerId;
    delete updatedData.volunteers;
    delete updatedData.volunteerEmails;
    delete updatedData.joinedUsers;

    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        organizerEmail: email,
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

    res.send({
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to update event",
    });
  }
});

// Delete event
app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
      organizerEmail: email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Event not found or you are not the organizer",
      });
    }

    res.send({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to delete event",
    });
  }
});

// Join event
app.post("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const name = typeof req.user.name === "string" ? req.user.name.trim() : "";

    const firstName =
      name.split(/\s+/)[0] || email.split("@")[0].split(/[._-]+/)[0];

    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $addToSet: {
          volunteers: firstName,
          volunteerEmails: email,
          joinedUsers: email,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found",
      });
    }

    const updated = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send({
      message: "Successfully joined the event",
      ...updated,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to join event",
    });
  }
});

// Joined events
app.get("/joined-events/:email", verifyToken, async (req, res) => {
  try {
    const email = requireUserEmail(req, res);

    if (!email) return;

    const requestedEmail = req.params.email.trim().toLowerCase();

    if (requestedEmail !== email) {
      return res.status(403).send({
        message: "You cannot access another user's joined events",
      });
    }

    const result = await eventsCollection
      .find({ joinedUsers: email })
      .sort({ date: 1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});

// ==============================
// 8. Start server
// ==============================

app.listen(port, () => {
  console.log(`Kindora server is running on port ${port}`);
});

export default app;
