const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

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

// Favorilere ekle
router.post('/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.favorites.includes(req.params.productId)) {
      user.favorites.push(req.params.productId);
      await user.save();
    }
    res.json({ message: 'Favorilere eklendi.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Favorilerden çıkar
router.delete('/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.favorites = user.favorites.filter(
      (id) => id.toString() !== req.params.productId
    );
    await user.save();
    res.json({ message: 'Favorilerden çıkarıldı.' });
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Kullanıcının favorileri
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favorites');
    res.json(user.favorites);
  } catch {
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router; 