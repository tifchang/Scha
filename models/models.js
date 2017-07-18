var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema ({
  token: Object,
  slack_id: String
})

var User = mongoose.model('User', UserSchema)

module.exports = {
  User: User
};
