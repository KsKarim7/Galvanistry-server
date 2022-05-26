const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { decode } = require('jsonwebtoken');
// const { use } = require('express/lib/application');


// middleware
app.use(cors())
app.use(express.json())

// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gnyaq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(uri)

// JWT 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // console.log(authHeader)
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        // console.log('decod', decoded);
        next();
    })
}

async function run() {
    try {
        await client.connect()
        // console.log("database connected")

        // db collections
        const productsCollection = client.db('galva_nistry').collection('products')
        const userCollection = client.db('galva_nistry').collection('users')
        const orderCollection = client.db('galva_nistry').collection('orders')
        const paymentCollection = client.db('galva_nistry').collection('payments')
        const profileCollection = client.db('galva_nistry').collection('profiles')

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query)
            const data = await cursor.toArray()
            res.send(data)
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: ObjectId(id) }
            const products = await productsCollection.findOne(query);
            res.send(products)
        })


        // update user's email
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const initiator = req.params.email;
            const initiatorAccount = await userCollection.findOne({ email: initiator });
            if (initiatorAccount.role === 'admin') {
                const filter = { email: email };
                const updatedDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updatedDoc);
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        })

        app.get('/order', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders)
        })

        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(query);
            res.send(order)
        })

        // add user's review
        app.post('/user', async (req, res) => {
            const addReview = req.body;
            const result = await userCollection.insertOne(addReview);
            res.send(result)
        })

        // get review
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = userCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews)
        })

        // get all users
        app.get('/users', verifyJWT, async (req, res) => {
            const review = req.query.email;
            const query = { review: review }
            const cursor = userCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // get all orders 
        app.get('/manage', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        // delete product in manage product route
        app.delete('/manage/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })
        // delete orders in my orders route
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
        })

        // get all order
        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query)
            const data = await cursor.toArray()
            res.send(data)
        });

        // payment api

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;   //if it doesn't work with order , try with product 
            const cost = order.cost;
            const amount = cost * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            const result = await paymentCollection.insertOne(payment);
            res.send(updatedDoc)

        })

        // add user profiles
        app.post('/profile', async (req, res) => {
            const profile = req.body;
            const result = await profileCollection.insertOne(profile);
            res.send(result)
        })

        // add product
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

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

