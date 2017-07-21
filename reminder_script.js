var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
var mongoose = require('mongoose');

//setup the bot
var bot_token = process.env.BOT_TOKEN;
var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token);
rtm.start();

//import tasks
var Models = require('./models/models');
var Task = Models.Task

//setup mongodb connection
if (!process.env.MONGODB_URI || !process.env.CLIENT_SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);

/*
 *  remind today sends reminders to any users that have reminders with today's date
 *  it also removes reminders from the database once it notifies the users of them.
 */
function remindToday() {
  //find all tasks (reminders) and populate the requester field
  Task.find({})
  .populate('requesterId')
  .exec(function(err, tasks) {
    if (err) {
      console.log(err);
    }
    //create a new date and format it to be an iso string for comparison
    var today = new Date();
    todayString = today.toISOString().substring(0, 10);

    //for each task, check if the task occurs today, if it does, remind the user
    tasks.forEach(function(task) {
      if (task.day.toISOString().substring(0, 10) === todayString) {
        rtm.sendMessage(
          `Hi ${task.requesterId.google.profile_name}!
You have an event today: ${task.subject}
          `, task.requesterId.slackDmId
        )
        //delete tasks that occur today in mongo
        task.remove();
      }
    })
  })
}

/*
 *  remind users of tasks that will happen tomorrow
 */
function remindOneDayBefore() {
  //find all tasks and populate requesterId so that you can work with user data
  Task.find({})
  .populate('requesterId')
  .exec(function(err, tasks) {
    if (err) {
      console.log('error', err);
    }

    //form a iso string for tomorrow's date
    var tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    tomorrowString = tomorrow.toISOString().substring(0, 10);

    //for each task,  check if it will happen tomorrow, if it does send a reminder
    tasks.forEach(function(task) {
        console.log(task)
      //task.day can just be new Date();
      if (task.day.toISOString().substring(0,10) === tomorrowString) {
        rtm.sendMessage(`Hi ${task.requesterId.google.profile_name}! 
You have an event tomorrow: ${task.subject}`, task.requesterId.slackDmId);
      }
    });

    // End the process. This is an automated task running in heroku every day at midnight. 
    // Therefore, the process should be stopped so that it does not hang.
    process.exit();
  })
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

// When Slack becomes connected, the reminder functions are executed.
// process.exit() is not included here because our functions are asynchronous and we don't want the process
// to end before our functions finish completing their actions.
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, (rtmStartData) => {
  remindToday();
  remindOneDayBefore();
});
