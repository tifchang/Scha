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
                    reject(err);
                    return;
                } else {
                    var events = resp.items; //arr
                    var e = events.map(event => {
                        busy.startTime = event.start.dateTime;
                        busy.endTime = event.end.dateTime;
                        dayArr.push(busy);
                    });
                    resolve(e);
                }
            })
        })
    })
    return Promise.all(dayPromise)
}
