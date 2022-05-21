const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(express.json())
app.use(cors())

// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gnyaq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(uri)

async function run() {
    try {
        await client.connect()
        console.log("database connected")
    }
    finally { }
}
run().catch(console.dir)











app.get('/', (req, res) => {
    res.send('Hey there')
})
app.listen(port, () => {
    console.log(`I am listening on port -${port}`)
})

