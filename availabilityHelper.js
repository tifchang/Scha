
//daysArray = [[{start: ___, end: ___}, {start: ___, end: ___}], [{start: ___, end: ___}], [], ...]

function availabilityHelper(daysArray) {
  daysArray.map(function(singleDayTimes) {
    var sortedDay = singleDayTimes.sortBy(function(timeObj1, timeObj2) {
      return timeObj.start.getTime() - timeObj2.start.getTime();
    })
    var condensedTimes = [sortedDay[0]];
    var currentPosition = 0;
    while(currentPosition + counter < sortedDay.length) {
      var counter = 1;
      while (sortedDay[currentPosition].end.getTime() > sortedDay[currentPosition + counter].start.getTime()) {
        if (sortedDay[currentPosition].end.getTime() < sortedDay[currentPosition + counter].end.getTime()) {
          var itemToUpdate = condensedTimes.pop();
          itemToUpdate.end = sortedDay[currentPosition + counter].end
        }
      }
    }
  })
}

module.exports = {
  availabilityHelper: availabilityHelper
}
