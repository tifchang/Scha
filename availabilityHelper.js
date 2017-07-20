
//daysArray = [[{start: ___, end: ___}, {start: ___, end: ___}], [{start: ___, end: ___}], [], ...]

function availabilityHelper(daysArray) {
  var condensedWeek = [];
  daysArray.forEach(function(singleDayTimes) {
    singleDayTimes = singleDayTimes.map(function(timeObj) {
      return {start: new Date(timeObj.start), end: new Date(timeObj.end)};
    })
    singleDayTimes.sort(function(timeObj1, timeObj2) {
      return timeObj1.start.getTime() - timeObj2.start.getTime();
    })
    //array should now be sorted by start times
    var sortedDay = singleDayTimes;

    //add first event to the condensedTimes array
    var condensedTimes = [sortedDay[0]];

    //currentPosition in sortedDay array starts at zero
    var currentPosition = 0;
    var counter = 1;

    while(currentPosition + counter < sortedDay.length) {

      while (sortedDay[currentPosition + counter] && sortedDay[currentPosition].end.getTime() > sortedDay[currentPosition + counter].start.getTime()) {
        //check which end time is later
        if (sortedDay[currentPosition].end.getTime() <= sortedDay[currentPosition + counter].end.getTime()) {
          var itemToUpdate = condensedTimes.pop();
          itemToUpdate.end = sortedDay[currentPosition + counter].end
          condensedTimes.push(itemToUpdate);
        }
        counter++;
      }
      // freeTimes.push({start: sortedDay[currentPosition].end, end: sortedDay[currentPosition + counter].start})
      currentPosition += counter;
      counter = 1;
      if (sortedDay[currentPosition]) {
        condensedTimes.push(sortedDay[currentPosition])
      }

    }
    condensedWeek.push(condensedTimes);
  })
  console.log(condensedWeek);
  return condensedWeek;
}

function findFreeTimes(daysArray) {
  var weekFreeTimes = [];
  var condensedWeek = availabilityHelper(daysArray);
  var firstConflict = condensedWeek[0][0].start;
  var startDate = new Date(new Date(new Date(firstConflict).setMinutes(0)).setHours(2))
  var endDate = new Date(new Date(new Date(firstConflict).setMinutes(0)).setHours(10))
  console.log(startDate);
  console.log(endDate);
  // var secondDay = new Date(startDate.setDate(startDate.getDate() + 1))
  condensedWeek.map(function(condensedDay, index) {
    var todaysFreeTimes = [];
    var freeStartTime = new Date(startDate.setDate(startDate.getDate() + index));
    var freeEndTime = new Date(endDate.setDate(endDate.getDate() + index));
    console.log(freeStartTime);
    console.log(freeEndTime);
    condensedDay.push({
      start: freeEndTime,
      end: freeEndTime
    })
    condensedDay.map(function(busyBlockObj, timeBlockIndex) {
      while (busyBlockObj.start.getTime() - freeStartTime.getTime() >= 30 * 60000) {
        todaysFreeTimes.push({
          start: freeStartTime,
          end: new Date(new Date(freeStartTime).setMinutes(new Date(freeStartTime).getMinutes() + 30))
        })
        freeStartTime = new Date(new Date(freeStartTime).setMinutes(new Date(freeStartTime).getMinutes() + 30));
      }
      freeStartTime = busyBlockObj.end;
    })
    weekFreeTimes.push(todaysFreeTimes);
  })
  console.log(weekFreeTimes);
}

findFreeTimes([[{start: "2017-07-18T16:00:00.000Z", end: "2017-07-18T16:30:00.000Z"}, {start: "2017-07-18T16:20:00.000Z", end: "2017-07-18T16:40:00.000Z"}, {start: "2017-07-18T17:00:00.000Z", end: "2017-07-18T17:30:00.000Z"}, {start: "2017-07-18T18:20:00.000Z", end: "2017-07-18T18:40:00.000Z"}],
[{start: "2017-07-19T16:00:00.000Z", end: "2017-07-19T16:30:00.000Z"}, {start: "2017-07-19T16:20:00.000Z", end: "2017-07-19T16:40:00.000Z"}, {start: "2017-07-19T17:00:00.000Z", end: "2017-07-19T17:30:00.000Z"}, {start: "2017-07-19T18:20:00.000Z", end: "2017-07-19T18:40:00.000Z"}]])

module.exports = {
  availabilityHelper: availabilityHelper
}
