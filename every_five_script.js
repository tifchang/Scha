var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
var mongoose = require('mongoose');
var axios = require('axios');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);

//var bot_token = 'xoxb-214942281522-RCYUWaxsruZO4AlCtjBh22lf';
var bot_token = process.env.BOT_TOKEN;
// var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

var Models = require('./models/models');
var User = Models.User


//sends interactive message
function afterSendInvites(channel) {
  var msg = "Sounds good! What if I can't obtain access from the invitees within 2 hours?"
  web.chat.postMessage(channel, msg, {
    "attachments": [
    {
      "fallback": "fallback",
      "title": "Choose what to do if I can't get access from invitees",
      "callback_id": channel,
      "color": "#3AA3E3",
      "attachment_type": "default",
      "actions": [
      {
        "name": "Schedule it anyway",
        "text": "Schedule it anyway",
        "type": "button",
        "value": "Schedule it anyway"
      },
      {
        "name": "Cancel the meeting",
        "text": "Cancel the meeting",
        "type": "button",
        "value": "Cancel the meeting"
      }
      ]
    }
    ]
  })
};

/*
 * check if request has been pending for more than 2 hours
 */
function checkOverTime(user) {
  var createdAt = new Date(JSON.parse(user.pendingRequest).createdAt);
  var now = Date.now();
  var cutoff = 2 * 60 * 60 * 1000;
  var diff = Math.abs(now - createdAt); //this ms
  if (diff > cutoff)
    return true
  return false;
};


// check if user has access to google calendar
function checkHasAccess(slackId) {
  return new Promise(function(resolve, reject) {
    User.findOne({slackId: slackId})
    .then(user => {
      if (!user || !user.google) {
        resolve(false);
      } else {
        resolve(true);
      }
    })
    .catch(function(err) {
      console.log('Error: ', err);
      reject(err);  
    })
  });
};


/*
 * checks for pending meetings
 */
function checkPendingMeetings() {
  User.find({})
  .then(users => {
    var resultArr = users.map(user => {
      if (user.pendingRequest) {
        if (checkOverTime(user)) {
          //audrey's code
          afterSendInvites(user.slackDmId);
          //what is this going to return?
          return;
        } else {
          //TODO: get atendees
          let atendees = [];
          for (var key in JSON.parse(user.pendingRequest).conversions) {
            atendees.push(JSON.parse(user.pendingRequest).conversions[key].substring(2, 11))
          }
          var promises = atendees.map(atendee => (
            checkHasAccess(atendee)
          ));
          return Promise.all(promises).then(arr=>{
            return {
              user: user,
              result: arr.includes(false)
            }
          })
        }
      }
    })

    console.log('resultArr', resultArr);
    console.log('before for loop');
    var p = resultArr.filter(i => i);
    console.log('P', p)
    return Promise.all(p);
  })
  .then(function(objs) {
    for (var i = 0; i < objs.length; i++) {
      if (!objs[i].result) {
        console.log('schedule meeting', objs[i].user);
        //actually schedule the meeting
        axios.post('http://d31adc8e.ngrok.io/message', {
          params: {
            payload: {
              callback_id: objs[i].user.slackId,
              actions: [{value: 'good'}]
            }
          }
        })
        .then(resp => {
          //console.log('sent axios request', resp);
          console.log('hi');
          process.exit();
        })
        .catch(err => {
          //console.log('error sending axios request', err);
          console.log('err');
          process.exit();
        })
      }
    }
  })


// // TO GO IN THE ROUTE
// function route() {
//   else if (value === "Nevermind") {
//     //if nevermind cancel the whole event
//     //do not call add togoogle
//   }
//   else if (value === "Cancel the meeting") {
//     //if in 2 hours invitees dont have access, cancel the event
//     //OR: donmt schedule the event until 2 hours later
//         //if invitees still dont have access, cancel request
//         //add to google
//       }
//       else if (value === "Schedule it anyway") {
//     //add to google
//   }
// }
checkPendingMeetings();