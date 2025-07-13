const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  ad: { type: String, required: true },
  aciklama: String,
  fiyat: { type: Number, required: true }, // price yerine fiyat
  stok: { type: Number, default: 0 },
  yazar: { type: String },
  yayinevi: { type: String },
  isbn: { type: String },
  resimUrl: { type: String },
  sayfaSayisi: { type: Number },
  kategori: { type: String },
  cokSatan: { type: Boolean, default: false },
  yeniCikan: { type: Boolean, default: false },
});

module.exports = mongoose.model('Product', ProductSchema); 