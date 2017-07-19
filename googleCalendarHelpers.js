var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

var OAuth2 = google.auth.OAuth2;

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

function addToGoogle(slackId) {
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
                        user.google = tokens;
                        user.save();
                    }
                })
            });
        }
        // console.log('pending request', user.pendingRequest);
        var pending = JSON.parse(user.pendingRequest);
        if (pending.action === "remind.add") {
            var task = pending.any;
            var date = pending.date;
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
            var date = pending.date;
            var time = pending.time;
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
            console.log(date);
            // invitees = invitees.reduce(function(a) {
            //   return a + ' and';
            // })
            // invitees.substring(0, invitees.length - 5);
            //name to slackId object
            var conversions = pending.conversions;
            for (var name in conversions) {
              conversions[name] = conversions[name].substring(2, conversions[name].length - 1)
            }
            console.log('conversions', conversions);
            User.find()
            .then(function(users) {
              console.log('users',users);
              //userArray will be sent to google calendar request as attendees
              var userArr = [];

              //array with all of the invitees mongo information to check availability with
              var mongoInformation = [];
              users.map(function(user) {
                var mongoSlackId = user.slackId;
                for (var name in conversions) {
                  if (conversions[name] === mongoSlackId) {
                    console.log(name);
                    userArr.push({displayName: name, email: user.google.email})
                    mongoInformation.push(user);
                  }
                }
              })
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
                    return(event);
                  })
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
