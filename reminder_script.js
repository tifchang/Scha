var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
var mongoose = require('mongoose');

//var bot_token = 'xoxb-214942281522-RCYUWaxsruZO4AlCtjBh22lf';
var bot_token = 'xoxb-213951919538-lLiMYYmzZj2wczUv42EpNDrM';
var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

var Models = require('./models/models');
var Task = Models.Task

rtm.start();

//mongodb
if (!process.env.MONGODB_URI || !process.env.CLIENT_SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);


function remindToday() {
  Task.find({})
  .populate('requesterId')
  .exec(function(err, tasks) {
    if (err) {
      console.log(err);
    }
    var today = new Date();
    todayString = today.toISOString().substring(0, 10);

    tasks.forEach(function(task) {
      if (task.day.toISOString().substring(0, 10) === todayString) {
        rtm.sendMessage(
          `Hi ${task.requesterId.google.profile_name}!
           You have an event today: ${task.subject}
          `, task.requesterId.slackDmId
        )
        //delete from mongo
        task.remove();
      }
    })
  })
}

function remindOneDayBefore() {
  Task.find({})
  .populate('requesterId')
  .exec(function(err, tasks) {
    if (err) {
      console.log('error', err);
    }
    var tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    tomorrowString = tomorrow.toISOString().substring(0, 10);

    tasks.forEach(function(task) {
        console.log(task)
      //task.day can just be new Date();
      if (task.day.toISOString().substring(0,10) === tomorrowString) {
        rtm.sendMessage(`Hi ${task.requesterId.google.profile_name}!
           You have an event tomorrow: ${task.subject}`, task.requesterId.slackDmId);
      }
    });
    process.exit();
  })
}


rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, (rtmStartData) => {
  remindToday();
  remindOneDayBefore();
});
