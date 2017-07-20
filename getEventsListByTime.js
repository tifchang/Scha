var task = pending.subject;
var date = pending.date;
var time = pending.time;
var invitees = pending['given-name'];
<<<<<<< HEAD

=======
<<<<<<< HEAD

=======
>>>>>>> carokun
>>>>>>> tifchang
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
<<<<<<< HEAD

=======
>>>>>>> carokun
>>>>>>> tifchang
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
=======
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
  })
  return Promise.all(promisesArr)
}



///////

function getConflictsSevenDays(startDate, attendees) {
    var arr = [];
    var today = new Date(startDate);
    for (var i = 0; i < 7; i++) {
        var curDay = new Date(today);
        curDay.setDate(today.getDate() + i);
        if (curDay.getDay() === 0 || curDay.getDay() === 6) {
            continue;
        }
        getDailyPromise(attendees, curDay).then((dayConflicts) => {
            arr.push(dayConflicts)
            console.log('these are my days conflicts' , dayConflicts);
            if (arr.length === 6) {
                return arr
            }
        });
    }
}

// WHAT YOU GET IN RETURN IS AN ARRAY WITH OBJECTS WITH START/END TIME CONFLICTS
function getDailyPromise(attendees, curDay) {
    var dayPromise = attendees.map(user => {
        var busy = {}; //event object
        var gAuthUser = getGoogleAuth();
        gAuthUser.setCredentials({
            access_token: user.google.id_token,
            refresh_token: user.google.refresh_token
        });
        var start = curDay.toISOString().substring(0,11) + "00:00:00z";
        var end = curDay.toISOString().substring(0,11) + "23:59:59z";

        return new Promise(function(res, rej) {
            calendar.events.list({
                auth: gAuthUser,
                calendarId: 'primary',
                timeMin: start,
                timeMax: end,
                timeZone: "America/Los_Angeles",
                alwaysIncludeEmail: true,
            }, function(err, result) {
                if (err) {
                    rej(err);
                    return;
                } else {
                    var events = result.items; //arr
                    var e = events.map(event => {
                        busy.startTime = event.start.dateTime;
                        busy.endTime = event.end.dateTime;
                        dayArr.push(busy);
                    });
                    res(e);
                }
            })
        })
    })
    return Promise.all(dayPromise)
}
=======
>>>>>>> carokun
>>>>>>> tifchang
