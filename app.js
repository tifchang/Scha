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

var app = express();
var port = process.env.PORT || 3000;

//mongodb
if (!process.env.MONGODB_URI || !process.env.CLIENT_SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);

var bot = require('./bot.js');

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// test route
app.get('/hello', function (req, res) {
  const code = req.query.code;
  res.send('Hello world!');
});

app.post('/message', function (req, res, next) {
  var slackId = JSON.parse(req.body.payload).callback_id;
  if (JSON.parse(req.body.payload).actions[0].value === 'bad') {
    res.send('Okay I canceled your request!');
  } else {
    //call function to add the reminder to google calendar
    console.log(addToGoogle(slackId));
    res.send('Okay request has been submitted!');

  }

});

// GOOGLEAUTH HELPER FUNCTION
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
//ADDING DAY HELPER FUNCTION
function addDay(date) {
    var result = new Date(date);
    result.setDate(result.getDate() + 1);
    return result.toISOString().substring(0, 10);
}
//ACTUAL ADDING TO GOOGLE
function addToGoogle(slackId) {
    //set up auth
    // var auth = new googleAuth();
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
            googleAuthorization.setCredentials({
              access_token: user.google.id_token,
              refresh_token: user.google.refresh_token
            });

            googleAuthorization.refreshAccessToken(function(err, tokens) {
                User.findOne({slackId: slackId}, (err, user) => {
                    if (err) {
                        res.json({failure: err})
                        return;
                    } else {
                      // NEEEWWWW HOW TO SAVE REFRESH TOKENS!!!
                        user.google.expiry_date = tokens.expiry_date;
                        user.google.id_token = tokens.id_token;
                        user.google.refresh_token = tokens.refresh_token;
                        user.google.token_type = tokens.token_type;
                        user.save();
                    }
                })
            });
        }
        console.log('pending request', user.pendingRequest);
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
                },
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
          // CHECK TO SEE IF THE USER HAS ANYTHING FIRST
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

          // CHECK TO SEE IF THE USER HAS ANYTHING FIRST
          // 1. Go get user's calendar events from PRIMARY using start & end time
          calendar.events.list({
            auth: googleAuthorization,
            calendarId: 'primary',
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            timeZone: "America/Los_Angeles",
            alwaysIncludeEmail: true,

          })
          .then((response) => {

          })


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
            var event = {
                'summary': task,
                'start': {
                    'dateTime': start.toISOString()
                },
                'end': {
                    'dateTime': end.toISOString()
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
        }
    })
    .catch(function(err) {
      console.log("ERRROR", err);
    })
}



app.get('/connect/success', function(req, res) {
    res.send('Connect success')
});


app.get('/connect/callback', function(req, res) {
  var code = req.query.code;
  var state = req.query.state;

  //get credentials
  var credentials = JSON.parse(process.env.CLIENT_SECRET);
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0] + '/connect/callback';

  //set up auth
  var auth = new googleAuth();
  var googleAuthorization = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  googleAuthorization.getToken(code, function(err, tokens) {
    if (err) {
      res.send('Error', err);
    } else {
      googleAuthorization.setCredentials(tokens);
      var plus = google.plus('v1');
      plus.people.get({auth: googleAuthorization, userId: 'me'}, function(err, googleUser) {
        User.findById(JSON.parse(decodeURIComponent(state)).auth_id)
        .then(function(mongoUser) {
          mongoUser.google = tokens;
          if (googleUser) {
            mongoUser.google.profile_id = googleUser.Id
            mongoUser.google.profile_name = googleUser.displayName
          }
          return mongoUser.save();
        })
        .then(function(mongoUser) {
          // res.json(mongoUser);
          res.redirect('/connect/success');
        })
      })
    }
  })
});

app.get('/connect', function(req, res) {
  //get slack_id
  var userId = req.query.user;

  //get credentials
  var credentials = JSON.parse(process.env.CLIENT_SECRET);
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0] + '/connect/callback';

  //set up auth
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  //create url
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: encodeURIComponent(JSON.stringify({
      auth_id: userId
    }))
  });

  res.redirect(url);
})

app.listen(port, function () {
    console.log('Listening on port ' + port);
});
