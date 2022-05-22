const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gnyaq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(uri)

async function run() {
    try {
        await client.connect()
        // console.log("database connected")

        const productsCollection = client.db('galva_nistry').collection('products')

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query)
            const data = await cursor.toArray()
            res.send(data)
        });

    }
    finally {

    }
}



run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hey there')
})
app.listen(port, () => {
    console.log(`I am listening on port -${port}`)
})

