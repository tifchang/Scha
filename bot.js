var axios = require('axios');

var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');

var bot_token = 'xoxb-214569167297-MS1iiNvvMRhbbGCTjg1zqXzd';

var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

function remindOneDayBefore() {
  Task.find({})
  .populate('requesterId')
  .exec()
  .then(function(tasks) {
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
  Task.find()
  .populate('requesterId')
  .exec()
  .then(function(tasks) {
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

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData.self.name);
})

// let messageInProgess = false;

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {
  //ensure the bot will ignore the message if it is not sent via DM
  var dm = rtm.dataStore.getDMByUserId(msg.user);
  if (!dm || dm.id !== msg.channel || msg.type !== 'message') {
    return;
  }

  //check that the user has gone through authentication
  User.findOne({slackId: msg.user})
  .then(function(user) {
    user.pendingRequest = '';
    user.save()
    if (!user) {
      return new User({
        slackId: msg.user,
        slackDmId: msg.channel
      }).save();
    }
    return user;
  })
  .then(function(user){
    if (!user.google) {
      rtm.sendMessage(`Hello!
        This is scheduler bot. In order to schedule things for you, I need
        access to your google calendar.

        Please visit http://a2c5ad38.ngrok.io/connect?user=${user._id} to setup Google Calendar`, msg.channel);
        return;
    }

    if (user.pendingRequest) {
      rtm.sendMessage('Please complete previous request!', user.slackDmId);
      return;
    }
    msg.text = msg.text.replace(/(<@)(\w+)(>)/g, function(a, b, userId) {
      console.log('a', a);
      console.log('b', b);
      const name = rtm.dataStore.getUserById(userId).profile.first_name + ' ' + rtm.dataStore.getUserById(userId).profile.last_name
      return name + ', ';
    })
    axios.get('https://api.api.ai/api/query', {
      params: {
        v: 20150910,
        lang: 'en',
        timezone: '2017-07-17T14:01:03-0700',
        query: msg.text,
        sessionId: user.slackId
      },
      headers: {
        Authorization: 'Bearer 30cb48540bc14e0ab93dd24392ec801c'
      }
    })
    .then((res) => {
      // check that action is complete
      if (res.data.result.actionIncomplete) {
        rtm.sendMessage(res.data.result.fulfillment.speech, user.slackDmId)
        return;
      } else if (res.data.result.action === "remind.add") {
        user.pendingRequest = JSON.stringify(Object.assign({}, (res.data.result).parameters, {action: 'remind.add', userId: user._id}));
        console.log("RESULT", user.pendingRequest);
        user.save()
        .then(function(user) {
          web.chat.postMessage(msg.channel, '', {
            "attachments": [
              {
                "fallback": "fallback",
                "title": res.data.result.fulfillment.speech,
                "callback_id": msg.user,
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                  {
                    "name": "Yes",
                    "text": "Yes",
                    "type": "button",
                    "value": "good"
                  },
                  {
                    "name": "No",
                    "text": "No",
                    "type": "button",
                    "value": "bad"
                  }
                ]
              }
            ]
          })
          .catch(function(err) {
            console.log(err);
          })
        })
      } else if (res.data.result.action === "meeting.add") {
        user.pendingRequest = JSON.stringify(Object.assign({}, (res.data.result).parameters, {action: 'meeting.add'}));
        console.log("RESULT", user.pendingRequest);
        user.save()
        .then(function(user) {

          web.chat.postMessage(msg.channel, '', {
            "attachments": [
              {
                "fallback": "fallback",
                "title": res.data.result.fulfillment.speech,
                "callback_id": msg.user,
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                  {
                    "name": "Yes",
                    "text": "Yes",
                    "type": "button",
                    "value": "good"
                  },
                  {
                    "name": "No",
                    "text": "No",
                    "type": "button",
                    "value": "bad"
                  }
                ]
              }
            ]
          });
        })
      } else {
        rtm.sendMessage(res.data.result.fulfillment.speech, user.slackDmId)
      }
    })
    .catch((err) => {
      console.log(err);
    })

  })
})

rtm.start();
