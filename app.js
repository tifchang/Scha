//REQUIRE IN EXPRESS TO CREATE THE SERVER
var express = require('express');

//REQUIRE IN BODYPARSER MIDDLEWARE
var bodyParser = require('body-parser');

//REQUIRE IN MONGOOSE FOR MONGODB CONNECTION
var mongoose = require('mongoose');

//CHECK IF ALL THE NECESSARY ENVIRONMENTAL VARIABLES ARE PRESENT FOR
//MONGODB CONNECTION AND GOOGLE CALENDAR CLIENT CONNECTION
//CLIENT_SECRET HAS ALL THE NECESSARY AUTHORIZATION INFORMATION S.A.
//TOKENS AND SECRETS
if (!process.env.MONGODB_URI || !process.env.CLIENT_SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

//START CONNECTION TO MONGODB
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);

//RUN BOT BY REQUIRING FILE
var bot = require('./bot.js');

//CREATE SERVER WITH EXPRESS
//SET PORT TO BE 3000 IF PORT NOT SPECIFIED IN PROCESS
var app = express();
var port = process.env.PORT || 3000;

//ADD BODY PARSER MIDDLEWARE TO SERVER
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//REQUIRE IN ROUTES FROM ROUTES.JS
var routes = require('./routes');
//HAVE APP LISTENED TO THE REQUIRED ROUTES
app.use('/', routes);

app.listen(port, function () {
    console.log('Listening on port ' + port);
});
