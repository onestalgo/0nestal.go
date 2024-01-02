require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { MongoClient } = require("mongodb");
const { body, validationResult } = require("express-validator");

const app = express();
const server = http.createServer(app);
const path = require("path");
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(express.json()); // Middleware to parse JSON bodies
app.use("/logo", express.static(path.join(__dirname, "logo")));
app.use("/public", express.static(path.join(__dirname, "public")));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "2nest";
let imagesCollection;
//let canvasScreenshotsCollection

async function main() {
  await client.connect();
  console.log("Connected to MongoDB");
  const db = client.db(dbName);
  imagesCollection = db.collection("images");
  // canvasScreenshotsCollection = db.collection("CanvasScreenshots"); // Initialize the collection

  io.on("connection", async (socket) => {
    console.log("A user connected");
    try {
      const images = await imagesCollection.find({}).toArray();
      socket.emit("initialImages", images);
    } catch (err) {
      console.error("Error fetching images:", err);
    }

    socket.on("uploadImage", async (data) => {
      try {
        await imagesCollection.insertOne(data);
        io.emit("imageUpdate", data);
      } catch (e) {
        console.error("Error saving image:", e);
      }
    });

    socket.on("lockImage", (data) => {
      // Broadcast the lock event
      socket.broadcast.emit("lockImage", data);

      // Set a timeout to automatically unlock the image
      setTimeout(() => {
        // Emit unlock event after timeout (e.g., 10 seconds)
        io.emit("unlockImage", data);
      }, 800); // Adjust the timeout duration as needed
    });
    //app.post('/api/upload-canvas-image', async (req, res) => {
    //try {
    //  const { image } = req.body; // This is your base64 encoded image
    // Save to MongoDB
    // You might need to create a new collection for storing these images
    //  const result = await canvasScreenshotsCollection.insertOne({ image });
    // res.status(200).json({ message: 'Image saved successfully', id: result.insertedId });
    //} catch (error) {
    //     console.error('Error saving canvas image:', error);
    //     res.status(500).send('Error saving canvas image');
    //   }
    //  });

    // Image upload endpoint
    app.post(
      "/upload-image",
      // Validation checks
      body("src").isString().withMessage("Source must be a string"),
      body("x").isNumeric().withMessage("X coordinate must be a number"),
      body("y").isNumeric().withMessage("Y coordinate must be a number"),
      // ... more validations as needed ...
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        // Process the image upload here
        // ...
      }
    );

    socket.on("resizeAndMoveImage", async (data) => {
      try {
        await imagesCollection.updateOne(
          { src: data.src },
          {
            $set: {
              x: data.x,
              y: data.y,
              width: data.width,
              height: data.height,
            },
          }
        );
        io.emit("imageUpdate", data);
      } catch (e) {
        console.error("Error updating image:", e);
      }
    });

    socket.on("deleteImage", async (data) => {
      try {
        await imagesCollection.deleteOne({ src: data.src });
        io.emit("imageDeleted", data); // Notify all clients about the deletion
      } catch (e) {
        console.error("Error deleting image:", e);
      }
    });

    socket.on("resizeImage", async (data) => {
      try {
        const updateResult = await imagesCollection.updateOne(
          { src: data.src },
          { $set: data }
        );
        if (updateResult.matchedCount === 0) {
          console.log("No matching document found to update");
        } else {
          console.log("Document updated successfully");
          io.emit("imageUpdate", data); // Broadcast the update to all clients
        }
      } catch (err) {
        console.error("Error updating image in DB:", err);
      }
    });

    socket.on("unlockImage", (data) => {
      // Broadcast the unlock event to all clients
      socket.broadcast.emit("unlockImage", data);
    });
  });

  const port = process.env.PORT || 3000; // Use PORT environment variable for Heroku
  server.listen(port, () => console.log(`Server running on port: ${port}`));
  app.use(express.static("public"));
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

main().catch(console.error);
