const express = require("express");
const { MongoClient, ServerApiVersion, Db } = require('mongodb');
const app = express();
require('dotenv').config();
const cors =require('cors');
const jwt =require('jsonwebtoken');
const port =process.env.PORT || 5000;


// medile were

app.use(cors());
app.use(express.json());


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