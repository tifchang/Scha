var task = pending.subject;
var date = pending.date;
var time = pending.time;
var invitees = pending['given-name'];
<<<<<<< HEAD

=======
>>>>>>> carokun
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
<<<<<<< HEAD

=======
>>>>>>> carokun
// PASS IN ATTENDEES ARRAY
// THIS FUNCTION RETURNS AN ARRAY WITH CONFLICTS FOR THE REQUESTED TIME
// params: start = requested start datetime of mtg req, end = requested end datetime of mtg req
function getAttendeeConflicts(attendees, start, end) {
<<<<<<< HEAD
  var calendar = google.calendar('v3');
=======
>>>>>>> carokun
  let conflictsArr = [];
  attendees.forEach((user) => {
    var gAuthUser = getGoogleAuth();
    gAuthUser.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    })
<<<<<<< HEAD
    gAuthUser.calendar.events.list({
=======
    calendar.events.list({
>>>>>>> carokun
      auth: gAuthUser,
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: "America/Los_Angeles",
      alwaysIncludeEmail: true,
<<<<<<< HEAD
    }, function(err, response) {
=======
    })
    .then((err, response) => {
>>>>>>> carokun
      if (err) {
        console.log('ERROR IN RETRIEVING CONFLICTS': err);
      }
      if (response.items.length > 0) {
<<<<<<< HEAD
        return false;
=======
        conflictsArr = conflictsArr.concat(response.items);
        return conflictsArr;
      } else {
        return conflictsArr;
>>>>>>> carokun
      }
    })
  })
}
<<<<<<< HEAD

// THIS FUNCTION RETURNS AN ARRAY WITH NESTED ARRAYS INDEXED BY DAY
// EACH OBJECTS IN EACH DAY REPRESENTS A BUSY COMPONENT
// EX. [[{start: 'datetime', end: 'datetime'}, {start: 'datetime', end: 'datetime'}, ...], []]
function getConflictsSevenDays(attendees) {
  let sevenDaysConflictsArr = [];
  let today = new Date()

  for (var i = 0; i < 7; i++) {
    let newDay = today.setDate(today.getDate() + i)
    let newDate = new Date(newDay).toISOString()

  }
  attendees.forEach((user) => {
    var gAuthUser = getGoogleAuth();
    gAuthUser.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    })
    calendar.events.list({

    })
  })
}












function getAttendeeConflicts(attendees, start, end) {
  var calendar = google.calendar('v3');
  let promisesArr = [];

  var promisesArr = attendees.map((user) => {
    var gAuthUser = getGoogleAuth();
    gAuthUser.setCredentials({
      access_token: user.google.id_token,
      refresh_token: user.google.refresh_token
    })
    return calendar.events.list({
      auth: gAuthUser,
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: "America/Los_Angeles",
      alwaysIncludeEmail: true,
    })
    .then((conflicts) => {
      return conflicts
    })
  })
  return Promises.all(promisesArr)
}
=======
>>>>>>> carokun
