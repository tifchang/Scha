var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

var { findFreeTimes } = require('./availabilityHelper');

var OAuth2 = google.auth.OAuth2;

var fs = require('fs')

var { sendInteractiveMessage } = require('./interactiveMessageHelper');

var { scheduleMeeting } = require('./scheduleMeeting');


function areThereConflicts(conflicts) {
  return conflicts.reduce(function(total, singleUser) {
    return total && singleUser.items.length === 0;
  }, true);
}

function getConflictsSevenDays(startDate, attendees) {
    var arr = [];
    var today = new Date(startDate);
    var promiseArray = [];
    for (var i = 0; i < 10; i++) {
        var curDay = new Date(today);
        curDay.setDate(today.getDate() + i);
        // console.log('curDay', curDay);
        // console.log(curDay.getDay());
        // if (curDay.getDay() === 0 || curDay.getDay() === 6) {
        //     continue;
        // }
        promiseArray.push(getDailyPromise(attendees, curDay));
    }
    return Promise.all(promiseArray)
    .then((dayConflicts) => {
      var freeTimes = findFreeTimes(dayConflicts);
      return freeTimes;
    });
}

// WHAT YOU GET IN RETURN IS AN ARRAY WITH OBJECTS WITH START/END TIME CONFLICTS
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
        // console.log("XXX", x);
      });
    });
  })
  return Promise.all(promisesArr);
}


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

function addDay(date) {
    var result = new Date(date);
    result.setDate(result.getDate() + 1);
    return result.toISOString().substring(0, 10);
}

var {scheduleMeetingMFour} = require('./milestoneFour.js')


function addToGoogle(slackId, res, web, date, rtm) {
    //set up auth
    var auth = new googleAuth();
    var googleAuthorization = getGoogleAuth();
    var calendar = google.calendar('v3');

    User.findOne({slackId: slackId})
    .then((user) => {
        //if token expired, get a new token and save it
        googleAuthorization.setCredentials({
          access_token: user.google.id_token,
          refresh_token: user.google.refresh_token
        });
        if (parseInt(user.google.expiry_date) < Date.now()) {
            //use refresh token --> get request
            googleAuthorization.refreshAccessToken(function(err, tokens) {
                User.findOne({slackId: slackId}, (err, user) => {
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
                })
            });
        }
        // console.log('pending request', user.pendingRequest);
        var pending = JSON.parse(user.pendingRequest);
        if (pending.action === "remind.add") {
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
                    return err;
                }
                console.log('Event created: %s', event.htmlLink);
                user.pendingRequest = '';
                user.save(function(user) {
                  return(event);
                })
            });
        } else if (pending.action === "meeting.add") {
          scheduleMeetingMFour(user.slackId, pending, user, res, web, date, calendar, auth, googleAuthorization, rtm);
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
