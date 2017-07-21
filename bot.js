//FOR API.AI INTERACTIONS
var axios = require('axios');

//SLACK INTERACTIONS
var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');
var rtm = new RtmClient(process.env.BOT_TOKEN);
var web = new WebClient(process.env.BOT_TOKEN);

//MONGO MODELS
var Models = require('./models/models');
var User = Models.User;
var Task = Models.Task;
var Meeting = Models.Meeting;

//WHEN RTM CONNECTION IS AUTHENTICATED THE NAME OF THE BOT WILL BE
//LOGGED IN TERMINAL
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData.self.name);
})

//STORE THE PENDING REQUEST HERE UNTIL IT IS STORED IN MONGODB
var toStore = {};

//THIS LISTENER WILL RUN WHENEVER A MESSAGE IS SENT
rtm.on(RTM_EVENTS.MESSAGE, (msg) => {

  //CHECK IF MESSAGE WAS A DIRECT MESSAGE
  //IF IT IS NOT A DM RETURN OUT OF LISTENER
  var dm = rtm.dataStore.getDMByUserId(msg.user);
  if (!dm || dm.id !== msg.channel || msg.type !== 'message') {
    return;
  }

  //CHECK THAT THE USER HAS GONE THROUGH AUTHENTICATION
  User.findOne({slackId: msg.user})
  .then(function(user) {
    //IF THE USER DOES NOT EXIST CREATE A NEW USER WITH THE MESSAGE
    //CHANNEL AND SLACKID AND ADD IT TO MONGODB
    if (!user) {
      return new User({
        slackId: msg.user,
        slackDmId: msg.channel
      }).save();
    }
    //IF THE USER DOES EXIST JUST RETURN THE USER
    //BECAUSE USER IS NOT A PROMISE A .THEN() WILL JUST RECEIVE USER AS
    //A FUNCTION PARAMETER
    return user;
  })
  .then(function(user) {
    //CHECK IF THE USER HAS GIVEN GOOGLE CALENDAR ACCESS
    //IF THEY HAVE NOT SEND THEM A MESSAGE WITH A LINK TO CLICK TO GRANT ACCESS
    if (!user.google) {
      rtm.sendMessage(`Hello!
        This is scheduler bot. In order to schedule things for you, I need
        access to your google calendar.

        Please visit http://d31adc8e.ngrok.io/connect?user=${user._id} to setup Google Calendar`, msg.channel
      );
      return;
    }

    //IF THERE IS A PENDING REQUEST SAVED ON THE USER IN MONGO AND THERE IS
    //AN ACTION SAVED WITH IT THAT MEANS THE INTERACTIVE MESSAGE HAS BEEN
    //SENT AND THERE IS A REQUEST IN MOTION AND NO OTHER REQUEST SHOULD GO
    //THROUGH
    if (user.pendingRequest && JSON.parse(user.pendingRequest).action) {
      rtm.sendMessage('Please complete previous request!', user.slackDmId);
      return;
    }

    //HASH THE MESSAGE THAT COMES IN FROM SLACKID TO SLACK NAME SO THAT
    //API.AI CAN INTERPRET THE NAME IN THE MESSAGE
    msg.text = msg.text.replace(/(<@)(\w+)(>)/g, function(a, b, userId) {
      const name = rtm.dataStore.getUserById(userId).profile.first_name;
      //TEMPORARILY STORE ALL THE NAME TO SLACK ID MAPPINGS IN THE TOSTORE
      //GLOBAL VARIABLE FOR LATER REFERENCE
      toStore[name] = a
      //COMMA IS ADDED BETWEEN NAMES SO API.AI CAN EASILY RECOGNIZE
      //MULTIPLE NAMES
      return name + ', ';
    })

    //MAKE REQUEST TO API.AI HERE
    //MSG.TEXT IS THE HASHED MESSAGE THAT THE USER TYPED INTO SLACK
    //SESSIONID IS A UNIQUE ID REQUIRED BY API.AI -- WE CHOSE TO USE SLACKID
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
        user.pendingRequest = JSON.stringify(Object.assign({}, (res.data.result).parameters, {action: 'remind.add', userId: user._id, createdAt: new Date()}));
        user.save()
        .then(function(user) {
          sendConfirmationMessage(web, msg, res.data.result.fulfillment.speech);
        })
        .catch(function(err) {
          console.log(err);
        })
      } else if (res.data.result.action === "meeting.add") {
        user.pendingRequest = JSON.stringify(Object.assign({}, (res.data.result).parameters, {action: 'meeting.add', conversions: toStore}));
        console.log(user.pendingRequest);
        user.save()
        .then(function(user) {
          let speech = res.data.result.fulfillment.speech;
          let conversions = JSON.parse(user.pendingRequest).conversions;
          for (var name in conversions) {
            speech = speech.replace(name, conversions[name]);
          }
          sendConfirmationMessage(web, msg, speech)
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


function sendConfirmationMessage(web, msg, title) {
  web.chat.postMessage(msg.channel, '', {
    "attachments": [
      {
        "fallback": "fallback",
        "title": title,
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
}
