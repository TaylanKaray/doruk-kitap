const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  fiyat: { type: Number, required: true }, // price yerine fiyat
  stock: { type: Number, default: 0 }
});

module.exports = mongoose.model('Product', ProductSchema); 