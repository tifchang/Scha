var axios = require('axios');

var bot = require('./app.js');

var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');

var bot_token = 'xoxb-213951919538-fnBfDUHwsBdehp23Wbr0nZMI';

var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData.self.name);
})

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {

  //ensure the bot will ignore the message if it is not sent via DM
  var dm = rtm.dataStore.getDMByUserId(msg.user);
  if (!dm || dm.id !== msg.channel || msg.type !== 'message') {
    return;
  }
  web.chat.postMessage(msg.channel, 'sjdflksjf', {
    "text": "New comic book alert!",
    "attachments": [
        {
            "fallback": "Would you recommend it to customers?",
            "title": "Would you recommend it to customers?",
            "callback_id": "comic_1234_xyz",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "actions": [
                {
                    "name": "recommend",
                    "text": "Recommend",
                    "type": "button",
                    "value": "recommend"
                },
                {
                    "name": "no",
                    "text": "No",
                    "type": "button",
                    "value": "bad"
                }
            ]
        }
    ]
});

  // rtm.sendMessage(msg.text, msg.channel);

//   axios.get('https://api.api.ai/api/query', {
//     params: {
//       v: 20150910,
//       lang: 'en',
//       timezone: '2017-07-17T14:01:03-0700',
//       query: 'hi tiff',
//       sessionId: msg.user
//     },
//     headers: {
//       'Authorization': 'Bearer 52da7b1243444adfb8d42bb5f51b07a3'
//     }
//   })
//   .then((res) => {
//     if (res.data.result.actionIncomplete) {
//       rtm.sendMessage(data.result.fulfilment.speech, msg.channel)
//     } else {
//       rtm.sendMessage(res.data.result.resolvedQuery, msg.channel);
//     }
//   })
//   .catch((err) => {
//     console.log(err);
//   })
// })

rtm.start();
