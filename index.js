// ----------------import--------------------

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// ----------------import--------------------

// ---------------------middleware--------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://voyage-volunteer.firebaseapp.com",
      "http://localhost:5174",
      "https://voyage-volunteer.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// ---------------------middleware--------------------

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
  console.log("52", token);
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

const myCookies = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All collections
    const database = client.db("Voyage_Volunteer_DB");
    const allVolunteerPostCollection = database.collection("AllVolunteerPost");
    const requestCollection = database.collection("Request");
    const testimonialCollection = database.collection("Testimonial");

    // get all volunteer post
    app.get("/all-volunteer-post", logger, async (req, res) => {
      let query = {};
      if (req.query.title) {
        query.postTitle = decodeURIComponent(req.query.title);
      } else {
        query = {};
      }
      const result = await allVolunteerPostCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });
    // get all volunteer post by email
    app.get(
      "/my-volunteer-post/:email",
      logger,
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req?.user.email) {
          return res.status(403);
        }
        const query = {
          organizer_email: email,
        };
        const result = await allVolunteerPostCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      }
    );

    // get single volunteer post
    app.get("/all-volunteer-post/:id", logger, async (req, res) => {
      const id = req.params.id;
      console.log("122", id);
      const result = await allVolunteerPostCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // set single volunteer post
    app.post("/all-volunteer-post", async (req, res) => {
      const newPost = req.body;
      // console.log("this is new coffee:", newCoffee);
      const result = await allVolunteerPostCollection.insertOne(newPost);
      res.json(result);
    });

    // update volunteer post using patch method
    app.patch("/all-volunteer-post/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPost = {
        $set: req.body,
      };
      const findId = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await allVolunteerPostCollection.updateOne(
        findId,
        updatedPost,
        options
      );
      res.send(result);
    });

    // delete volunteer post by delete method
    app.delete("/all-volunteer-post/:id", async (req, res) => {
      const id = req.params.id;
      const findId = { _id: new ObjectId(id) };
      const result = await allVolunteerPostCollection.deleteOne(findId);
      res.send(result);
    });

    // decrement volunteer needed number
    app.patch("/all-volunteer-post/decrement/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPost = {
        $inc: {
          volunteersNeeded: -1,
        },
      };
      const findId = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await allVolunteerPostCollection.updateOne(
        findId,
        updatedPost,
        options
      );
      res.send(result);
    });

    // Increment volunteer needed number
    app.patch("/all-volunteer-post/increment/:id", async (req, res) => {
      const id = req.params.id;
      console.log(158, id);
      const updatedPost = {
        $inc: {
          volunteersNeeded: 1,
        },
      };
      const findId = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await allVolunteerPostCollection.updateOne(
        findId,
        updatedPost,
        options
      );
      res.send(result);
    });

    // set requests data
    app.post("/requests", async (req, res) => {
      const newRequest = req.body;
      const result = await requestCollection.insertOne(newRequest);
      res.json(result);
    });

    // get requests all and specific post
    app.get("/requests", verifyToken, logger, async (req, res) => {
      let query = {};
      if (req?.query?.v_email) {
        query.v_email = req?.query?.v_email.toString();
        if (req?.query?.v_email !== req?.user.email) {
          return res.status(403);
        }
      } else {
        query.organizer_email = req?.query?.organizer_email;
        if (req?.query?.organizer_email !== req?.user.email) {
          return res.status(403);
        }
      }
      const result = await requestCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // update specific requested post by patch method
    app.patch("/requests/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      if (req.body.email !== req?.user.email) {
        return res.status(403);
      }
      const updatedPost = {
        $set: { status: req.body.status },
      };
      console.log("236", updatedPost);
      const findId = { _id: new ObjectId(id) };
      const result = await requestCollection.updateOne(findId, updatedPost);
      res.send(result);
    });

    // delete specific requested post by Delete method
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const findId = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(findId);
      res.send(result);
    });

    // get Testimonial data
    app.get("/testimonial", async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    });

    // auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("jwt user", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.cookie("token", token, myCookies).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...myCookies, maxAge: 0 })
        .send({ success: true });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Voyage Volunteer server is running");
});
// --------------------mongodb--------------------
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
