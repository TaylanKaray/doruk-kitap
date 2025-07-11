const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token gerekli.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Geçersiz token.' });
  }
}

// Bu route dosyası sadece admin yetkisine sahip kullanıcıların ürün ekleme, silme ve güncelleme işlemlerini yapmasına izin verir.
// Tüm işlemler doğrudan MongoDB veritabanında gerçekleşir.
// Ürünleri listele
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// Ürün ekle (sadece admin)
router.post('/', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Yetkisiz.' });
  try {
    const { name, description, price, stock, image } = req.body;
    const product = new Product({ name, description, price, stock, image });
    await product.save();
    console.log(`Admin (ID: ${req.user.userId}) yeni ürün ekledi: ${product.name}`);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// Ürün güncelle (sadece admin)
router.put('/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Yetkisiz.' });
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    console.log(`Admin (ID: ${req.user.userId}) ürün güncelledi: ${product.name}`);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// Ürün sil (sadece admin)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Yetkisiz.' });
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });
    console.log(`Admin (ID: ${req.user.userId}) ürün sildi: ${product.name}`);
    res.json({ message: 'Ürün silindi.' });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

module.exports = router; 