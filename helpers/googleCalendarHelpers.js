//REQUIRE IN EXPRESS SERVER AND MIDDLEWARE
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
//REQUIRE IN GOOGLE AUTH
var google = require('googleapis');
var googleAuth = require('google-auth-library');
//REQUIRE IN MONGODB MODELS
var Models = require('../models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;
//REQUIRE IN FILE SYSTEM
var fs = require('fs')
//REQUIRE IN HELPER FUNCTIONS
var { sendInteractiveMessage } = require('./interactiveMessageHelper');
var { scheduleMeetingMFour } = require('./milestoneFour.js')
var { findFreeTimes } = require('./availabilityHelper');
//CREATE OAUTH2CLIENT
var OAuth2 = google.auth.OAuth2;

//THIS FUNCTION TAKES IN AN ARRAY WITH EVERYONES CONFLICTS AND RETURNS A BOOLEAN
function areThereConflicts(conflicts) {
  return conflicts.reduce(function(total, singleUser) {
    return total && singleUser.items.length === 0;
  }, true);
}

//THIS FUNCTION TAKES IN AN ARRAY OF ATTENDEES AND THE START TIME OF PENDING EVENT
//AND RETURNS AN ARRAY OF FREE TIMES
function getFreeTimes(startDate, attendees) {
  var arr = [];
  var today = new Date(startDate);
  var promiseArray = [];
  for (var i = 0; i < 10; i++) {
    var curDay = new Date(today);
    curDay.setDate(today.getDate() + i);
    promiseArray.push(getDailyPromise(attendees, curDay));
  }
  return Promise.all(promiseArray)
  .then((dayConflicts) => {
    var freeTimes = findFreeTimes(dayConflicts);
    return freeTimes;
  });
}

// WHAT YOU GET IN RETURN IS AN ARRAY WITH OBJECTS WITH START/END TIME CONFLICTS
// FOR A SPECIFIED DAY --> RETURNS A PROMISE LOL
function getDailyPromise(attendees, curDay) {
  var calendar = google.calendar('v3');
  var dayPromise = attendees.map(user => {
    var busy = {}; //event object
    var gAuthUser = getGoogleAuth();
    gAuthUser.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    });
    var start = new Date(new Date(new Date(curDay).setMinutes(0)).setHours(9)).toISOString();
    var end = new Date(new Date(new Date(curDay).setMinutes(0)).setHours(17)).toISOString();

    return new Promise(function(res, rej) {
      calendar.events.list({
        auth: gAuthUser,
        calendarId: 'primary',
        timeMin: start,
        timeMax: end,
        // timeZone: "America/Los_Angeles",
        alwaysIncludeEmail: true,
      }, function(err, result) {
        if (err) {
          rej(err);
          return;
        } else {
          var events = result.items; //arr
          // console.log('MAH EVENTS BITCHES', events);
          var e = events.map(event => {
            return {
              startTime: event.start.dateTime,
              endTime: event.end.dateTime
            }
          });
          res(e);
        }
      })
    })
  })
  return Promise.all(dayPromise)
}

//SEARCHES THE CALENDAR OF ALL THE ATTENDEES OF A MEETING AND RETURNS AN ARRAY
//OF ALL THE CONFLICTS
function getAttendeeConflicts(attendees, start, end) {
  var calendar = google.calendar('v3');

  var promisesArr = attendees.map((user) => {
    var gAuthUser = getGoogleAuth();
    gAuthUser.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    })
    return new Promise(function(resolve, reject) {
      calendar.events.list({
        auth: gAuthUser,
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        timeZone: "America/Los_Angeles",
        alwaysIncludeEmail: true,
      }, function(err, result) {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  })
  return Promise.all(promisesArr);
}

//CREATES A NEW INSTANCE OF THE OAUTH2CLIENT
function getGoogleAuth() {
  var credentials = JSON.parse(process.env.CLIENT_SECRET);
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0] + '/connect/callback';

  return new OAuth2(
    clientId,
    clientSecret,
    redirectUrl
  );
}

//TAKES A DATE AND ADDS A DAY TO THE DATE
function addDay(date) {
  var result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result.toISOString().substring(0, 10);
}


//CALLED WHEN AN EVENT SHOULD BE ADDED
function addToGoogle(slackId, res, web, rtm, date) {
  //SET UP GOOGLE AUTH
  var auth = new googleAuth();
  var googleAuthorization = getGoogleAuth();
  var calendar = google.calendar('v3');

  //SEARCH FOR THE ORGANIZER IN MONGO
  User.findOne({slackId: slackId})
  .then((user) => {
    //IF THE USER'S GOOGLE TOKEN IS EXPIRED REFRESH THE TOKEN AND STORE
    //IT BACK IN THE USER MODEL IN MONGO
    googleAuthorization.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    });
    if (parseInt(user.google.expiry_date) < Date.now()) {
      //use refresh token --> get request
      googleAuthorization.refreshAccessToken(function(err, tokens) {
        if (err) {
          res.json({failure: err})
          return;
        } else {
          user.google.id_token = tokens.id_token;
          user.google.refresh_token = tokens.refresh_token;
          user.google.expiry_date = tokens.expiry_date;
          user.google.token_type = tokens.token_type;
          user.google.access_token = tokens.access_token;
          user.save();
        }
      });
    }
    //GRAB PENDINGREQUEST OF THE USER
    var pending = JSON.parse(user.pendingRequest);

    //CHECK TO SEE IF THE TYPE OF THE REQUEST IS A REMINDER
    if (pending.action === "remind.add") {
      //GRAB DATA ABOUT REMINDER FROM PENDING REQUEST
      var task = pending.any;
      date = pending.date;
      new Task({
        subject: task,
        day: new Date(date),
        requesterId: user._id
      }).save()
      var event = {
        'summary': task,
        'start': {
          'date': date,
        },
        'end': {
          'date': addDay(date),  //need to add 1
        }
      };
      calendar.events.insert({
        auth: googleAuthorization,
        calendarId: 'primary',
        resource: event,
      }, function(err, event) {
        if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          res.send('Oh no there was an error with your connection!');
          return err;
        }
        console.log('Event created: %s', event.htmlLink);
        user.pendingRequest = '';
        user.save()
        .then(function(user) {
          return(event);
        })
        res.send('Okay request has been submitted successfully!');
      });
    } else if (pending.action === "meeting.add") {
      scheduleMeetingMFour(user.slackId, pending, user, res, web, date, calendar, auth, googleAuthorization, rtm, getAttendeeConflicts, getFreeTimes, areThereConflicts);
    }
  })
  .catch(function(err) {
    console.log("ERRROR", err);
  })
}

module.exports = {
  getGoogleAuth: getGoogleAuth,
  addDay: addDay,
  addToGoogle: addToGoogle
}
