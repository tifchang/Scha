var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var OAuth2 = google.auth.OAuth2;

var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

var OAuth2 = google.auth.OAuth2;


var app = express();
var port = process.env.PORT || 3000;

//require helper functions
var { getGoogleAuth, addDay, addToGoogle } = require('./googleCalendarHelpers');

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
    addToGoogle(slackId);
    res.send('Okay request has been submitted!');

  }

});



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
            mongoUser.google.email = googleUser.emails[0].value;
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
