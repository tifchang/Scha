var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;


//param: param: must take in organizer's slackId
// this function makes sure every person on the attendees list has an account
function checkCalAccess(slackId) {
  User.findOne({slackId: slackId})
  .then((organizer) => {
    let slackIdArr = [];
    for (var key in organizer.pendingRequest.conversions) {
      slackIdArr.push(organizer.pendingRequest.conversions[key].substring(2, 11))
    }
    var fullUserArr = slackIdArr.map((id) => {
      let slackDmId;
      if (rtm.dataStore.getDMByUserId(id)) {
        slackDmId = rtm.dataStore.getDMByUserId(id);
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
      User.find({slackId: userObj.slackId})
      .then((user) => {
        if (!user) {
          user = new User({
            slackId: userObj.slackId,
            slackDmId: userObj.slackDmId
          }).save();
        }
        if (!user.google) {
          rtm.sendMessage(`Hey! Someone is inviting you to a meeting.
            Please visit http://d31adc8e.ngrok.io/connect?user=${user._id}
            to setup Google Calendar`, user.slackDmId);
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
      for (var key in organizer.pendingRequest.conversions) {
        slackIdArr.push(organizer.pendingRequest.conversions[key].substring(2, 11))
      }
      return Promise.all(slackIdArr.map((id) => {
        User.findOne({slackId: id})
        .then((user) => {
          console.log('USERRR', user);
          if (!user || !user.google) {
            return false;
          } else {
            return true;
          }
        })
      })).then((arr)=>{
        console.log('ARRAY OF TRUE/FALSE', arr);
        return arr.contains(false)
      });
    })
  };

  function inFourHours(slackId) {
    return User.findOne({slackId: slackId})
    .then((user) => {
      var date = user.pendingRequest.date;
      var time = user.pendingRequest.time;
      var hours = time.substring(0, 2);
      var minutes = time.substring(3, 5);
      var seconds = time.substring(6, 8);
      var milsecs = time.substring(9, 10);
      var year = date.substring(0, 4);
      var parsedMonth = parseInt(date.substring(5, 7));
      var month = parseInt(parsedMonth - 1).toString()
      var day = date.substring(8, 10);

      var meeting = new Date(year, month, day, hours, minutes, seconds, milsecs)
      var now = new Date()
      now.setHours(now.getHours() + 4)
      if (now.getTime() < meeting.getTime()) {
        return true;
      } else {
        return false;
      }
    })
  }

  var {scheduleMeeting} = require('./scheduleMeeting');

  function scheduleMeetingMFour(slackId, pending, user, res, web, date, calendar, auth, googleAuthorization, rtm) {
    doAllHaveGoogle(slackId).then((bool) => {
      if (bool) {
        //great! so everyone has google accounts.
        //we are assuming that addToGoogle will handle confirmation messages or
        //the availability policy
        scheduleMeeting(pending, user, res, web, date, calendar, auth, googleAuthorization);
      } else {
        inFourHours(slackId).then((isInFourHours) => {
          if (inFourHours) {
            var slackDmId = rtm.dataStore.getDMByUserId(slackId).id
            rtm.sendMessage(`DAMN SON. You can't schedule it so soon! Meeting must be at least four hours from now.`, slackDmId)
          } else {
            //prompt requester that the attendees must be notified for calendar access
            rtm.sendMessage(`Yo posse has been notified for calendar access. We will try to create
              the event if your posse accepts within two hours.`, slackDmId)

            // and if not, it sends them the link.

            // checkCalAccess() checks each attendee to see if they have googleCal access.
            // and if not, it sends them the link.
            checkCalAccess(slackId)
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











//
// }
// attendees = attendees.map(invitee => (
//   sds.getUserByName(invitee);
// ))
// attendees.forEach((attendee) => {
//   User.findOne({slackId: attendee.slackId})
//   .then((person) => {
//     if (!person) {
//       new User({
//         slackId: attendee.slackId,
//         slackDmId: attendee.slackDmId,
//       }).save();
//     } else if (!person.google) {
//       rtm.sendMessage(`Hey! Someone is inviting you to a meeting.
//         Please visit http://d31adc8e.ngrok.io/connect?user=${person._id}
//         to setup Google Calendar`, person.slackDmId);
//         return;
//       }
//     }
//   })
//   .catch((err) => {
//     console.log('ERROR', err);
//   })
// })
// }
// //////
// var sds = new slackDataStore()
//
// var invitees = pending['given-name']
// var inviteeArr = invitees.map((invitee) => (
//   sds.getUserByName(invitee);
// ))
