var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
var mongoose = require('mongoose');
var axios = require('axios');

//setup mongoose connection
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('mongoose error', console.error);

//setup bot
var bot_token = process.env.BOT_TOKEN;
var web = new WebClient(bot_token);

//require in models
var Models = require('./models/models');
var User = Models.User


//sends interactive message to the requester
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
 * returns true if yes, otherwise false
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
// returns true if yes, otherwise false
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
 * checks for pending meetings within user objects
 */
function checkPendingMeetings() {
  //find all users
  User.find({})
  .then(users => {
    var resultArr = users.map(user => {
      // check for pending request on user model
      if (user.pendingRequest) {
        // if request has gone for over two hours, prompt the requester for additional actions
        if (checkOverTime(user)) {
          afterSendInvites(user.slackDmId);
          return;
        } else {
          // retrieve slack ids of the members invited to the meeting
          let attendees = [];
          for (var key in JSON.parse(user.pendingRequest).conversions) {
            attendees.push(JSON.parse(user.pendingRequest).conversions[key].substring(2, 11))
          }

          // map each slack id to a promise which responds with a boolean value
          var promises = attendees.map(attendee => (
            checkHasAccess(attendee)
          ));

          /* 
           * return a promise that converts the promises array into an array of objects
           * this object contains the user object and a boolean that indicates 
           * whether or not all invitees have google calendar access
           */
          return Promise.all(promises).then(arr=>{
            return {
              user: user,
              result: arr.includes(false)
            }
          })
        }
      }
    })

    //filter out requests that have gone over the time limit
    var p = resultArr.filter(i => i);

    //turn the promises into an array
    return Promise.all(p);
  })
  //receive the objects
  .then(function(objs) {
    var axiosPromises = [];
    for (var i = 0; i < objs.length; i++) {
      if (!objs[i].result) {
        // push axios requests that will schedule meetings to promise array
        axiosPromises.push(axios.post('http://d31adc8e.ngrok.io/message', {
          payload: JSON.stringify({
            callback_id: objs[i].user.slackId,
            actions: [{value: 'good'}]
          })
        }))
      }
    }
    // executes all axios promises
    return Promise.all(axiosPromises);
  })
  // when promises are finished executing, exit the process
  .then(resp => {
    console.log('sent axios request', resp);
    process.exit();
  })
  // if an error is caught, still exit the process because it should not hang
  .catch(err => {
    console.log('error sending axios request', err);
    process.exit();
  });
}

// check pending meetings
checkPendingMeetings();