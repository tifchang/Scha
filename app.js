var axios = require('axios');

var bot = require('./bot.js');

var { CLIENT_EVENTS, RTM_EVENTS, RtmClient } = require('@slack/client');

var bot_token = 'xoxb-213951919538-fnBfDUHwsBdehp23Wbr0nZMI';

var rtm = new RtmClient(bot_token);

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData.self.name);
})

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {
  console.log(msg);
  axios.get('https://api.api.ai/api/query?v=20150910&query=hi%20tiff&lang=en&sessionId=eabd5e33-630e-4ce3-894e-fc12ac3b0007&timezone=2017-07-17T14:01:03-0700',
  {headers: {
    'Authorization': 'Bearer 52da7b1243444adfb8d42bb5f51b07a3'
  }})
  .then((res) => {
    console.log('result', res);
    rtm.sendMessage('completed', msg.channel);
  })
  .catch((err) => {
    console.log(err);
  })
})

rtm.start();
