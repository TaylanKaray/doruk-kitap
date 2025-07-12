const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isAdmin: { type: Boolean, default: false },
  name: { type: String },
  address: { type: String }
});

module.exports = mongoose.model('User', UserSchema); 