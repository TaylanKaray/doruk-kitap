const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const amqp = require('amqplib');
const fs = require('fs');
const mongoose = require('mongoose');
let channel;
(async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('orders', { durable: false });
    console.log('RabbitMQ bağlantısı başarılı (orders kuyruğu)');
  } catch (err) {
    console.error('RabbitMQ bağlantı hatası:', err);
  }
})();

// Kimlik doğrulama middleware
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token gerekli.' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Geçersiz token.' });
  }
}

// Admin kontrolü middleware
async function admin(req, res, next) {
  const user = await User.findById(req.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ message: 'Yönetici yetkisi gerekli.' });
  next();
}

// Sipariş oluştur
router.post('/', auth, async (req, res) => {
  console.log('Sipariş oluşturma endpointine girildi');
  try {
    let { products } = req.body;
    // Her ürünün product id'sini ObjectId'ye dönüştür
    products = (products || []).map(item => ({
      ...item,
      product: item.product
    }));
    const order = new Order({
      user: req.userId,
      products,
      total: 0 // Demo için toplamı sıfır yapıyoruz
    });
    await order.save();
    res.status(201).json({ message: 'Sipariş oluşturuldu.', order });
  } catch (err) {
    console.error('Sipariş oluşturulurken hata:', err, 'type:', typeof err, 'keys:', Object.keys(err));
    const fs = require('fs');
    fs.appendFileSync('order_error.log', `${new Date().toISOString()} - type: ${typeof err}, keys: ${Object.keys(err)}, value: ${JSON.stringify(err)}\n`);
    res.status(500).json({ message: 'Sunucu hatası.', error: JSON.stringify(err), type: typeof err, keys: Object.keys(err) });
  }
});

// Kullanıcının sipariş geçmişi
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId }).populate('products.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Tüm siparişleri getir (admin)
router.get('/all', auth, admin, async (req, res) => {
  try {
    const orders = await Order.find().populate('user').populate('products.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Sipariş durumunu güncelle (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı.' });
    order.status = req.body.status;
    await order.save();
    res.json({ message: 'Sipariş durumu güncellendi.', order });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 