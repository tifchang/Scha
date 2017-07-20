
//daysArray = [[{start: ___, end: ___}, {start: ___, end: ___}], [{start: ___, end: ___}], [], ...]

function availabilityHelper(daysArray) {
  var condensedWeek = [];
  daysArray = daysArray.map(function(singleDay) {
    return singleDay.reduce(function(a, b) {
      return a.concat(b);
    }, []);
  })
  daysArray.forEach(function(singleDayTimes) {
    singleDayTimes = singleDayTimes.map(function(timeObj) {
      return {start: new Date(timeObj.startTime), end: new Date(timeObj.endTime)};
    })
    singleDayTimes.sort(function(timeObj1, timeObj2) {
      return timeObj1.start - timeObj2.start;
    })
    //array should now be sorted by start times
    var sortedDay = singleDayTimes;
    //add first event to the condensedTimes array
    var condensedTimes = [];
    if (sortedDay.length > 0) {
      condensedTimes.push(sortedDay[0]);
    }

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
<<<<<<< HEAD
      // freeTimes.push({start: sortedDay[currentPosition].end, end: sortedDay[currentPosition + counter].start})
      currentPosition += counter;
      counter = 1;
      if (sortedDay[currentPosition]) {
        condensedTimes.push(sortedDay[currentPosition])
=======
      currentPosition += counter;
      counter = 1;
      condensedTimes.push(sortedDay[])
>>>>>>> 0361a6c8531a93d306b3c3de80e0e6c3b1116c28
      }

    }
    condensedWeek.push(condensedTimes);
  })
  return condensedWeek;
}


function findFreeTimes(daysArray) {
  var weekFreeTimes = [];
  var condensedWeek = availabilityHelper(daysArray);
  var firstConflict = condensedWeek[0][0].start;
  var startDate = new Date(new Date(new Date(firstConflict).setMinutes(0)).setHours(9))
  var endDate = new Date(new Date(new Date(firstConflict).setMinutes(0)).setHours(17))

  // var secondDay = new Date(startDate.setDate(startDate.getDate() + 1))
  condensedWeek.map(function(condensedDay, index) {
    var todaysFreeTimes = [];
    var freeStartTime = new Date(startDate.getTime());
    freeStartTime.setDate(startDate.getDate() + index);
    var freeEndTime = new Date(endDate.getTime());
    freeEndTime.setDate(endDate.getDate() + index);

    var count = 0;
    condensedDay.push({
      start: freeEndTime,
      end: freeEndTime
    })
    condensedDay.forEach(function(busyBlockObj, timeBlockIndex) {
      while (busyBlockObj.start.getTime() - freeStartTime.getTime() >= 30 * 60000 && count < 3) {
        weekFreeTimes.push({
          start: freeStartTime,
          end: new Date(new Date(freeStartTime).setMinutes(new Date(freeStartTime).getMinutes() + 30))
        })
        freeStartTime = new Date(new Date(freeStartTime).setMinutes(new Date(freeStartTime).getMinutes() + 30));
        count++;
      }
      freeStartTime = busyBlockObj.end;
    })
    // weekFreeTimes = weekFreeTimes.concat(todaysFreeTimes);
  })
  weekFreeTimes = weekFreeTimes.slice(0, 10);
  // console.log(weekFreeTimes);
  
  return weekFreeTimes;
}

var test =
'[[[{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T12:00:00-07:00","endTime":"2017-07-20T13:00:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"}],[{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T13:00:00-07:00","endTime":"2017-07-20T13:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T14:00:00-07:00","endTime":"2017-07-20T14:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"},{"startTime":"2017-07-20T16:00:00-07:00","endTime":"2017-07-20T16:30:00-07:00"}]],[[{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"}],[{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"},{"startTime":"2017-07-21T16:00:00-07:00","endTime":"2017-07-21T16:30:00-07:00"}]],[[],[]],[[],[]],[[],[]],[[],[]],[[],[]],[[],[]],[[],[]],[[],[{"startTime":"2017-07-29T09:00:00-07:00","endTime":"2017-07-30T18:00:00-07:00"}]]]';

findFreeTimes(JSON.parse(test));

module.exports = {
  findFreeTimes: findFreeTimes
}
