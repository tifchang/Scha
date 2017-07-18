


// write express server in bot.js  and require it in here
// sends link to user --> when you click on it it will send a request to express
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var port = process.env.PORT || 3000;

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// test route
app.get('/hello', function (req, res) {
  const code = req.query.code;
  res.send('Hello world!');
});

app.post('/hello', function (req, res, next) {
  console.log('response', JSON.parse(req.body.payload).actions);
  // var userName = req.body.user_name;
  // var botPayload = {
  //   text : 'Hello ' + userName.toUpperCase() + ', welcome to TestMyBotHorizons Slack channel! I\'ll be your guide bitches!'
  // };
  // // Loop otherwise..
  // if (userName !== 'slackbot') {
  //   return res.status(200).json(botPayload);
  // } else {
  if (JSON.parse(req.body.payload).actions[0].value === 'bad') {
    res.send('Okay we will not recommend');
  } else {
    res.send('I KNOW ITS THE SHIT');
  }

  // }
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
