const express = require("express");
const { MongoClient, ServerApiVersion, Db, ObjectId } = require('mongodb');
const app = express();
const fileupload = require('express-fileupload');
const multer = require('multer');
const mongoose =require('mongoose');
require('dotenv').config();
const cors =require('cors');
const jwt =require('jsonwebtoken');
const port =process.env.PORT || 5000;

// app.use(
//     fileupload({
//       createParentPath: true,
//     }),
//   );

// medile were

app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


//verify jwt access token

const verifyJwt=(req,res,next)=>{
    const authorization =req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error:true,massage:"Unauthoriazation"})

    }

    if(authorization !== undefined){
        const token =authorization.split(' ')[1];
        jwt.verify(token,process.env.JWT_TOKEN,(err,decoded)=>{
            if(err){
                return res.status(401).send({error:true,massage:"Unauthoriazation"})
            }
            req.decoded = decoded;
            next();
        })
    }
    else{
        console.error('The variable is undefined.');
    }
}

// mongoDb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bzjru.mongodb.net/?retryWrites=true&w=majority`;

// mongoos connect
mongoose.connect(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define a mongoose schema for your collection
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    imageUrl: String,
  });
  
  const Product = mongoose.model('Product', productSchema);
  
  // Set up Multer to handle file uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'upload/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  });
  
  const upload = multer({ storage: storage }).single('image');
  



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
    console.log('collcet mongo db')

    const usersCollection = client.db("bookShop").collection("users");
    const booksCollection = client.db("bookShop").collection("books");
    const imageCollection = client.db("bookShop").collection("uploads");



    // verify admin
    const verifyAdmin = async (req,res,next)=>{
        const email =req.decoded.email;
        const query ={email:email};
        const user =await usersCollection.findOne(query);
        if(user?.role !=='admin'){
            return res.status(403).send({ error: true, message: 'forbidden message' })
        }
        next();
    }
    // jwt web token
     
    app.post('/jwt',(req,res)=>{
        const user =req.body;
        const token = jwt.sign(user, process.env.JWT_TOKEN,{expiresIn: '1h'});
        res.send({token: token});
    })
    
    // user apis
    app.get('/users',async(req,res)=>{
        const result = await usersCollection.find({}).toArray();
        res.send(result)
    })

    app.post('/users', async (req,res)=>{
        const user = req.body;
        // console.log(user);
        const query ={email: user.email};
        const existingUser =await usersCollection.findOne(query);
        if(existingUser){
            return res.send({massage : 'User Alredy Create'})
        }
        const result =await usersCollection.insertOne(user);
        res.send(result);
    });
 
    // verify jwt admin secqurity
    app.patch("/users/admin/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      });

    // admin apis

    app.get('/users/admin/:email',verifyJwt,async(req,res)=>{
        const email=req.params.email;
        const decodedEail =req.decoded.email;
        if(decodedEail !== email){
            res.send({admin:false});
        }
        const query ={email:email}
        const user = await usersCollection.findOne(query);
        const result ={admin: user?.role ==="admin"}
        console.log('admin:',result)
        res.send(result);
    })

    // image apis

    app.get('/uploads',async(req,res)=>{
        const result = await imageCollection.find().toArray()
        res.send(result);
    })



    // Handle image upload
app.post('/uploads', async (req, res) => {

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          return res.status(500).json({ success: false, message: 'Multer Error', error: err.message });
        } else if (err) {
          // An unknown error occurred when uploading.
          return res.status(500).json({ success: false, message: 'Unknown Error', error: err.message });
        }
    
        // No errors, continue processing.
    
        const { name, description } = req.body;
    
        // Save the image metadata in MongoDB
        const product = new Product({
          name: name,
          description: description,
          imageUrl: `/upload/${req.file.filename}`, // Assuming 'uploads' is a public directory
        });
    
        product.save()
          .then(() => {
            res.json({ success: true,product, message: 'Image uploaded and metadata saved successfully.' });
          })
          .catch(error => {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error saving to MongoDB' });
          });
      });
  });

    app.get('/books',async(req,res)=>{
        const result =await booksCollection.find().toArray();
        res.send(result);
    })


    app.post('/books',verifyJwt,verifyAdmin,async(req,res)=>{
        const newBook =req.body;
        const result =await booksCollection.insertOne(newBook);
        res.send(result);
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


app.get('/',(req,res)=>{
    res.send('Book is Running')
});

app.listen(port,()=>{
    console.log(`Book is running on port ${port}`);
})