// ----------------import--------------------

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// ----------------import--------------------

// ---------------------middleware--------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// ---------------------middleware--------------------

app.get("/", (req, res) => {
  res.send("Craft and Painting server is running");
});

// --------------------mongodb--------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d0cidbu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// custom middleware
const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).send({ message: "Not Authorized" });
    return;
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      console.log(err);
      res.status(401).send({ message: "Not Authorized" });
      return;
    }
    console.log("value in the token: " + decoded);
    req.user = decoded;
    next();
  });
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All collections
    const database = client.db("Cart_Doctor_DB");
    const serviceCollection = database.collection("OurServices");
    const bookingCollection = database.collection("Booking");

    app.get("/our-services", logger, async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    // get single service
    app.get("/details/:id", logger, async (req, res) => {
      const id = req.params.id;
      const result = await serviceCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // set single service
    app.post("/our-services", async (req, res) => {
      const newCoffee = req.body;
      // console.log("this is new coffee:", newCoffee);
      const result = await serviceCollection.insertOne(newCoffee);
      res.json(result);
    });

    // set booking data
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.json(result);
    });
    // get booking data
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log("from valid token", req.user);
      console.log('now', req.query.email);
      if (req?.query.email !== req?.user.email) {
        return res.status(403);
      }
      let query = {};
      if (req.query) {
        query.email = req.query.email;
      }
      console.log("token", req.cookies.token);
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // delete booking data
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const findId = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(findId);
      res.json(result);
    });
    // update single coffee
    // app.put("/services/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const service = req.body;
    //   const findId = { _id: new ObjectId(id) };
    //   const options = { upsert: true };
    //   const updatedService = {
    //     $set: {},
    //   };
    //   const result = await database.updateOne(findId, updatedService, options);
    //   res.json(result);
    // });

    // delete single coffee
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const findId = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(findId);
      res.json(result);
    });

    // auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log('jwt user', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// --------------------mongodb--------------------
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
