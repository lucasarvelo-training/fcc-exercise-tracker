const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Exercise = require("../models/exercise");
const mongoose = require("mongoose");

router.post("/new-user", (req, res, next) => {
  const user = new User(req.body);

  User.findOne({ username: req.body.username }, (error, savedUser) => {
    if (error) return next(error);
    if (savedUser) {
      res.json({
        username: savedUser.username,
        _id: savedUser._id
      });
    } else {
      user.save((error, user) => {
        if (error) return next(error);

        res.json({
          username: user.username,
          _id: user._id
        });
      });
    }
  });
});

router.get("/users", (req, res, next) => {
  User.find({}, (error, users) => {
    if (error) return next(error);

    res.json(
      users.map(user => {
        return { username: user.username, _id: user._id };
      })
    );
  });
});

router.post("/add", (req, res, next) => {
  //Remove empty strign from date to trigger default in Exercise mongoose Schema
  if (req.body.date === "") req.body.date = undefined;

  const exercise = new Exercise(req.body);

  User.findOne({ _id: req.body.userId }, (error, user) => {
    if (error) return next(error);

    exercise.save((error, exerciseRecord) => {
      if (error) return next(error);

      //Add new exercise record to the user
      user.exercises.push(exercise);

      //Populate exercises in user
      Exercise.populate(user, { path: "exercises" });

      user.save((error, userRecord) => {
        if (error) return next(error);

        res.json(user);
      });
    });
  });
});

router.get("/log", (req, res, next) => {
  User.findOne({ _id: req.query.userId }, (error, userRecord) => {
    if (error) return next(error);

    let userLog = {
      _id: userRecord._id,
      username: userRecord.username,
      count: 0,
      log: []
    };

    const filter = {
      from: new Date(req.query.from),
      to: new Date(req.query.to),
      limit: req.query.limit !== undefined ? Number(req.query.limit) : 1000
    };

    Exercise.populate(
      userRecord,
      { path: "exercises" },
      (error, userRecord) => {
        userLog.log = userRecord.exercises
          .sort((a, b) => b.date - a.date)
          .filter((exercise, index) => {
            const exerciseDate = new Date(exercise.date).getTime();
            return (
              exerciseDate >
                (filter.from != "Invalid Date" ? filter.from.getTime() : 0) &&
              exerciseDate <
                (filter.to != "Invalid Date"
                  ? filter.to.getTime() + 86400000
                  : Date.now()) &&
              index < filter.limit
            );
          });

        userLog.count = userLog.log.length;
        res.json(userLog);
      }
    );
  });
});

router.get("/remove-all-exercises", (req, res, next) => {
  Exercise.remove((error, user) => {
    if (error) return next(error);

    res.json({ result: "All Exercises Removed" });
  });
});

module.exports = router;
