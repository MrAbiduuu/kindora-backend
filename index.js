import express from "express";
import cors from "cors";
const port = 5000;
const app = express();
app.use(cors());



app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
