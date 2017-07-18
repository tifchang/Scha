var axios = require('axios');

var { CLIENT_EVENTS, RTM_EVENTS, RtmClient, WebClient } = require('@slack/client');

var bot_token = 'xoxb-213951919538-fnBfDUHwsBdehp23Wbr0nZMI';

var rtm = new RtmClient(bot_token);

var web = new WebClient(bot_token);

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData.self.name);
})

let messageInProgess = false;

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {
  //when yes or no is clicked reset messageInProgess to be false
  if (msg.message && msg.message.username === 'SachaTheScheduler') {
    messageInProgess = false;
  }
  //ensure the bot will ignore the message if it is not sent via DM
  var dm = rtm.dataStore.getDMByUserId(msg.user);
  if (!dm || dm.id !== msg.channel || msg.type !== 'message') {
    return;
  }

  if (messageInProgess) {
    rtm.sendMessage('Please complete previous request!', msg.channel);
    return;
  }
  axios.get('https://api.api.ai/api/query', {
    params: {
      v: 20150910,
      lang: 'en',
      timezone: '2017-07-17T14:01:03-0700',
      query: msg.text,
      sessionId: msg.user
    },
    headers: {
      Authorization: 'Bearer 30cb48540bc14e0ab93dd24392ec801c'
    }
  })
  .then((res) => {
    console.log(res.data.result);
    if (res.data.result.actionIncomplete || res.data.result.action !== "remind.add") {
      rtm.sendMessage(res.data.result.fulfillment.speech, msg.channel)
      return;
    } else {
      messageInProgess = true;
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
    }
  })
  .catch((err) => {
    console.log(err);
  })
})

rtm.start();
