function scheduleMeeting(pending, user, res, web, date, calendar, auth, googleAuthorization) {
  var task = pending.subject;
  console.log('date', date);
  var time;
  if (!date) {
    date = pending.date;
    time = pending.time;
  } else {
    var hours = new Date(date).getHours() + '';
    var minutes = new Date(date).getMinutes() + '';
    if (minutes.length === 1) {
      minutes = '0' + minutes;
    }
    if (hours.length === 1) {
      hours = '0' + hours;
    }
    time = hours + ":" + minutes + ":00";
    console.log('time', time);
    date = date.substring(0, 10);
  }
  console.log('date2', date);
  var invitees = pending['given-name'];
  var hours = time.substring(0, 2);
  var minutes = time.substring(3, 5);
  var seconds = time.substring(6, 8);
  var milsecs = time.substring(9, 10);
  var year = date.substring(0, 4);
  var parsedMonth = parseInt(date.substring(5, 7));
  var month = parseInt(parsedMonth - 1).toString()
  var day = date.substring(8, 10);

  var start = new Date(year, month, day, hours, minutes, seconds, milsecs)
  var end = new Date(start.getTime() + 30 * 60 * 1000)

  new Meeting({
    time: time,
    invitees: invitees,
    createdAt: new Date(),
    requesterId: user._id,
    subject: task,
    day: date,
    requesterId: user._id
  }).save()

  var conversions = pending.conversions;
  for (var name in conversions) {
    conversions[name] = conversions[name].substring(2, conversions[name].length - 1)
  }
  User.find()
  .then(function(users) {
    // console.log('users',users);
    //userArray will be sent to google calendar request as attendees
    var userArr = [];

    //array with all of the invitees mongo information to check availability with
    var mongoInformation = [];
    users.map(function(userData) {
      var mongoSlackId = userData.slackId;
      for (var name in conversions) {
        if (conversions[name] === mongoSlackId) {
          userArr.push({displayName: name, email: userData.google.email})
          mongoInformation.push(userData);
        }
      }
    })
    mongoInformation.push(user);

    getAttendeeConflicts(mongoInformation, start, end)
    .then((conflicts) => {
      var noConflicts = areThereConflicts(conflicts);
      //if there is a conflict
      if (!noConflicts) {
        getConflictsSevenDays(start, mongoInformation)
        .then(function(freeTimesArray) {
          res.send('Oh no you have a conflict!');
          sendInteractiveMessage(web, user, freeTimesArray);
        })

      } else {
        var event = {
          'summary': task,
          'start': {
            'dateTime': start.toISOString()
          },
          'end': {
            'dateTime': end.toISOString()
          },
          'attendees': userArr
        };
        calendar.events.insert({
          auth: googleAuthorization,
          calendarId: 'primary',
          resource: event,
        }, function(err, event) {
          if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return err;
          }
          console.log('Event created: %s', event.htmlLink);
          user.pendingRequest = '';
          user.save(function(user) {
            res.send('Okay request has been submitted successfully!');
            // return "yay";
          })
        });
      }

    });

  })
  .catch(function(err) {
    console.log('Error on line 206', err);
  })
}



module.exports = {
  scheduleMeeting: scheduleMeeting
}
