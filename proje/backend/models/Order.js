const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      product: { type: String },
      quantity: { type: Number, default: 1 },
      ad: { type: String }, // ürün adı
      fiyat: { type: Number } // ürün fiyatı
    }
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'Hazırlanıyor' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema); 