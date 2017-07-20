function sendInteractiveMessage(web, user, freeTimes) {
  var actions = freeTimes.map((freeTime) => {
    var month = freeTime.start.toUTCString().split(' ')[2];
    var day = freeTime.start.toUTCString().split(' ')[1];
    var minutes = freeTime.start.getMinutes() + '';
    if (minutes.length === 1) {
      minutes = '0' + minutes;
    }
    return {
      "name": freeTime.start,
      "text": month + ' ' + day + ' at ' + freeTime.start.getHours() + ":" + minutes,
      "type": "button",
      "value": freeTime.start
    }
  })
  web.chat.postMessage(user.slackDmId, '', {
      "attachments": [
          {
              "text": "Here are some alternative times!",
              "fallback": "fallback",
              "callback_id": user.slackId,
              "color": "#3AA3E3",
              "attachment_type": "default",
              "actions": actions
          }
      ]
  })
}

module.exports = {
  sendInteractiveMessage: sendInteractiveMessage
}
