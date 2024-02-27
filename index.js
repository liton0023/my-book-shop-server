const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const cors =require('cors');
const jwt =require('jsonwebtoken');
const port =process.env.PORT || 5000;



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
    const booksCollection = client.db("bookShop").collection("books");
    const cartCollection = client.db("bookShop").collection("cart");
    const silderImageCollection = client.db("bookShop").collection("sliderImage");
    const commentCollection = client.db("bookShop").collection("comment");



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

    app.get('/users/:email',verifyJwt, async(req,res)=>{
      const email =req.params.email;
      console.log(email);
      if(!email){
        res.send([]);
      }
      const query={email:email};
      const result = await usersCollection.findOne(query);
      // console.log(result)
      res.send(result);

    })

    // app.get('/users',async(req,res)=>{
    //   const users = await usersCollection.find().toArray();
    //   console.log(users)
    //   res.send(users);
    // })
 
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
    // books api

    app.get('/books',async(req,res)=>{
        const result =await booksCollection.find().toArray();
        res.send(result);
    })

    app.get('/books/:id',async(req,res)=>{
      const id = req.params.id;
      const queryFilter = {_id: new ObjectId(id)}
      // console.log(id)
      const result = await booksCollection.findOne(queryFilter);
      // console.log(result)
      res.send(result)
    })


    app.post('/books',verifyJwt,verifyAdmin,async(req,res)=>{
        const newBook =req.body;
        const result =await booksCollection.insertOne(newBook);
        res.send(result);
    })

    app.delete('/books/:id',verifyJwt,verifyAdmin,async(req,res)=>{
      const id =req.params.id;
      const query ={ _id:new ObjectId(id)}
      const result = await booksCollection.deleteOne(query);
      // console.log(result)
      res.send(result);
    })

    app.put('/books/:id',verifyJwt,verifyAdmin,async(req,res)=>{
      const id =req.params.id;
      // console.log(id);
      const filter ={_id: id};
      const{name,price,category,wirter,imgUrl}=req.body;
      // console.log(name);
      const updateItem ={
        name : name,
        price :price,
        wirter: wirter,
        category : category ,
        imgUrl : imgUrl
      }
      console.log(updateItem)
      const option ={new : true};

      try{
 
        const result = await booksCollection.replaceOne(filter,updateItem,option)
        if(result.modifiedCount === 0){
          console.log('Document replaced successfylly');
        }
        else{
          console.log('Document not found or not replaced');
        }
        // console.log(result)
      }
      catch (err) {

        console.error('Error replacing document:', err);
      }




    })

    // slider image api

    app.post('/sliderimg',verifyJwt,verifyAdmin,async(req,res)=>{
      const slideImg = req.body;

      // console.log(slideImg)
      const result =  await silderImageCollection.insertOne({slideImg: slideImg})
      // console.log(result);
      res.send(result);
    })

    app.get('/sliderimg',async(req,res)=>{
        const result = await silderImageCollection.find().toArray();
        console.log(result);
        res.send(result)
    })

    // carts apis

    app.get('/carts',verifyJwt, async(req,res)=>{
      const email =req.query.email;
      // console.log(email);
      if(!email){
        res.send([]);
      }

      const decodedEmail =req.decoded.email;

      if(decodedEmail !=email){
        return res.status(403).send({ error: true, message: "forbidden access" })

      }
      const query={email:email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);

    })


    app.post('/carts',async(req,res)=>{
      const item =req.body;
      // console.log(item);
      const result =await cartCollection.insertOne(item)
      res.send(result)
    })

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // comment api

    app.post('/comment',async(req,res)=>{
      const comment =req.body;
      console.log(comment);
      const result = await commentCollection.insertOne({comment:comment});
      // console.log(result);
      res.send(result);

    })

    app.get('/comment',async(req,res)=>{
      // const id = req.body;
      // console.log(id)
         const resuslt = await commentCollection.find().toArray();
        //  console.log(resuslt);
         res.send(resuslt)
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