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

function addToGoogle(slackId, res, web, date) {
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
            var task = pending.subject;
            console.log('date', date);
            var time;
            if (!date) {
              date = pending.date;
              time = pending.time;
            } else {
              var hours = new Date(date).getHours() + '';
              var minutes = new Date(date).getMinutes() + '';
              if (minutes.length === 1) {
                minutes = '0' + minutes;
              }
              if (hours.length === 1) {
                hours = '0' + hours;
              }
              time = hours + ":" + minutes + ":00";
              console.log('time', time);
              date = date.substring(0, 10);
            }
            console.log('date2', date);
            var invitees = pending['given-name'];
            var hours = time.substring(0, 2);
            var minutes = time.substring(3, 5);
            var seconds = time.substring(6, 8);
            var milsecs = time.substring(9, 10);
            var year = date.substring(0, 4);
            var parsedMonth = parseInt(date.substring(5, 7));
            var month = parseInt(parsedMonth - 1).toString()
            var day = date.substring(8, 10);

            var start = new Date(year, month, day, hours, minutes, seconds, milsecs)
            var end = new Date(start.getTime() + 30 * 60 * 1000)

            new Meeting({
              time: time,
              invitees: invitees,
              createdAt: new Date(),
              requesterId: user._id,
              subject: task,
              day: date,
              requesterId: user._id
            }).save()

            var conversions = pending.conversions;
            for (var name in conversions) {
              conversions[name] = conversions[name].substring(2, conversions[name].length - 1)
            }
            User.find()
            .then(function(users) {
              // console.log('users',users);
              //userArray will be sent to google calendar request as attendees
              var userArr = [];

              //array with all of the invitees mongo information to check availability with
              var mongoInformation = [];
              users.map(function(userData) {
                var mongoSlackId = userData.slackId;
                for (var name in conversions) {
                  if (conversions[name] === mongoSlackId) {
                    userArr.push({displayName: name, email: userData.google.email})
                    mongoInformation.push(userData);
                  }
                }
              })
              mongoInformation.push(user);

              getAttendeeConflicts(mongoInformation, start, end)
              .then((conflicts) => {
                var noConflicts = areThereConflicts(conflicts);
                //if there is a conflict
                if (!noConflicts) {
                  getConflictsSevenDays(start, mongoInformation)
                  .then(function(freeTimesArray) {
                    res.send('Oh no you have a conflict!');
                    sendInteractiveMessage(web, user, freeTimesArray);
                  })

                } else {
                  var event = {
                    'summary': task,
                    'start': {
                      'dateTime': start.toISOString()
                    },
                    'end': {
                      'dateTime': end.toISOString()
                    },
                    'attendees': userArr
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
                      res.send('Okay request has been submitted successfully!');
                      // return "yay";
                    })
                  });
                }

              });

            })
            .catch(function(err) {
              console.log('Error on line 206', err);
            })

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
