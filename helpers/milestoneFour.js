// REQUIRE IN THE MODELS
var Models = require('../models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;
// REQUIRE IN SLACK
var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
// REQUIRE HELPER FUNCTIONS
var { scheduleMeeting } = require('./scheduleMeeting');


// THIS FUNCTION TAKES THE ORGANIZER'S SLACKID
// THIS FUNCTION CHECKS EVERY ATTENDEE TO SEE IF THEY HAVE A GOOGLE ACCOUNT
// AND IF THEY DON'T HAVE AN ACCOUNT, THEY WILL BE DM'ED TO MAKE AN ACCOUNT
function checkCalAccess(slackId, web, rtm) {
  User.findOne({slackId: slackId})
  .then((organizer) => {
    let slackIdArr = [];
    for (var key in JSON.parse(organizer.pendingRequest).conversions) {
      slackIdArr.push(JSON.parse(organizer.pendingRequest).conversions[key].substring(2, 11))
    }
    var fullUserArr = slackIdArr.map((id) => {
      let slackDmId;
      if (rtm.dataStore.getDMByUserId(id)) {
        slackDmId = rtm.dataStore.getDMByUserId(id).id;
      } else {
        web.im.open(id, function(err, resp) {
          if (err) {
            console.log("ERROR IN OPENING CHANNEL", err);
          }
          slackDmId = resp.channel.id;
        })
      }
      return {
        slackId: id,
        slackDmId: slackDmId
      }
    })
    fullUserArr.forEach((userObj) => {
      User.findOne({slackId: userObj.slackId})
      .then((user) => {
        if (!user) {
          new User({
            slackId: userObj.slackId,
            slackDmId: userObj.slackDmId
          }).save()
          .then(user => {
            web.chat.postMessage(user.slackDmId, `Hey! Someone is inviting you to a meeting.
              Please visit http://d31adc8e.ngrok.io/connect?user=${user._id}
              to setup Google Calendar`
            );
            return;
          })
        } else if (!user.google) {
          web.chat.postMessage(user.slackDmId, `Hey! Someone is inviting you to a meeting.
            Please visit http://d31adc8e.ngrok.io/connect?user=${user._id}
            to setup Google Calendar`
          );
          return;
        }
      })
    })
  })
}
// THIS IS THE SLACKID OF THE ORGANIZER
function doAllHaveGoogle(slackId) {
  return User.findOne({slackId: slackId})
  .then((organizer) => {
    let slackIdArr = [];
    for (var key in JSON.parse(organizer.pendingRequest).conversions) {
      slackIdArr.push(JSON.parse(organizer.pendingRequest).conversions[key].substring(2, 11))
    }
    return Promise.all(slackIdArr.map((id) => {
      return User.findOne({slackId: id})
      .then((user) => {
        if (!user || !user.google) {
          return false;
        } else {
          return true;
        }
      })
    }))
  })
};
// THIS FUNCTION CHECKS TO SEE IF A PENDING EVENT IS IN FOUR HOURS.
// IT TAKES THE ORGANIZER'S SLACK ID AS A PARAMETER
function inFourHours(slackId) {
  return User.findOne({slackId: slackId})
  .then((user) => {
    var date = JSON.parse(user.pendingRequest).date;
    var time = JSON.parse(user.pendingRequest).time;
    var hours = time.substring(0, 2);
    var minutes = time.substring(3, 5);
    var seconds = time.substring(6, 8);
    var milsecs = time.substring(9, 10);
    var year = date.substring(0, 4);
    var parsedMonth = parseInt(date.substring(5, 7));
    var month = parseInt(parsedMonth - 1).toString()
    var day = date.substring(8, 10);

    // AFTER STRING PARSING, TURNS THE REQUESTED TIME INTO A DATE
    var meeting = new Date(year, month, day, hours, minutes, seconds, milsecs)
    // CHECKS TO SEE IF THE MEETING IS WITHIN FOUR HOURS OF NOW
    if (meeting.getTime() - new Date().getTime() < 3600000) {
      return true;
    } else {
      return false;
    }
  })
}

// THIS FUNCTION SCHEDULES MEETINGS. IT TAKES IN A LOT OF PARAMETERS
// PARAMETERS: ORGANIZER'S SLACKID, PENDING REQUEST OBJECT, USER (ORGANIZER'S MONGO DOCUMENT),
// WEB, DATE OF EVENT, CALENDAR (GOOGLE'S CALENDAR OBJECT), GOOGLEAUTHORIZATION (OAUTHCLIENT), RTM
// AND A LOT OF HELPER FUNCTIONS
function scheduleMeetingMFour(slackId, pending, user, res, web, date, calendar, auth, googleAuthorization, rtm, getAttendeeConflicts, getConflictsSevenDays, areThereConflicts) {
  // 1. CHECK IF ALL ATTENDEES HAVE GOOGLE ACCESS
  doAllHaveGoogle(slackId)
  // AFTER RETURNING ARRAY OF WHETHER OR NOT ATTENDEES HAVE ACCESS, IT CHECKS
  // TO SEE IF ANY ARE FALSE
  .then((arr) => {
    var bool = arr.includes(false);
    if (!bool) {
      // IF EVERYONE HAS AUTHORIZED GOOGLE, GO AHEAD AND SCHEDULE MEETING
      scheduleMeeting(pending, user, res, web, date, calendar, auth, googleAuthorization, getAttendeeConflicts, getConflictsSevenDays, areThereConflicts);
    } else {
      // IF NOT EVERYONE HAS AUTHORIZED GOOGLE...
      res.send('on no one of your invitees has not given permission!');
      // CHECK TO SEE IF THE EVENT IS IN FOUR HOURS
      inFourHours(slackId)
      .then((isInFourHours) => {
        var slackDmId = user.slackDmId;
        if (isInFourHours) {
          // IF IT IS, DM THE ORGANIZER AND SAY IT'S TOO SOON
          web.chat.postMessage(slackDmId, `DAMN SON. You can't schedule it so soon! Meeting must be at least four hours from now.`)
          user.pendingRequest = '';
          user.save();
        } else {
          // IF NOT, LET THE ORGANIZER KNOW THAT SACHA HAS NOTIFIED ALL THAT
          // NEED TO GIVE ACCESS TO GRANT ACCESS.
          web.chat.postMessage(slackDmId, `Yo posse has been notified for calendar access. We will try to create
            the event if your posse accepts within two hours.`
          )
          checkCalAccess(slackId, web, rtm);
        }
      })
    }
  })
}

module.exports = {
  scheduleMeetingMFour: scheduleMeetingMFour
}
