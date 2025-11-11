const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    default: 'student'
  },
  organisation: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('User', userSchema);