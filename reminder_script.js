var bot_token = 'xoxb-213951919538-KRIoEVWljTojdrAfOESAnA3a';

var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

var Models = require('./models/models');
var Task = Models.Task

function remindOneDayBefore() {
  Task.find({})
  .populate('requesterId')
  .exec(function(tasks) {
    var tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    tomorrowString = tomorrow.toDateString();

    tasks.forEach(function(task) {
      //task.day can just be new Date();
      if (task.day.toDateString() === tomorrowString) {
        rtm.sendMessage(
          `Hi ${task.requesterId.slackUsername}!
           You have an event tomorrow: ${task.subject}
          `, task.requesterId.slackDmId
        )
      }
    });
  })
}

function remindToday() {
  Task.find({})
  .populate('requesterId')
  .exec(function(tasks) {
    var today = new Date();
    todayString = today.toDateString();

    tasks.forEach(function(task) {
      if (task.day.toDateString() === todayString) {
        rtm.sendMessage(
          `Hi ${task.requesterId.slackUsername}!
           You have an event today: ${task.subject}
          `, task.requesterId.slackDmId
        )

        //delete from mongo
        Task.remove(task)
      }
    })
  })
}

remindOneDayBefore();
remindToday();