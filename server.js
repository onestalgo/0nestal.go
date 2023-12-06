require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
//const io = socketIo(server);
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "2nest";
let imagesCollection;

async function main() {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);
    imagesCollection = db.collection("images");

    io.on('connection', async (socket) => {
        console.log('A user connected');
        try {
            const images = await imagesCollection.find({}).toArray();
            socket.emit('initialImages', images);
        } catch (err) {
            console.error('Error fetching images:', err);
        }

        socket.on('uploadImage', async (data) => {
            try {
                await imagesCollection.insertOne(data);
                io.emit('imageUpdate', data);
            } catch (e) {
                console.error("Error saving image:", e);
            }
        });

        socket.on('resizeAndMoveImage', async (data) => {
            try {
                await imagesCollection.updateOne({ src: data.src }, { $set: { x: data.x, y: data.y, width: data.width, height: data.height } });
                io.emit('imageUpdate', data); // Broadcast updated data
            } catch (e) {
                console.error("Error updating image:", e);
            }
        });

        socket.on('deleteImage', async (data) => {
            try {
                await imagesCollection.deleteOne({ src: data.src });
                io.emit('imageDeleted', data); // Notify all clients about the deletion
            } catch (e) {
                console.error("Error deleting image:", e);
            }
        });

        socket.on('resizeImage', async (data) => {
            try {
                const updateResult = await imagesCollection.updateOne({ src: data.src }, { $set: data });
                if (updateResult.matchedCount === 0) {
                    console.log('No matching document found to update');
                } else {
                    console.log('Document updated successfully');
                    io.emit('imageUpdate', data); // Broadcast the update to all clients
                }
            } catch (err) {
                console.error('Error updating image in DB:', err);
            }
        });

        socket.on('startResizeAnimation', (data) => {
            // Broadcast the resize animation data to all clients
            io.emit('resizeAnimation', data);
        });

   

    });

    const port = 3000;
    server.listen(port, () => console.log(`Server running on port: ${port}`));

    app.use(express.static('public'));
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/index.html');
    });
}

main().catch(console.error);
