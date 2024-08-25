import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import pg from "pg";

const app = express();

//middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
//sesssion initialization
app.use(
  session({
    secret: "HIDDEN",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");

//database connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "workcon",
  password: "tanc1809",
  port: 5432,
});

db.connect()
  .then(() => {
    console.log(`connected to database ${db.database}`);
  })
  .catch((err) => {
    console.log(err);
  });

// mongoose.connect("mongodb://127.0.0.1:27017/studDB", {
//   useNewUrlParser: true,
// });

// const workers = [
//   { id: 1, name: "John", occ: "Plumber", contact: "1234", status: 1 },
//   { id: 2, name: "Josh", occ: "Welder", contact: "5678", status: 0 },
//   { id: 3, name: "Mark", occ: "Electrician", contact: "8674", status: 0 },
//   { id: 4, name: "Dan", occ: "Carpenter", contact: "9784", status: 1 },
// ];

app.listen(3000, function (req, res) {
  console.log("started on 3000");
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/choice", function (req, res) {
  res.render("choice");
});

app.get("/login", function (req, res) {
  res.render("login", { message: "" });
});

app.get("/wlogin", function (req, res) {
  res.render("wlogin", { message: " " });
});

app.get("/register", function (req, res) {
  res.render("register", { message: "" });
});

app.get("/wregister", function (req, res) {
  res.render("wregister", { message: "" });
});

app.post("/register", async function (req, res) {
  const UserId = req.body.userid;
  const pass = req.body.password;
  const name = req.body.Name;
  const contactNo = req.body.contact;
  const job = req.body.job.toLowerCase();
  try {
    const foundUser = await db.query("SELECT * FROM users WHERE userid=$1", [
      UserId,
    ]);
    if (foundUser.rows.length > 0) {
      res.render("register", { message: "User with this ID already exists" });
    } else {
      try {
        db.query(
          "INSERT INTO users(userid,password,name,contact,post) VALUES($1,$2,$3,$4,$5)",
          [UserId, pass, name, contactNo, job]
        );
        res.redirect("/list");
      } catch (err) {
        res.send(err);
      }
    }
  } catch (err) {
    res.send(err);
  }
});

app.post("/wregister", async function (req, res) {
  const UserId = req.body.userid;
  const wid = parseInt(req.body.wid);
  const pass = req.body.password;
  const name = req.body.Name;
  const contactNo = req.body.contact;
  const job = req.body.job.toLowerCase();
  const occupation = req.body.occ.toUpperCase();

  const user = [
    {
      Wid: wid,
      Password: pass,
      Name: name,
      Contact: contactNo,
      Job: job,
      Occ: occupation,
    },
  ];

  let status = 1;
  try {
    const foundUser = await db.query("SELECT * FROM users WHERE userid=$1", [
      UserId,
    ]);

    const foundWorker = await db.query(
      "SELECT * FROM worker WHERE workerid=$1",
      [wid]
    );
    if (foundUser.rows.length > 0) {
      res.render("wregister", {
        message: "User with this ID already exists",
      });
    } else if (foundWorker.rows.length > 0) {
      res.render("wregister", {
        message: "Worker with this ID already exists",
      });
    } else {
      try {
        db.query(
          "INSERT INTO users(userid,password,name,contact,post) VALUES($1,$2,$3,$4,$5)",
          [UserId, pass, name, contactNo, job]
        );
        db.query(
          "INSERT INTO worker(workerid,occupation,status,userid) VALUES($1,$2,$3,$4)",
          [wid, occupation, status, UserId]
        );
        res.redirect("/list");
      } catch (err) {
        res.send(err);
      }
    }
  } catch (err) {
    res.send(err);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/list",
    failureRedirect: "/login",
  })
);

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const foundUser = await db.query(
        "SELECT * FROM users WHERE userid=$1 AND password=$2",
        [username, password]
      );
      if (foundUser.rows.length > 0) {
        if (foundUser) {
          return cb(null, foundUser);
        } else {
          return cb(null, false);
        }
      } else {
        return cb("User not found");
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  return cb(null, user);
});

passport.deserializeUser((user, cb) => {
  return cb(null, user);
});

//Edit profile
app.get("/editprof", async function (req, res) {
  if (req.isAuthenticated()) {
    // const userData = req.user;
    // console.log(req.user);
    if (req.user.post == "user") {
      res.render("userprof", { user: req.user });
    } else {
      res.render("workerprof", { user: req.user });
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/editprof", async function (req, res) {
  const userId = parseInt(req.body.userid);
  const pass = req.body.password;
  const userName = req.body.Name;
  const contactNo = req.body.contact;
  const job = req.body.job;
  const buttonId = req.body.bookingbtn;
  let btnid = 0;

  //If bookings button is clicked
  if (req.body.bookingbtn) {
    //If worker profile is displayed
    if (job == "worker") {
      try {
        const res = await db.query(
          "SELECT workerid FROM worker WHERE userid=$1",
          [buttonId]
        ); //selecting workerid using userid since workerid and userid are different and profile page returns userid.
        if (res.rows.length > 0) {
          btnid = res.rows[0].workerid;
        }
      } catch (err) {
        res.send(err);
      }
      try {
        const bookings = await db.query(
          "SELECT * FROM bookings WHERE workerid=$1",
          [btnid]
        );
        res.render("workerbooking", { bookings: bookings.rows });
      } catch (err) {
        res.send(err);
      }
    }
    //If user profile is displayed
    else if (job == "user") {
      // try {
      //   const result = await db.query(
      //     "SELECT userid FROM users WHERE userid=$1",
      //     [userId]
      //   );
      //   if (result.rows.length > 0) {
      //     btnid = result.rows[0].userid;
      //   }
      // } catch (err) {
      //   res.send(err);
      // }
      btnid = userId;
      try {
        const bookings = await db.query(
          "SELECT * FROM bookings WHERE clientid=$1",
          [btnid]
        );
        res.render("userbooking", { bookings: bookings.rows });
      } catch (err) {
        res.send(err);
      }
    }
  }
  //If edit button is clicked
  else if (req.body.editbtn) {
    try {
      const result = await db.query(
        "UPDATE users SET password=$1,name=$2,contact=$3,post=$4 WHERE userid=$5",
        [pass, userName, contactNo, job, userId]
      );
      if (result) {
        res.redirect("/editprof");
      } else {
        res.send("Error");
      }
    } catch (err) {
      res.send(err);
    }
  }
});

//Userbookings page
app.post("/userbooking", async function (req, res) {
  //if Completed button is clicked

  if (req.body.deletebtn) {
    const dbtnId = req.body.deletebtn;
    console.log(dbtnId);
    try {
      db.query("DELETE FROM bookings WHERE bookingid=$1", [dbtnId]);
      res.send("Appointment removed");
    } catch (err) {
      res.send(err);
    }
  }
  //if Edit booking button is clicked
  else if (req.body.modifybtn) {
    const modifybtnId = parseInt(req.body.modifybtn);
    // console.log(modifybtn);
    try {
      const booking = await db.query(
        "SELECT *,TO_CHAR(bookdate,'mm/dd/yyyy') AS new_date FROM bookings WHERE bookingid=$1",
        [modifybtnId]
      );
      const bookingdate = await db.query(
        "SELECT TO_CHAR(bookdate,'mm/dd/yyyy') FROM bookings WHERE bookingid=$1",
        [modifybtnId]
      );
      const new_date = booking.rows[0].new_date;
      console.log(booking.rows);
      // console.log(bookingdate.rows[0].date);
      // console.log(booking.rows);
      res.render("editbooking", {
        bookingdetails: booking.rows,
        bookingdate: new_date,
        message: "",
      });
    } catch (err) {
      console.log(err);
    }
  }
  //If feedback button is clicked
  else if (req.body.feedbackbtn) {
    const workerId = req.body.feedbackbtn;
    res.render("feedback", { id: workerId, message: "" });
  }
});
//List of workers
app.get("/list", async function (req, res) {
  if (req.isAuthenticated()) {
    try {
      const workers = await db.query("SELECT * FROM worker");
      if (workers.rows.length > 0) {
        //console.log(workers.rows);
        res.render("list", { workers: workers.rows });
      } else {
        res.send("No workers found");
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/list", async function (req, res) {
  const btnid = parseInt(req.body.cardbtn);

  if (req.body.searchval) {
    const searchbtn = req.body.searchval.toUpperCase();
    try {
      const workers = await db.query(
        "SELECT * FROM worker WHERE occupation=$1 ",
        [searchbtn]
      );
      res.render("list", { workers: workers.rows });
    } catch (err) {
      res.send("err");
    }
  }

  try {
    const worker = await db.query(
      "SELECT * FROM worker JOIN users ON worker.userid=users.userid WHERE worker.workerid=$1",
      [btnid]
    );
    const feedback = await db.query(
      "SELECT * FROM feedback JOIN worker ON feedback.workerid=worker.workerid WHERE feedback.workerid=$1",
      [btnid]
    );
    const bookings = await db.query(
      "SELECT * FROM bookings WHERE workerid=$1",
      [btnid]
    );
    //console.log(worker.rows);
    if (worker.rows.length > 0)
      res.render("profile", {
        workerdetails: worker.rows,
        feedbacks: feedback.rows,
        bookings: bookings.rows,
      });
    else res.send("error in fetching profile");
  } catch (err) {
    console.log(err);
  }
});

//Took post request from profile page which has id of the worker and sent it to feedback page.
app.post("/profile", async function (req, res) {
  if (req.body.bookbtn) {
    const workerId = req.body.bookbtn;
    res.render("booking", { id: workerId, message: "", user: req.user });
  }
  // console.log(req.body.feedbackbtn);
  // console.log(req.body.bookbtn);
});

//Feedback form
app.post("/feedback", async function (req, res) {
  const workerId = parseInt(req.body.wid);
  const feed = req.body.content;
  if (feed.length > 0) {
    try {
      db.query("INSERT INTO feedback(content,workerid) VALUES($1,$2)", [
        feed,
        workerId,
      ]);
      res.render("feedback", { id: workerId, message: "Feedback submitted" });
    } catch (err) {
      res.send(err);
    }
  } else {
    res.render("feedback", { id: workerId, message: "enter the feedback" });
  }
});

//Booking form
app.post("/booking", async function (req, res) {
  const bookdate = req.body.bookdate;
  const startTime = req.body.bookstarttime;
  const endTime = req.body.bookendtime;
  const wid = req.body.wid;
  const address = req.body.address;
  const workerId = parseInt(req.body.wid);
  const uid = req.body.uid;
  const bookingId = parseInt(wid + uid);

  try {
    const result = await db.query(
      "SELECT * FROM bookings WHERE bookdate=$1 AND starttime=$2 AND endtime=$3",
      [bookdate, startTime, endTime]
    );
    if (result.rows.length > 0) {
      res.render("booking", {
        id: wid,
        message: "Already booked",
        user: req.user,
      });
    } else {
      try {
        db.query(
          "INSERT INTO bookings(workerid,bookdate,starttime,endtime,clientid,bookingid,address)VALUES($1,$2,$3,$4,$5,$6,$7)",
          [workerId, bookdate, startTime, endTime, uid, bookingId, address]
        );
      } catch (err) {
        res.send(err);
      }
      res.send("Booking successfull");
    }
  } catch (err) {
    res.send(err);
  }
});

//Delete appointment
app.post("/deletebooking", async function (req, res) {
  // console.log(req.body.deletebtn);
  // const dbtnId = req.body.deletebtn;
  // console.log(dbtnId);
  // try {
  //   db.query("DELETE FROM bookings WHERE bookingid=$1", [dbtnId]);
  //   res.send("Appointment removed");
  // } catch (err) {
  //   res.send(err);
  // }
});

//Modify booking details
app.post("/modifybooking", async function (req, res) {
  // const modifybtnId = parseInt(req.body.modifybtn);
  // // console.log(modifybtn);
  // try {
  //   const booking = await db.query(
  //     "SELECT * FROM bookings WHERE bookingid=$1",
  //     [modifybtnId]
  //   );
  //   const bookingdate = await db.query(
  //     "SELECT bookdate FROM bookings WHERE bookingid=$1",
  //     [modifybtnId]
  //   );
  //   console.log(bookingdate.rows[0].date);
  //   console.log(booking.rows);
  //   res.render("editbooking", {
  //     bookingdetails: booking.rows,
  //     message: "",
  //   });
  // } catch (err) {
  //   console.log(err);
  // }
});

app.post("/editbooking", async function (req, res) {
  const bookdate = req.body.bookdate;
  const startTime = req.body.bookstarttime;
  const endTime = req.body.bookendtime;
  const wid = req.body.wid;
  const address = req.body.address;
  const workerId = parseInt(req.body.wid);
  const uid = req.body.uid;
  const bookingId = parseInt(wid + uid);

  try {
    const result = await db.query(
      "UPDATE bookings SET bookdate=$1,starttime=$2,endtime=$3,address=$4 WHERE bookingid=$5",
      [bookdate, startTime, endTime, address, bookingId]
    );
    if (result) {
      res.send("Updated succesfully");
    } else {
      res.send("not updated");
    }
  } catch (err) {
    res.send(err);
  }
});

app.get("/test", function (req, res) {
  res.render("test");
});
