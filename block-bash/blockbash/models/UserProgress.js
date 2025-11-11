const mongoose = require('mongoose');
const UserProgressSchema = new mongoose.Schema({
  name: String,
  password: String,
  email: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  storyCompletions: [String],
  taskCompletions: [String],
  lastCommands: [String],
  achievements: [String],
  files: [String],
  sudo: { type: Boolean, default: false }
});
module.exports = mongoose.model('UserProgress', UserProgressSchema);
