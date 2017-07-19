var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var OAuth2 = google.auth.OAuth2;

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
        //put function here
    } else {
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

    User.findOne({slackId: slackId})
    .then((user) => {
        //if token expired, get a new token and save it
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
                    } else {
                        console.log('LE TOKENS', tokens);
                        console.log('LE USER.GOOGLE', user.google);
                        user.google = tokens;
                        user.save();
                    }
                })
            });
        }
        var pending = JSON.parse(user.pending);
        // Checks action type
        if (pending.action === "remind.add") {
            var task = pending.any;
            var date = pending.date;
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
                auth: auth,
                calendarId: 'primary',
                resource: event,
            }, function(err, event) {
                if (err) {
                    console.log('There was an error contacting the Calendar service: ' + err);
                    return err;
                }
                console.log('Event created: %s', event.htmlLink);
                return(event);
            });
        }
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
                console.log("state", JSON.parse(decodeURIComponent(req.query.state)));
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
            'https://www.googleapis.com/auth/calendar'
        ],
        state: encodeURIComponent(JSON.stringify({
            auth_id: userId
        }))
    });
    console.log(url);

    res.redirect(url);

});

app.listen(port, function () {
    console.log('Listening on port ' + port);
});
