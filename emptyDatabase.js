require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI; // Make sure this is correctly set
console.log("URI: ", uri); // Debugging line to check the URI

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function emptyDatabase() {
    try {
        await client.connect();
        const db = client.db("2nest");

        // List of collection names to drop
        const collections = ["images"]; // etc.

        for (const collection of collections) {
            await db.collection(collection).drop();
            console.log(`Dropped collection: ${collection}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

emptyDatabase();
