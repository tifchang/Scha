var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var bot = require('./bot.js');
var Models = require('./models/models');
var User = Models.User;


var app = express();
var port = process.env.PORT || 3000;

//mongodb
if (!process.env.MONGODB_URI || !process.env.CLIENT_SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', console.error);

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// test route
app.get('/hello', function (req, res) {
  const code = req.query.code;
  res.send('Hello world!');
});

app.post('/hello', function (req, res, next) {
  console.log('response', JSON.parse(req.body.payload));
  // var userName = req.body.user_name;
  // var botPayload = {
  //   text : 'Hello ' + userName.toUpperCase() + ', welcome to TestMyBotHorizons Slack channel! I\'ll be your guide bitches!'
  // };
  // // Loop otherwise..
  // if (userName !== 'slackbot') {
  //   return res.status(200).json(botPayload);
  // } else {
  if (JSON.parse(req.body.payload).actions[0].value === 'bad') {
    res.send('Okay I canceled your request!');
  } else {
    res.send('Okay request has been submitted!');
  }

});

app.get('/connect/success', function(req, res) {

});

app.get('/connect/callback', function(req, res) {

});

app.post('/connect', function(req, res) {
  //get slack_id
  var slackId = req.body.user;

  //get credentials
  var credentials = JSON.parse(process.env.CLIENT_SECRET);
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0] + '/connect/callback';

  //set up auth
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  //add new user to MONGO_DB
  var newUser = new User ({
    slack_id: slackId,
    token: null
  });

  newUser.save(function(err, user) {
    if (err) {
      res.json({failure: err});
    } else {
      var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/calendar'
        ],
        state: encodeURIComponent(JSON.stringify({
          auth_id: user._id;
        }))
      });

      res.redirect(url);
    }
  })
});

// app.post('/login', function (req, res, next) {
//   var userName = req.body.user_name;
//   var botPayload = {
//     text : 'Hello ' + userName.toUpperCase() + ', welcome to TestMyBotHorizons Slack channel! I\'ll be your guide bitches!'
//   };
//   // Loop otherwise..
//   if (userName !== 'slackbot') {
//     return res.status(200).json(botPayload);
//   } else {
//     return res.status(200).end();
//   }
// });

app.listen(port, function () {
  console.log('Listening on port ' + port);
});
