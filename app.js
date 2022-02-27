require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = process.env.WEB_PORT;
const session = require("express-session");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
const { resolve } = require("path");
const { reject } = require("bcrypt/promises");

const dburl = "mongodb://127.0.0.1:27017";
const dbname = "skripsi-air-monitoring";
const dbclient = new MongoClient(dburl);

dbclient.connect((error, client) => {
  if (error) {
    console.log("cannot connect to database");
    process.exit();
  }
  console.log("database connected.");
});

const db = dbclient.db(dbname);
const users = db.collection("users");
const timeline = db.collection("timeline");

const salt = bcrypt.genSaltSync(10);

let dir = "./data";

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let sensordata = {
  time: 0,
  value: 0,
  timeline: 0,
};

function renderMessage(res, _title, _message) {
  var message = {
    title: _title,
    message: _message,
  };
  res.render("message", message);
}

app.set("view engine", "ejs");

function renderRegister(res, _warning) {
  res.render("form", {
    form: {
      name: "Registration",
      warning: _warning,
      action: "/register",
      button: "register",
      format: [
        { id: "username", description: "Username", type: "text" },
        { id: "password", description: "Password", type: "password" },
        {
          id: "verify-password",
          description: "Verify Passsword",
          type: "password",
        },
      ],
    },
  });
}

app.post("/register", (req, res) => {
  let lenght = 0;
  users.count({}, (error, _length) => {
    lenght = _length;
  });

  if (lenght != 0) {
    renderMessage(res, "You are already registered.", "Go back to login");
    return;
  }

  if (
    (req.body.user == "") |
    (req.body.password == "") |
    (req.body["verify-password"] == "")
  ) {
    renderRegister(res, "Do not let form blank!");
  } else if (req.body.password != req.body["verify-password"]) {
    renderRegister(res, "Your password you're inputting is not same.");
  } else {
    users.insertOne(
      {
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, salt),
      },
      (error, result) => {
        if (!error) {
          res.redirect("/");
        }
      }
    );

    return;
  }
});

function renderLogin(res, _warning) {
  return res.render("form", {
    form: {
      name: "Login",
      warning: _warning,
      action: "/login",
      button: "login",
      format: [
        { id: "username", description: "Username", type: "text" },
        { id: "password", description: "Password", type: "password" },
      ],
    },
  });
}

app.post("/login", async (req, res) => {
  try {
    const user = await (
      await users.find({ username: req.body.username }).toArray()
    )[0];
    if (user == undefined) {
      return renderLogin(res, "Username and password is wrong");
    }
    if ((req.body.username == "") | (req.body.password == "")) {
      return renderLogin(res, "Do not let form blank!");
    } else if (
      (req.body.username != user.username) |
      !(await bcrypt.compare(req.body.password, user.password))
    ) {
      return renderLogin(res, "Username and password is wrong");
    } else {
      req.session.isAuth = true;
      req.session.user = user.username;
      res.redirect("/");
    }
  } catch (err) {
    return renderLogin(res, "Username and password is wrong");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/", (req, res) => {
  if (req.session.isAuth) {
    res.render("dashboard", {
      user: {
        name: req.session.user,
      },
    });
  } else {
    db.collection("users").count({}, (error, length) => {
      if (length == 0) {
        renderRegister(res, "");
      } else {
        renderLogin(res, "");
      }
    });
  }
});

app.get("/api", async (req, res) => {
  /*
  if (!req.session.isAuth) {
    res.status(403);
    res.end();
    return;
  }
  */

  if (req.query.get == "now") {
    res.json(sensordata);
  } else if (req.query.get == "timeline") {
    let limit = Number(req.query.limit);
    limit = isNaN(limit) ? 10 : limit;
    let data = await timeline.find().sort({ _id: -1 }).limit(limit).toArray();

    res.json(data);
  }

  res.status(200);
  res.end();
});

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.listen(port, () => {
  console.log(`Web listening at http://localhost:${port}`);
});

/* ################################################################################################### */
const broker = require("aedes")();
const broker_server = require("net").createServer(broker.handle);
const broker_port = process.env.MQTT_PORT;

let clients = new Map();

broker.authenticate = (client, username, password, callback) => {
  password = Buffer.from(password, "base64").toString();
  if (password == process.env.MQTT_PASSWORD) {
    return callback(null, true);
  } else {
    return callback(new Error(`AEDES : ${client.id} is blocked`));
  }
};

broker_server.listen(broker_port, function () {
  console.log("server started and listening on port ", broker_port);
});

broker.on("clientReady", (client) => {
  console.log(`BROKER : Client (${client.id}) connected.`);
  clients.set(client.id, client);
});

broker.on("clientDisconnect", (client) => {
  console.log(`BROKER : Client (${client.id}) disconnected.`);
  clients.delete(client.id);
});

async function storeData(data) {
  const query = { timeline: data.timeline };

  if ((await (await timeline.find(query).toArray()).length) > 0) {
    let timelinedata = await (await timeline.find(query).toArray())[0].value;
    let round = Math.round((timelinedata + data.value) / 2);
    timeline.updateOne(
      query,
      {
        $set: { timeline: data.timeline, value: round },
      },
      (error, result) => {
        if (error) {
          console.log("Error Updating Data");
        } else {
          //console.log("Data Updated");
        }
      }
    );
  } else {
    timeline.insertOne(
      { timeline: data.timeline, value: data.value },
      (error, result) => {
        if (error) {
          console.log("Error Inserting Data");
        } else {
          //console.log("Data Inserted");
        }
      }
    );
  }
}

broker.on("publish", (_packet, client) => {
  if (client == null) {
    return;
  }
  let now = Date.now();
  sensordata.time = now;
  let timeline = new Date(now).toISOString().split(".")[0].split(":");
  timeline = `${timeline[0]}:${timeline[1]}`;
  sensordata.timeline = timeline;
  sensordata.value =
    Number(_packet.payload) == null ? 0 : Number(_packet.payload);
  storeData(sensordata).then(
    (resolve) => {},
    (reject) => {
      console.log("Data saving failed.");
    }
  );
  console.log(`BROKER : ${client.id} published message : (${_packet.payload})`);
});

setInterval(() => {
  for (var client of clients.entries()) {
    var packet = {
      cmd: "publish",
      messageId: 42,
      qos: 2,
      dup: false,
      topic: "command",
      payload: Buffer.from("request"),
      retain: false,
    };
    client[1].publish(packet, (err) => {
      //console.log(`BROKER : Request client (${client[0]}).`);
    });
  }
}, 1000);

/* ################################################################################################### */
