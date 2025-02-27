const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.byauspy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const booksCollection = client.db('bookDB').collection('books');
        const borrowCollection = client.db('bookDB').collection('borrow');

        // get all books
        app.get('/books', async (req, res) => {
            const cursor = booksCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })
        // post all books
        app.post('/books', async (req, res) => {
            const newBook = req.body;
            const result = await booksCollection.insertOne(newBook);
            res.send(result)
        });

        app.get('/allBooks/:category', async (req, res) => {
            const cursor = booksCollection.find({category: req.params.category});
            const result = await cursor.toArray();
            res.send(result)
        })
        // Update
        app.put('/books/:id',  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedBook = req.body;
            const spot = {
                $set: {
                    book_name: updatedBook.book_name,
                    rating: updatedBook.rating,
                    photo: updatedBook.photo,
                    author_name: updatedBook.author_name,
                    category: updatedBook.category
                }
            };
            const result = await booksCollection.updateOne(filter, spot, options);
            res.send(result)
        });
        // get a single bookDetails
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.findOne(query);
            res.send(result)
        })

        // post to borrow list
        app.post('/borrow', async (req, res) => {
            const borrowData = req.body;
            const existingBorrow = await borrowCollection.findOne({
                email: borrowData.email,
                book_id: borrowData.book_name
            });

            if (existingBorrow) {
                return res.status(400).send({ error: 'User has already borrowed this book.' });
            }
            const result = await borrowCollection.insertOne(borrowData);
            // update quantity
            const updateDoc = {
                $inc: {quantity: -1},
            }
            const quantityQuery = { _id: new ObjectId(borrowData._id) };
            const updateQuantityCount = await booksCollection.updateOne(quantityQuery, updateDoc);
            res.send(result);
        })

        // delete from borrow list page
        app.delete('/borrow/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const result = await borrowCollection.deleteOne(query);
            res.send(result);
        });

        // borrow list page
        app.get('/borrow/:email', async (req, res) => {
            const result = await borrowCollection.find({ email: req.params.email }).toArray();
            res.send(result)
        })

        app.get('/borrow', async (req, res) => {
            const cursor = borrowCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('library management server is running')
})

app.listen(port, () => {
    console.log(`library management server is running on port: ${port}`)
})