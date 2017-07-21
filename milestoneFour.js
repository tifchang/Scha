var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');

//param: param: must take in organizer's slackId
// this function makes sure every person on the attendees list has an account
function checkCalAccess(slackId, web, rtm) {
  User.findOne({slackId: slackId})
  .then((organizer) => {
    let slackIdArr = [];
    for (var key in JSON.parse(organizer.pendingRequest).conversions) {
      console.log('conversions', JSON.parse(organizer.pendingRequest).conversions);
      slackIdArr.push(JSON.parse(organizer.pendingRequest).conversions[key].substring(2, 11))
    }
    var fullUserArr = slackIdArr.map((id) => {
      let slackDmId;
      if (rtm.dataStore.getDMByUserId(id)) {
        slackDmId = rtm.dataStore.getDMByUserId(id).id;
        console.log('1', slackDmId);
      } else {
        web.im.open(id, function(err, resp) {
          if (err) {
            console.log("ERROR IN OPENING CHANNEL", err);
          }
          console.log('resp', resp);
          slackDmId = resp.channel.id;
        })
      }
      return {
        slackId: id,
        slackDmId: slackDmId
      }
    })
    console.log('fullUserArr', fullUserArr);
    fullUserArr.forEach((userObj) => {
      User.findOne({slackId: userObj.slackId})
      .then((user) => {
        console.log('user', user);
        if (!user) {
          new User({
            slackId: userObj.slackId,
            slackDmId: userObj.slackDmId
          }).save()
          .then(user => {
            console.log('user2', user);
            web.chat.postMessage(user.slackDmId, `Hey! Someone is inviting you to a meeting.
              Please visit http://d31adc8e.ngrok.io/connect?user=${user._id}
              to setup Google Calendar`);
              return;
          })
        } else if (!user.google) {
          console.log(3, user);
          web.chat.postMessage(user.slackDmId, `Hey! Someone is inviting you to a meeting.
            Please visit http://d31adc8e.ngrok.io/connect?user=${user._id}
            to setup Google Calendar`);
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
      console.log('ORGANIZER', organizer);
      let slackIdArr = [];
      for (var key in JSON.parse(organizer.pendingRequest).conversions) {
        slackIdArr.push(JSON.parse(organizer.pendingRequest).conversions[key].substring(2, 11))
      }
      return Promise.all(slackIdArr.map((id) => {
        return User.findOne({slackId: id})
        .then((user) => {
          console.log('USERRR', user);
          if (!user || !user.google) {
            return false;
          } else {
            return true;
          }
        })
      }))
      // .then((arr)=>{
      //   console.log('ARRAY OF TRUE/FALSE', arr);
      //   return arr.includes(false)
      // });
    })
  };

  function inFourHours(slackId) {
    return User.findOne({slackId: slackId})
    .then((user) => {
      var date = JSON.parse(user.pendingRequest).date;
      console.log('date', date);
      var time = JSON.parse(user.pendingRequest).time;
      console.log('time', time);
      var hours = time.substring(0, 2);
      var minutes = time.substring(3, 5);
      var seconds = time.substring(6, 8);
      var milsecs = time.substring(9, 10);
      var year = date.substring(0, 4);
      var parsedMonth = parseInt(date.substring(5, 7));
      var month = parseInt(parsedMonth - 1).toString()
      var day = date.substring(8, 10);

      var meeting = new Date(year, month, day, hours, minutes, seconds, milsecs)

      if (meeting.getTime() - new Date().getTime() < 3600000) {
        return true;
      } else {
        return false;
      }
    })
  }

  var {scheduleMeeting} = require('./scheduleMeeting');

  function scheduleMeetingMFour(slackId, pending, user, res, web, date, calendar, auth, googleAuthorization, rtm, getAttendeeConflicts, getConflictsSevenDays, areThereConflicts) {
    doAllHaveGoogle(slackId)
    .then((arr) => {
      console.log('bool', arr);
      var bool = arr.includes(false);
      if (!bool) {
        //great! so everyone has google accounts.
        //we are assuming that addToGoogle will handle confirmation messages or
        //the availability policy
        scheduleMeeting(pending, user, res, web, date, calendar, auth, googleAuthorization, getAttendeeConflicts, getConflictsSevenDays, areThereConflicts);
      } else {
        res.send('on no one of your invitees has not given permission!');
        inFourHours(slackId)
        .then((isInFourHours) => {
          var slackDmId = user.slackDmId;
          if (isInFourHours) {
            console.log('getDMByUserId', user.slackDmId);
            web.chat.postMessage(slackDmId, `DAMN SON. You can't schedule it so soon! Meeting must be at least four hours from now.`)
          } else {
            web.chat.postMessage(slackDmId, `Yo posse has been notified for calendar access. We will try to create
the event if your posse accepts within two hours.`)

            // checkCalAccess() checks each attendee to see if they have googleCal access.
            // and if not, it sends them the link.
            checkCalAccess(slackId, web, rtm);

            //TODO: cronjobbbbb send choice

            //1: send links and check in 2 hours
            //2: cancel
          }
        })
      }
    })
  }



module.exports = {
  scheduleMeetingMFour: scheduleMeetingMFour
}
